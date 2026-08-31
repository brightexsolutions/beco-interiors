# Deployment

Reference BEC-2026-004-PLAN. How the platform is provisioned from zero, how a change reaches
production, and how a release is undone.

Incident response and data restore live in `docs/RUNBOOK.md`. This document is about getting
code and infrastructure into place.

**Status: not yet provisioned.** This is the procedure M1 executes. Steps are written to be
followed and verified, not read.

---

## 1. Local toolchain

| Tool | Required | Status on the build machine |
|---|---|---|
| Node | 22 or later | v22.22.3, present |
| pnpm | 11 or later | 11.24.0, via corepack |
| Docker | Any recent | Installed, **not currently running.** Needed for local Supabase |
| Supabase CLI | Latest | **Not installed.** `brew install supabase/tap/supabase` |
| Vercel CLI | Latest | 54.7.1, present |
| gh | Latest | 2.96.0, present but **not authenticated** |
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

### 3.7 Vercel projects

**Two separate projects from one repository.** This is the security boundary in Section 10, and
it is about the public site not reaching admin tools. Studio is routes inside the dashboard per
D9, not a third project.

| Project | Root Directory | Domain |
|---|---|---|
| `beco-storefront` | `apps/storefront` | `www.beco.co.ke`, apex redirects to it |
| `beco-dashboard` | `apps/dashboard` | `dashboard.beco.co.ke` |

For each: connect the repository, set the Root Directory, and set the Ignored Build Step to
Turborepo's, so a storefront change does not rebuild the dashboard and burn build minutes.

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

Records:

```
  beco.co.ke          A or CNAME -> Vercel      proxied    redirects to www
  www                 CNAME      -> Vercel      proxied
  dashboard           CNAME      -> Vercel      proxied    noindex, robots blocked
  staging             CNAME      -> Vercel      proxied    noindex, password protected
  img                 CNAME      -> R2          proxied    product image CDN
  MX                  -> Zoho                   DNS only   untouched, human mail
  send                MX + TXT (SPF)            DNS only   Resend
  resend._domainkey   TXT                       DNS only   DKIM
  _dmarc              TXT p=none, later quarantine         DNS only
```

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

Add `beco.co.ke` as a sending domain under the becointeriorsdev Resend account. Add the DKIM
and SPF records as **DNS only**. **Do not touch the Zoho MX records**, which carry human mail.

Start DMARC at `p=none`, move to `p=quarantine` once reports are clean.

**Verify:** Resend reports the domain verified, and a test send arrives in Gmail and Outlook
without a spam flag.

### 3.12 Keep alive

Supabase free projects pause after roughly a week without API activity, which takes the site
down. A cron-job.org job under becointeriorsdev pings a health endpoint **every 3 days**.

**Verify:** the endpoint returns 200, and cron-job.org shows successful runs. Check the history
monthly rather than assuming, per `docs/RETAINER.md` section 8.

### 3.13 Backups

The GitHub Actions workflow runs nightly: `pg_dump`, gzip, `age` encrypt, upload to the
`BECO BACKUPS` Drive folder via the import service account, 30 day rotation, with the last 7
also kept as workflow artifacts.

**Verify:** a file appears in Drive the following morning, and it decrypts.

### 3.14 Uptime monitors

UptimeRobot under becointeriorsdev, one monitor per live surface.

---

## 4. How a change reaches production

```
  branch from main
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
  merge to main  ------> production deploy, both projects,
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
- [ ] 301 redirect map complete and every old URL tested
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

| Environment | Where | Data | Indexed |
|---|---|---|---|
| Local | `localhost`, `supabase start` | Seeded fixtures | n/a |
| Preview | Vercel, per branch | Points at production Supabase, read heavy | No, Vercel previews are noindex by default |
| Staging | `staging.beco.co.ke` | Production Supabase | No, password protected and noindex |
| Production | `www`, `dashboard`, `developer` | Live | Storefront only |

Preview and staging share the production database, which is a deliberate free tier compromise.
**So a destructive migration is never tested against a preview.** Test destructive changes
locally, against `supabase db reset`, where the data does not matter.

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
    img-src 'self' data: blob: https://img.beco.co.ke https://www.google-analytics.com;
    connect-src 'self' https://<project>.supabase.co https://www.google-analytics.com;
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

`font-src 'self'` is possible only because fonts are self hosted, per D3. There is no
`fonts.gstatic.com` entry and there should never be one.

Dashboard and studio use the same headers plus `X-Robots-Tag: noindex, nofollow`, and drop the
Google Tag Manager and Analytics entries, since neither is loaded there.

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
`https://www.beco.co.ke/sitemap.xml`.

Also capture, before DNS moves: total indexed pages, top queries, top pages, and positions for
the five target terms. **That data stops existing once the old site is gone**, and without it
nobody can prove the migration helped or notice a drop.

### 9.2 Google Analytics 4

1. Beco signs in at `analytics.google.com`, creates an account and property
2. Data Streams, Web, `https://www.beco.co.ke`. Copy the Measurement ID, `G-XXXXXXXXXX`, into
   `NEXT_PUBLIC_GA4_ID`
3. Admin, Property access management, add Brightex as **Editor**
4. Admin, Data Streams, Enhanced measurement on
5. Mark as **key events**: `quote_submitted`, `whatsapp_click`, `call_click`, `add_to_cart`

Every event is also written to `analytics_events` in Beco's own database, so the reporting
survives losing GA4 access and is queryable without Google's interface.

Link GA4 to Search Console under Admin, Product links.

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
