# Deployment

Reference BEC-2026-004-PLAN. How the platform is provisioned from zero, how a change reaches
production, and how a release is undone.

Incident response and data restore live in `docs/RUNBOOK.md`. This document is about getting
code and infrastructure into place.

**Status, 6 October 2026: production runs on `beco-prod`.** Until this date both Vercel
projects' Production environment pointed at `beco-staging` (`lzsqfsnjijpqnjukqpnu`), so the live
site and dashboard read and wrote the staging database. Moved the same day, D127: `beco-prod`
(`fctfpttoinhsncakhirh`) took migrations 1 to 53, a copy of staging's data, then 54 to 62;
Vercel Production now carries `beco-prod`'s URL and keys, `REVALIDATE_SECRET`,
`OPS_ALERT_SECRET`, `DASHBOARD_URL`, `GITHUB_REPOSITORY` and `GITHUB_WORKFLOW_REF`. Release
`f6e69ff` (PR #3) is live on www and dashboard. Still open: `GITHUB_ACTIONS_TOKEN`; GitHub holds
only the four Vercel secrets, so `deploy-production.yml` cannot migrate anything and its export
step is a placeholder; the `Production` environment has no required reviewers; Vercel Preview
for the dashboard lacks its keys, so there is no working staging dashboard yet.

**7 October 2026: both databases at migration 69.** `beco-prod` took 63 to 68 across 6 and
7 October and 69 (`staff_manage_grant`, D135) on 7 October, each after a schema and data dump to
`~/beco-backups/2026-10-07/*-pre69.sql`. `beco-staging` had stopped at 62 when production moved
off it; it took 63 to 69 the same day, fictional data only. Release PR #17 is live on the
dashboard.

`vercel deploy --prod --skip-domain` did NOT keep the custom domains off: www served the new
build at once. Do not rely on it as a dry run; deploy to Preview to test before promoting.

**Status, 30 September: Vercel projects exist, DNS for the site does not.** Checked 30 September 2026
against the signed-in Vercel team `brightex-solutions-projects` and the live `beco.co.ke`
zone. Nameservers are already Cloudflare. The site hostnames are attached in Vercel and are
not in DNS yet. Mail and Resend records are already on the zone. Do not recreate them.

---

## 1. Local toolchain

| Tool | Required | Status on the build machine |
|---|---|---|
| Node | 22 or later | v22.22.3, present |
| pnpm | 11 or later | 11.24.0, via corepack |
| Docker | Any recent | Installed, **not currently running.** Needed for local Supabase |
| Supabase CLI | Latest | **Not installed.** `brew install supabase/tap/supabase` |
| Vercel CLI | Latest | 59.16.0, present, signed in as `brightexsolutions` |
| gh | Latest | 2.96.0, present, signed in as `brightexsolutions` |
| git | 2.4 or later | 2.50.1, present |

```sh
corepack enable                              # pnpm
brew install supabase/tap/supabase           # Supabase CLI
open -a Docker                               # Docker must be running for supabase start
gh auth login                                # GitHub
vercel login                                 # Vercel
git config core.hooksPath .githooks          # commit message rules, once per clone
```

---

## 2. Provisioning order, and why it matters

Each step depends on the one before it. Doing them out of order mostly works until DNS, where
it does not.

```
  1  GitHub repository private          <- do this FIRST, it is currently public
  2  Supabase project                   under becointeriorsdev
  3  Schema, RLS, policy tests          local first, then pushed
  4  Cloudflare account and zone        under becointeriorsdev
  5  Nameserver change at registrar     Beco does this. Everything below waits
  6  R2 bucket and img subdomain
  7  Vercel projects x3
  8  DNS records, DNS-only at first
  9  Certificates issue
 10  Switch records to proxied
 11  Resend domain and DNS records
 12  Keep alive cron
 13  Backup workflow
 14  Uptime monitors
```

---

## 3. Step by step

### 3.1 GitHub, private, first

The repository is currently **public**. Nothing sensitive has ever been committed, verified by
a full history scan, so there is no incident. But no further work should be pushed while it is
public.

```sh
gh auth login
gh repo edit brightexsolutions/beco-interiors \
  --visibility private --accept-visibility-change-consequences
```

Then add Beco as a read only collaborator, per D21, so the failover in `docs/HANDOVER.md`
section 7 is real rather than theoretical.

**Verify:** an unauthenticated `curl https://api.github.com/repos/brightexsolutions/beco-interiors`
returns 404.

**Consequence:** GitHub Actions minutes now count against 2,000 a month. Public repos get
unlimited. Current plan uses roughly 700.

### 3.2 Supabase project

Created **under becointeriorsdev**, per D10. Not under Browns's Organisation, which already
holds two projects and is a different owner entirely.

1. Log into Supabase as becointeriorsdev
2. New organisation if one does not exist, then a project named `beco-platform`
3. Region: choose the closest available to Nairobi
4. **Invite Brightex as an organisation member on its own login**, so daily work never needs
   the becointeriorsdev password, per D20
5. Record the project ref, URL, anon key and service role key. Names go in
   `docs/ENVIRONMENT.md`, values go in the password manager, never in the repo

**Verify:** Brightex can log in with its own account and see the project.

### 3.3 Schema, locally first

Never write migrations straight against the remote project.

```sh
open -a Docker
supabase start                    # local stack
supabase migration new <name>     # write schema + RLS + audit trigger together
supabase db reset                 # replay every migration from scratch
supabase test db                  # pgTAP policy tests must pass
```

Per the `supabase-migration` skill: a table does not exist without its RLS policies and their
tests in the same migration.

Then push:

```sh
supabase link --project-ref <ref>
supabase db push
supabase gen types typescript --linked > packages/types/src/database.ts
```

**Verify:** `supabase test db` green locally, and the remote table list matches the local one.

### 3.4 Cloudflare account and zone

Created under becointeriorsdev, per D13, with Brightex added as a member with admin on the
zone. Add the site `beco.co.ke`, which produces two nameservers.

### 3.5 Nameserver change

**Beco performs this at their registrar.** Everything downstream waits on it, which is why it
is the first thing asked for in week one.

**Verify:** `dig NS beco.co.ke` returns the Cloudflare nameservers, and Cloudflare reports the
zone active. Propagation is usually minutes, occasionally hours.

### 3.6 R2 bucket

Create bucket `beco-product-images` in the same Cloudflare account. Connect a custom domain
`img.beco.co.ke`. Generate an S3 compatible access key for the import pipeline, stored server
side only.

**Direct uploads need two bucket settings, D116.** A photograph added from the dashboard goes
from the browser straight into the bucket under a presigned PUT, so Vercel never carries the
file and its 4.5MB request body cap does not apply. Without the CORS rule the browser's PUT is
refused and the dashboard falls back to posting files under 4MB through Vercel, with a toast
for anything larger.

CORS policy, Bucket settings, CORS policy, one rule:

```json
[
  {
    "AllowedOrigins": [
      "https://dashboard.beco.co.ke",
      "https://staging-dashboard.beco.co.ke",
      "http://localhost:3001"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Object lifecycle, Bucket settings, Object lifecycle rules: prefix `uploads/`, delete objects
one day after upload. The finishing action deletes a staged object as soon as it has read it,
this rule only sweeps the ones a browser signed and never finished.

The access key the dashboard holds must have Object Read and Write on this bucket: it signs the
PUT, reads the staged object back, writes the derivatives and deletes the staging copy.

### 3.7 Vercel projects

**Two separate projects from one repository.** This is the security boundary in Section 10, and
it is about the public site not reaching admin tools. Studio is routes inside the dashboard per
D9, not a third project.

| Project | ID | Root Directory | Domain |
|---|---|---|---|
| `beco-interiors` (the storefront) | `prj_T2pPefNqtwy9KpMTK1PAN6fkOqJi` | `apps/storefront` | `beco.co.ke`, `www.beco.co.ke` |
| `beco-dashboard` | `prj_bGXMoh6CcsEgbkGinhlVEanqRmDs` | `apps/dashboard` | `dashboard.beco.co.ke` |

Both sit on the `brightex-solutions-projects` team (`team_2Xm7dgXNaVgIBXGvL7iM6X7u`), the
account the Vercel CLI is signed into as `brightexsolutions`. The storefront keeps its original
name. Node is 22.x. Install command is `pnpm install --frozen-lockfile`. The storefront has a
production deployment. The dashboard has the domain attached and has never been deployed.

There is no third project. `staging.beco.co.ke` is a hostname on these two, not a new project.
`img.beco.co.ke` is the R2 bucket, not a Vercel project. Studio stays inside the dashboard.

GitHub Actions already has `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID_STOREFRONT`. `VERCEL_PROJECT_ID_DASHBOARD` is set to the dashboard id above.
The `Production` GitHub environment exists and has no required reviewers yet, so the approval
gate in section 11 is not armed. A `staging` environment does not exist yet.

Do not point the domain's nameservers at Vercel. They are already `ezra.ns.cloudflare.com` and
`kristin.ns.cloudflare.com`. Vercel's "not configured" warning is the missing A records below,
not a request to leave Cloudflare.

The storefront project is already receiving Git preview builds. Section 11 still says GitHub
Actions owns deployment, so that connection stays a known exception until the Actions workflow
is the one doing the deploy. The dashboard is not building from Git. It has no deployments.

**Environment variables, and the boundary that matters:**

```
  beco-storefront          NEXT_PUBLIC_SUPABASE_URL
                           NEXT_PUBLIC_SUPABASE_ANON_KEY
                           NEXT_PUBLIC_SITE_URL
                           NEXT_PUBLIC_GA4_ID
                           NEXT_PUBLIC_IMAGE_HOST
                           NEXT_PUBLIC_WHATSAPP_NUMBER
                           NEXT_PUBLIC_BUSINESS_PHONE

  beco-dashboard           everything above, plus SERVER ONLY:
                           SUPABASE_SERVICE_ROLE_KEY
                           RESEND_API_KEY
                           R2_ACCESS_KEY_ID
                           R2_SECRET_ACCESS_KEY

  Studio has no project of its own. Its routes live in the dashboard
  and use its environment, plus GEMINI_API_KEY and GEMINI_MODEL.
```

**The storefront never receives a service role key or any admin secret.** If it is fully
compromised, the attacker holds the anon key, which every visitor's browser already has.

**Verify:** the CI secret scan passes, and a production bundle for the storefront contains no
service role JWT.

### 3.8 to 3.10 DNS, and the ordering that breaks people

**Vercel cannot complete its certificate challenge through Cloudflare's proxy.** Getting this
backwards produces a redirect loop that looks like a Vercel bug and is not one.

```
  1  Add the domain in the Vercel project
  2  Create the DNS record in Cloudflare as DNS only, GREY cloud
  3  Wait for Vercel to report the certificate issued
  4  Only then switch the record to proxied, ORANGE cloud
  5  Set Cloudflare SSL/TLS to Full (Strict)
```

Vercel, checked 30 September, wants an A record for each hostname it already owns. Add these
in Cloudflare as **DNS only** (grey cloud). Switch to proxied only after Vercel reports the
certificate.

```
  beco.co.ke          A    76.76.21.21     grey, then proxied     storefront
  www                 A    76.76.21.21     grey, then proxied     storefront
  dashboard           A    76.76.21.21     grey, then proxied     dashboard, noindex
```

Not created yet, and not new Vercel projects:

```
  staging             A    76.76.21.21     grey, then proxied     add the hostname
                                           to the existing projects first, see below
  img                 CNAME to the R2      proxied                bucket beco-product-images
                      custom domain target                        Cloudflare fills the target
```

Already on the zone. Leave them.

```
  MX                  workplaceproemail.com (10) and .net (20)     DNS only
  TXT apex SPF        include:_spf.olodoan.com                     DNS only
  send                CNAME send.forge.rmta.net                    existing mail, not Resend
  rsend               CNAME rsend.forge.rmta.net                   Resend bounce host
                      resolves to feedback-smtp.us-east-1.amazonses.com
  resend._domainkey   TXT                                          Resend DKIM, present
  _dmarc              TXT p=quarantine                             already stricter than p=none
```

### Staging and images, without a new Vercel project

`staging.beco.co.ke` is the storefront's staging hostname. In the `beco-interiors` project,
Settings, Domains, add `staging.beco.co.ke` and assign it to the Preview environment, not
Production. Then add the A record above, grey cloud first. Protect the hostname with Vercel
deployment protection and `noindex`. It must use the `beco-staging` Supabase project, never
production. The dashboard does not get its own staging hostname in this plan.

`img.beco.co.ke` is not added in Vercel. In the same Cloudflare account, R2, bucket
`beco-product-images`, Custom Domains, connect `img.beco.co.ke`. Cloudflare writes the CNAME.
Do not point that name at `76.76.21.21`.

Cloudflare configuration:

- SSL/TLS **Full (Strict)**. Always Use HTTPS on
- **HSTS at M6 only, not before.** It is hard to reverse
- One rate limiting rule, which is what the free plan allows, spent on POST to the quote and
  contact endpoints
- Cache rules: `/_next/static/*` and `img.beco.co.ke` long and immutable at the edge, HTML
  respecting origin cache control, `/api/*` and both admin subdomains **bypassed entirely** so
  no authenticated response is ever cached
- Managed WAF ruleset on. Bot fight mode on the storefront only

**Verify:** every hostname loads over HTTPS with a valid certificate and no redirect loop. Both
admin subdomains return `noindex`. An authenticated dashboard response is never served from
cache.

### 3.11 Resend

`beco.co.ke` is already the sending domain. DKIM is at `resend._domainkey`. The bounce host is
`rsend`, not `send`. `send` belongs to the existing mail host and must stay a CNAME to
`send.forge.rmta.net`. Human mail is Workplace Pro Email (`workplaceproemail.com` and `.net`),
not Zoho. DMARC is already `p=quarantine`.

The `RESEND_API_KEY` in local `.env.local` was rejected by Resend. Create a new key with
Sending access only, on the becointeriorsdev account, and put that on the dashboard project.

**Verify:** Resend reports the domain verified, and a test send arrives in Gmail and Outlook
without a spam flag.

### 3.12 Keep alive

Supabase free projects pause after roughly a week without API activity, which takes the site
down. Each project pauses on its own, so each needs its own job. The scheduler is
**cron-job.org under becointeriorsdev**, Beco's own account, so the thing that keeps Beco's
database awake is Beco's and survives any handover. Three jobs, each **every 2 days** (GitHub
or Supabase being late by a few hours must never reach the seven day line), each expecting
HTTP 200, with failure notifications to Beco's address and `info.brightexsolutions@gmail.com`:

| Job | URL | Headers | Keeps awake |
|---|---|---|---|
| Production site | `https://www.beco.co.ke/api/health` | none | `beco-prod`, and proves the storefront serves |
| Dashboard | `https://dashboard.beco.co.ke/api/health` | none | `beco-prod` by a second path, and proves the dashboard serves |
| Staging database | `https://<staging-ref>.supabase.co/rest/v1/settings?select=key&limit=1` | `apikey: <staging anon key>` and `Authorization: Bearer <staging anon key>` | `beco-staging`, which has no permanent public site to call |

`GET /api/health` makes one anon read of the public settings allowlist, the same path a
visitor's page load takes, and answers `200 {ok:true}` or `503`. It carries no host, version
or key, and the dashboard's copy sits outside the session proxy. UptimeRobot points at the same
two URLs, so the health probe and the keep alive are one mechanism checked two ways.

A GitHub Actions schedule was considered and rejected: it belongs to Brightex's repository, not
to Beco, and GitHub silently disables a schedule after 60 days without a commit, which is
exactly the quiet period in which a database would pause.

**Verify:** cron-job.org shows a green run for all three jobs within the last 2 days, and
`curl -i https://www.beco.co.ke/api/health` returns 200. Check monthly rather than assuming, per
`docs/RETAINER.md` section 8.

### 3.12a Catalogue import from the dashboard

`.github/workflows/drive-import.yml` runs `pnpm drive:import` against staging or production on
`workflow_dispatch`. The dashboard's Catalogue, Drive import screen dispatches it with
`GITHUB_ACTIONS_TOKEN` and reads its runs, so a product manager imports from a phone, D105.
Sharp, the Drive service account and the service role key stay in Actions, never on Vercel.

Each GitHub Environment (`staging`, `production`) carries the import's secrets:
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `REVALIDATE_SECRET`, and the variables
`DRIVE_ROOT_FOLDER_ID`, `R2_BUCKET` and `STOREFRONT_URL`. The run refuses to start without the
Drive credential rather than silently running against fixtures. After an import that wrote
anything it POSTs `/api/revalidate` for `/` and `/shop`, so the new range is live on the next
request rather than within the hour. The report is kept as a run artifact for 30 days, and the
importer's own `import_runs` and `import_issues` rows are what the screen shows.

If `production` carries required reviewers for deploys, an import to production waits for the
same approval. To let Beco import without a Brightex approval, create an environment named
`production-import` holding only the secrets above and point the workflow's `environment` at it.

**Verify:** a dry-run from the screen appears under Recent runs within a minute and finishes
green; the Last import panel shows its counts.

### 3.13 Backups

The GitHub Actions workflow runs nightly: `pg_dump`, gzip, `age` encrypt, upload to the
`BECO BACKUPS` Drive folder via the import service account, 30 day rotation, with the last 7
also kept as workflow artifacts.

**Verify:** a file appears in Drive the following morning, and it decrypts.

### 3.14 Uptime monitors

UptimeRobot under becointeriorsdev, one monitor per live surface.

---

## 4. How a change reaches production

`dev` is the standing developer branch, kept ahead of `main`. A feature or polish branch forks
from `dev`, not `main`, and merges back to `dev` once built and verified, `dev` itself is what
pushes to GitHub. `main` only moves when `dev` is ready to ship, per the release step below.

```
  branch from dev
      |
      v
  push  ---------------> CI runs: typecheck, lint, unit, component,
      |                  integration, RLS, secret scan
      |
      |                  Vercel builds a preview for each affected app
      v
  pull request  -------> Lighthouse CI against the preview, budgets enforced
      |
      |                  Codex review pass at milestone close
      v
  merge to dev  -------> dev stays green, ahead of main
      |
      |                  (released deliberately, not on every merge)
      v
  merge dev to main  --> production deploy, both projects,
                         Turborepo rebuilds only what changed
```

**A merge is blocked by:** any test failure, a secret scan hit, or a Lighthouse budget breach.

Migrations run against the remote project as a deliberate step, never automatically on merge. A
schema change is reviewed, exported first per the backup rule, then pushed.

---

## 5. Rollback

**Code.** Vercel deployments are immutable, so rollback is promoting a previous one.

```sh
vercel rollback <deployment-url> --scope <team>
# or in the dashboard: Deployments, pick the last good one, Promote to Production
```

Takes effect in seconds. No rebuild, no waiting.

**Database.** Migrations are forward only. There is no down migration, deliberately, because a
half applied down migration on live data is worse than the problem it was fixing. To reverse a
schema change, write a new migration that reverses it. The nightly dump is the floor if
something is genuinely unrecoverable, per `docs/RUNBOOK.md`.

**Content.** Product, price and stock changes are soft deleted and audited, so reversing one is
an edit rather than a restore.

**If code and schema must be rolled back together**, roll the code back first. The old code
against the new schema is usually survivable. New code against the old schema usually is not.

---

## 6. Launch day cutover

The one sequence where order genuinely matters. Budget half a day, not an afternoon.

- [ ] **Vercel Pro active.** Hobby forbids commercial use, and this is a client site. Blocking
- [ ] Staging verified: full QA checklist walked on real iOS and Android
- [ ] `docs/SECURITY.md` pre launch list run clean
- [ ] Backup restore drill completed successfully
- [ ] **Pre migration baseline captured:** current traffic, indexed page count, and positions
      for the five target terms. This stops existing the moment DNS moves
- [ ] 301 redirect map complete and every old URL tested. `docs/SEO-MIGRATION.md` is the
      procedure, `apps/storefront/src/lib/legacy-redirects.ts` the map
- [ ] Search Console and GA4 verified under **Beco's own** Google account
- [ ] Lower the DNS TTL to 300 seconds, at least an hour before cutover
- [ ] Cut DNS over
- [ ] Verify every hostname over HTTPS, no redirect loop, no mixed content
- [ ] Submit the sitemap in Search Console
- [ ] Submit a real quote through the live site and confirm it reaches the dashboard and email
- [ ] Generate and send a real PDF
- [ ] Enable HSTS, once everything is confirmed working
- [ ] Restore the DNS TTL
- [ ] **Leave the WordPress host running 30 more days.** Do not cancel on cutover day
- [ ] Watch Search Console coverage daily for two weeks. A missed redirect surfaces as a 404

---

## 7. Environments

**Two Supabase projects. Nothing but production ever touches production data.**

| Environment | Where | Database | Indexed |
|---|---|---|---|
| Local | `localhost`, `supabase start` | Local Docker Postgres, seeded fixtures | n/a |
| Preview | Vercel, per pull request | **`beco-staging`** | No |
| Staging | `staging.beco.co.ke` | **`beco-staging`** | No, password protected and noindex |
| Production | `www`, `dashboard` | **`beco-prod`** | Storefront only |

Both Supabase projects sit in Beco's organisation. **The free tier allows exactly two active
projects per organisation, so this fits precisely and uses the allowance up.** A third would
need Pro, which is worth knowing before someone tries.

Each project needs its own keep alive cron, since each pauses independently after roughly a
week of inactivity.

### Staging data is seeded, never copied from production

**Do not clone production into staging.** `quotes` and `orders` hold real customer names, phone
numbers and email addresses. Copying them into a lower environment, which more people can reach
and which is password protected rather than properly secured, is a data protection problem
under Kenya's Data Protection Act 2019 and a needless one.

Staging is seeded from `supabase/seed.sql`: the real 24 products from the import pipeline,
which are not personal data, plus **fictional** customers, quotes and orders. That also makes
staging deterministic, so a test failure means a real regression rather than someone having
edited a row.

### The rule this exists to enforce

**Nothing tests against live data.** Not a preview deploy, not staging, not a developer's
laptop. A destructive migration, a bad seed, or a stray test submission cannot reach the
database Beco's team is working in.

Before this split, a preview deploy could have written a test quote into the real `quotes`
table and it would have appeared in the dashboard alongside genuine leads.

---

## 11. Deployment pipeline

**Vercel's Git integration is deliberately not used.** The repository is not connected to
Vercel, and no push builds anything on its own.

Reasons it is worth the extra setup:

- **Vercel's Git integration builds every push regardless of whether tests pass.** You discover
  a build is broken after it has deployed rather than before
- Build minutes are burned on work in progress commits that were never going to ship
- Migrations and deploys need ordering. A deploy that lands before its migration is an outage,
  and Git integration has no opinion about that
- Production deserves an approval gate, and Git integration has none

Instead, **GitHub Actions owns deployment** through the Vercel CLI.

**When CI runs (D118).** On every pull request, on a push to `main`, and by hand from the
Actions tab (`workflow_dispatch`). A push to `dev` does not start a run. From 12 September to
4 October every run on `dev` failed for reasons that had nothing to do with the commit under
test: `supabase/setup-cli@v1` pinned CLI 2.20.3, which predates `[local_smtp]` and
`[db.migrations].enabled` in `supabase/config.toml` and refused to parse it, so both jobs died
at `supabase start`; from 3 October a test string, `javascript:alert(1)`, tripped the browser
dialog grep; and two workflow files were invalid (a flow mapping holding `${{ }}` in the
preview deploy, a `runner` context in a job level `env` in the import), so GitHub recorded a
failed run named after each file on every push. All four are fixed. The gate is the pull
request from `dev` to `main`, which is where green is required; the local machine runs the same
checks before a deploy and can dispatch CI on `dev` when it wants the record.

```
  pull request
      |
      v
  CI: typecheck, lint, secrets, no browser dialogs,
      unit, component, RLS against a local database
      |
      | all green, and only then
      v
  vercel build --target=preview
  vercel deploy --prebuilt              -> preview URL, beco-staging DB
      |
      v
  Lighthouse CI against that preview, budgets enforced
      |
      | review, approve, merge
      v
  main
      |
      v
  migrations applied to beco-staging, automatically
  deploy to staging.beco.co.ke
      |
      | MANUAL APPROVAL, GitHub Environment "production"
      v
  migrations applied to beco-prod
  deploy to www and dashboard
```

**Migrations run before the deploy that needs them**, and production migrations run only after
a human approves. The CSV export of products, quotes and orders runs automatically first, per
the backup rule.

**Rollback stays instant.** Vercel deployments remain immutable, so promoting a previous one is
still one command. Not using Git integration changes how deploys are triggered, not how they
are undone.

### Required secrets

| Secret | Where |
|---|---|
| `VERCEL_TOKEN` | vercel.com, Settings, Tokens |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_STOREFRONT`, `VERCEL_PROJECT_ID_DASHBOARD` | `.vercel/project.json` after `vercel link` |
| `SUPABASE_ACCESS_TOKEN` | Supabase, Account, Access Tokens |
| `SUPABASE_STAGING_REF`, `SUPABASE_PROD_REF` | Each project's ref |
| `SUPABASE_STAGING_DB_PASSWORD`, `SUPABASE_PROD_DB_PASSWORD` | Each project's database settings |

**Turn off Vercel's Git integration explicitly** in each project's settings after linking, or
it will keep building alongside the pipeline and the two will race.

---

## 8. Configuration reference

Every setting that has to be changed from its default, with the value and the reason. Defaults
that are already correct are not listed.

### 8.1 Supabase

**Authentication.** Most of this exists to enforce "no public signup on any surface".

| Setting | Value | Why |
|---|---|---|
| Allow new users to sign up | **Off** | Accounts exist only because Brightex created them |
| Allow anonymous sign-ins | **Off** | Nothing in this build uses them |
| Confirm email | **Off** | Brightex issues credentials out of band. There is no self signup to confirm |
| Enable email provider | On | Used for the issued password flow only |
| Enable phone, OAuth, magic link | **Off** | Unused surface is attack surface |
| Minimum password length | **12** | Issued passwords are long. Staff chosen ones should be too |
| Password requirements | Lower, upper, digit, symbol | |
| JWT expiry | **3600** (1 hour) | Short sessions on both dashboards, per Section 10 |
| Refresh token rotation | On, reuse interval 10s | |
| MFA, TOTP | **Enabled** | Required for admin roles at minimum |
| Site URL | `https://dashboard.beco.co.ke` | Auth is a dashboard concern. The storefront has no login |
| Redirect allow list | The dashboard and studio origins only | Never a wildcard |

**Storage.**

| Bucket | Access | Policy |
|---|---|---|
| `documents` | **Private** | Authenticated dashboard users only. Quote and receipt PDFs. Never public read |

Product images do **not** live here. They are in R2, per D16.

Upload limits enforced on both client and server: images 10MB, PDFs 5MB, and a MIME allow list
rather than an extension check.

**Database.** Use the connection pooler for anything serverless. Direct connections only for
migrations and `pg_dump`.

### 8.2 Cloudflare

| Setting | Value | Why |
|---|---|---|
| SSL/TLS mode | **Full (Strict)** | Anything less accepts an invalid origin certificate |
| Always Use HTTPS | On | |
| Minimum TLS | **1.2** | |
| Automatic HTTPS Rewrites | On | |
| HSTS | **Off until M6.** Then max-age 12 months, includeSubDomains | Hard to reverse. Do not preload initially |
| **Rocket Loader** | **OFF** | It defers and reorders scripts and **breaks React hydration.** This is the single most common Cloudflare setting to silently break a Next.js site |
| Auto Minify | **Off** | Next.js already minifies. Cloudflare doing it again can corrupt output |
| Brotli | On | |
| Email Address Obfuscation | **Off** | It rewrites `mailto:` and `tel:` markup and can break the business line links |
| Early Hints | On | |
| Bot Fight Mode | **Storefront only** | It can challenge legitimate API and webhook traffic |
| WAF managed ruleset | On | |
| Browser Integrity Check | On | |

**Cache rules**, in order:

```
  1  hostname is dashboard.beco.co.ke
     -> BYPASS cache entirely
     Reason: no authenticated response may ever be cached

  2  path starts with /api/
     -> BYPASS cache

  3  path starts with /_next/static/ or hostname is img.beco.co.ke
     -> CACHE, edge TTL 1 year, respect origin, immutable

  4  everything else
     -> CACHE, respect origin cache-control
     Reason: ISR sets its own headers and Cloudflare must not override them
```

**Rate limiting**, one rule, which is the free plan's allowance:

```
  Expression:  http.request.method eq "POST"
               and (http.request.uri.path contains "/api/quote"
                 or http.request.uri.path contains "/api/contact"
                 or http.request.uri.path contains "/api/order")
  Threshold:   10 requests per 10 minutes per IP
  Action:      Managed Challenge
```

Ten in ten minutes is generous for a human specifying a project and hostile to a script.

### 8.3 Vercel, per project

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root Directory | `apps/storefront`, `apps/dashboard` |
| Node version | 22.x |
| Install command | `pnpm install --frozen-lockfile` |
| Ignored Build Step | `npx turbo-ignore` |
| Function region | Closest available to Nairobi, same as Supabase |
| Deployment Protection | **On for staging.** Off for the public storefront |
| Environment scoping | Production and Preview set separately. **Never expose a production service role key to Preview** |

**Image optimization is deliberately unused.** A custom `next/image` loader points at
`img.beco.co.ke`, so Vercel's transformation quota is never spent, per D16.

### 8.4 Security headers, in `next.config`

The brief requires the CSP be written explicitly rather than left permissive. Storefront:

```
  Content-Security-Policy
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline';
    font-src 'self';
    img-src 'self' data: blob: https://img.beco.co.ke https://www.google-analytics.com
            https://www.googletagmanager.com;
    media-src 'self' https://img.beco.co.ke;
    connect-src 'self' https://<project>.supabase.co https://www.google-analytics.com
                https://region1.google-analytics.com https://analytics.google.com
                https://region1.analytics.google.com https://www.googletagmanager.com;
    frame-src https://www.google.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
    upgrade-insecure-requests;

  Strict-Transport-Security   max-age=31536000; includeSubDomains
  X-Frame-Options             DENY
  X-Content-Type-Options      nosniff
  Referrer-Policy             strict-origin-when-cross-origin
  Permissions-Policy          camera=(), microphone=(), geolocation=()
```

The GA4 hosts are named one by one rather than as `*.google-analytics.com`, because the policy
carries no wildcard host and `tools/backup/src/__tests__/csp.test.ts` holds it to that. If GA4
Realtime shows nothing and the browser console shows a CSP violation naming another Google
host, add that host explicitly and to the test. Vercel Web Analytics and Speed Insights load and
post under `/_vercel` on the site's own origin, so `'self'` covers them; in development only,
`script-src` also allows `https://va.vercel-scripts.com` for their debug builds. D128.

`font-src 'self'` is possible only because fonts are self hosted, per D3. There is no
`fonts.gstatic.com` entry and there should never be one.

Dashboard and studio use the same headers plus `X-Robots-Tag: noindex, nofollow`, and drop the
Google Tag Manager and Analytics entries, since neither is loaded there. The dashboard also
sets `worker-src 'self'` so pdf.js can paint quote, receipt, and sales-review pages onto canvas.

`'unsafe-inline'` on `script-src` is a known compromise for Next.js inline bootstrap scripts.
Tighten it to a nonce based policy once the app is stable, and record that as a follow up
rather than forgetting it.

### 8.5 GitHub

| Setting | Value |
|---|---|
| Visibility | **Private.** Currently public, see 3.1 |
| Branch protection on `main` | Require a pull request, require status checks to pass |
| Required checks | typecheck, lint, unit, component, integration, RLS, secret scan, Lighthouse |
| Allow force push to `main` | **Off** |
| Dependabot alerts and security updates | **On** |
| Actions permissions | Read only by default, write granted per workflow |
| Secrets | `SUPABASE_*`, `RESEND_API_KEY`, `R2_*`, `AGE_PUBLIC_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Collaborators | Beco, **read only**, per D21 |

### 8.6 Robots and indexing

| Surface | Rule |
|---|---|
| Storefront | Indexed. Sitemap generated from the database |
| Dashboard | `noindex, nofollow` header **and** `robots.txt` disallow. Both, not either |
| Studio routes | Inherit the dashboard's noindex |
| Staging | Same, plus deployment protection |
| Empty categories | `noindex` automatically while `published_product_count` is 0, per D27 |
| Filtered category URLs | Canonical to the base category, `noindex`, per D29 |
| Old WordPress addresses | 301 to the page that now does the job, from `LEGACY_REDIRECTS`; 410 for WordPress-only paths, from `proxy.ts`. D107, `docs/SEO-MIGRATION.md` |

### 8.7 Post setup verification

Nothing is configured until it has been checked.

- [ ] Public signup genuinely fails. Try it against the Supabase auth endpoint
- [ ] Storefront production bundle contains no service role JWT
- [ ] `curl -I` on each hostname shows the full header set
- [ ] Dashboard and studio return `X-Robots-Tag: noindex`
- [ ] An authenticated dashboard response is never served from Cloudflare cache
- [ ] Rate limit triggers on the 11th POST in 10 minutes
- [ ] Rocket Loader is off, and the storefront hydrates without console errors
- [ ] `tel:` and `mailto:` links are intact, proving Email Obfuscation is off
- [ ] Certificates valid on all hostnames, no redirect loop
- [ ] A test email arrives in Gmail and Outlook, unflagged, with SPF and DKIM passing
- [ ] Keep alive cron shows successful runs
- [ ] A backup file appeared in Drive overnight and decrypts

---

## 9. Google properties: Search Console, GA4, Business Profile, Merchant Center

### The ownership rule, which is easy to get wrong and expensive to undo

**All four are created under Beco's own Google account. Brightex is added as a manager.**
Section 2 of the brief requires it, and the reason is practical: if these sit on an agency
account, the client's search presence, their review history and their analytics history all
leave with the agency. Years of Business Profile reviews cannot be transferred.

**becointeriorsdev@gmail.com is not Beco's own account for this purpose.** It is the project
infrastructure account. These four go on the real business Google account. Getting this wrong
is one of the few decisions here that is genuinely hard to reverse.

### 9.1 Google Search Console

1. Beco signs in at `search.google.com/search-console`
2. Add property, **Domain** type, `beco.co.ke`. Domain covers every subdomain and both
   protocols, where the URL prefix type does not
3. Verification is a **DNS TXT record**, which we add in Cloudflare, DNS only
4. Settings, Users and permissions, add Brightex as **Full** user

**Do before cutover**, so the pre migration baseline is capturable. After cutover, submit
`https://www.beco.co.ke/sitemap.xml`. The full procedure for taking over the old WordPress
addresses, including finding the exact URLs Google still holds, is `docs/SEO-MIGRATION.md`.

Also capture, before DNS moves: total indexed pages, top queries, top pages, and positions for
the five target terms. **That data stops existing once the old site is gone**, and without it
nobody can prove the migration helped or notice a drop.

### 9.2 Google Analytics 4

The code is in place (D128). It does nothing until a human does the steps below, and nothing
here has been confirmed on production yet.

**What the code does.** `GoogleAnalytics` in the storefront root layout loads gtag.js,
`afterInteractive`, only when `VERCEL_ENV` is `production` and `NEXT_PUBLIC_GA4_ID` matches
`G-` followed by capitals and digits. Previews, staging and local development load no GA4 at
all. `AnalyticsListener` sends every click on a `data-analytics` element, and `track()` sends
`add_to_cart` after an add to quote and `quote_submitted` after a confirmed submission, to GA4
when it is loaded and to `analytics_events` always, through the anon key under migration 60's
policy. Params are a product or category slug and the page path, never personal data.

**What a human must do, in this order:**

1. Beco signs in at `analytics.google.com` with **Beco's own business Google account**, not
   becointeriorsdev@gmail.com and not a Brightex account, and creates an account and property
2. Data Streams, Web, `https://www.beco.co.ke`. Copy the Measurement ID, `G-XXXXXXXXXX`
3. Vercel, the `beco-interiors` storefront project, Settings, Environment Variables: add
   `NEXT_PUBLIC_GA4_ID` with that ID, scoped to **Production only**. Not Preview. It is inlined at
   build, so it takes effect on the next production deploy, not on the running one
4. Vercel, the same project, **Analytics** tab, Enable. Then **Speed Insights** tab, Enable.
   `<Analytics />` and `<SpeedInsights />` are already rendered by the storefront, but they
   record nothing until these two switches are on, and the dashboard project gets neither
5. GA4, Admin, Property access management, add Brightex as **Editor**
6. GA4, Admin, Data Streams, Enhanced measurement on, and keep "Page changes based on browser
   history events" ticked: App Router navigations are client side, and that is how they count
   as page views
7. Deploy production, open the live site, click a phone and a WhatsApp link, and confirm both in
   GA4 Realtime. Events appear in the event list only once they have fired
8. GA4, Admin, Events (or Key events): mark as **key events** `quote_submitted`,
   `whatsapp_click`, `call_click`, `add_to_cart`
9. GA4, Admin, Product links, Search Console links: link the `beco.co.ke` Search Console
   property from 9.1

Every event is also written to `analytics_events` in Beco's own database, so the reporting
survives losing GA4 access and is queryable without Google's interface. The dashboard's lead
counters and conversion report read from there. Check it after step 7 with
`select event_type, metadata, created_at from analytics_events order by id desc limit 10`,
as an admin, on `beco-prod`.

### 9.3 Google Business Profile

For a business selling to people who can drive to Urban Square, this matters as much as the
website. It is frequently the first result for "interior materials Nairobi".

1. `business.google.com`, under Beco's own account. Claim the existing listing if there is one,
   rather than creating a duplicate. **Duplicates are hard to merge and dilute reviews**
2. Verify. Usually a postcard to the address, sometimes phone or video. Postcards take days to
   weeks, so **start this early**, not in launch week
3. Complete every field. A sparse profile ranks worse:
   - Name, exactly as it appears on the site
   - Category: primary something like Building Materials Supplier, plus secondaries
   - **Address, phone and hours identical to the site and to the `LocalBusiness` schema.** A
     mismatch between those three is a real ranking drag and free to fix. The contact block is
     confirmed, see `docs/CONTENT-AUDIT.md`. Other prototype copy is not
   - Website pointing at `https://www.beco.co.ke`
   - Products and services
   - **Photos.** You now have 24 slab shots and dozens of in situ application photographs. Most
     competitors have a handful of phone pictures. This is a genuine advantage, use it
4. Add Brightex as a **Manager**, never an Owner

Ongoing, and part of the Growth Plan retainer: respond to reviews, post updates, keep hours
accurate around holidays.

### 9.4 Google Merchant Center, and an honest constraint

Free product listings in Google Shopping are organic, not ads, so they sit outside the "no ad
tooling" exclusion in Section 14. But there is a real blocker.

**Merchant Center requires a price and a purchasable landing page for every item.** Every
product launches as POA, per A9. **POA items are rejected.** So Merchant Center is not viable
until Beco supplies the price list, and even then only for the products that carry a real
price.

Recommendation: **do not attempt this at launch.** Revisit once `products.csv` exists and a
meaningful number of products are priced. At that point it is roughly a day: create the
account under Beco's own Google account, verify and claim the domain, generate a product feed
from the database at `/feed/products.xml`, and submit it.

Treat it as a scoped follow on, quoted separately, rather than an assumed inclusion. Promising
Shopping listings for a POA catalog is promising something that cannot be delivered.

### 9.5 Order of operations

```
  NOW, week 1        Business Profile claim and verification started,
                     because postcard verification is slow

  Before cutover     Search Console property verified via DNS
                     GA4 property created, Measurement ID in the storefront
                     BASELINE CAPTURED: traffic, indexed pages, rankings
                     Brightex added as manager on all three

  At cutover         Sitemap submitted
                     GA4 receiving live events, confirmed in Realtime

  After launch       Search Console coverage watched daily for two weeks.
                     A missed 301 shows up as a 404 here first

  Later              Merchant Center, once prices exist
```

### 9.6 Verification

- [ ] All four properties are on **Beco's own Google account**, not becointeriorsdev, not
      Brightex
- [ ] Brightex has manager or editor access on each, and owner on none
- [ ] Search Console verified by DNS, so it survives a hosting change
- [ ] Pre migration baseline captured and saved somewhere durable
- [ ] GA4 Realtime shows a live event from the production site
- [ ] Business Profile NAP matches the site and the `LocalBusiness` schema exactly, character
      for character
- [ ] Sitemap submitted and reporting pages discovered
