# Setup: accounts, keys, and where each one goes

Reference BEC-2026-004-PLAN. Follow in order. Each phase says what it unblocks, so you can stop
when you have what you need.

**The most useful thing to know first: Phase 0 needs no cloud accounts at all.** Local Supabase
gives a full Postgres, auth and storage on your machine, so most of the build can proceed while
the accounts are still being sorted. Do not let account admin block writing code.

---

## Phase 0: Start developing today. No accounts needed.

Unblocks: M1, M2, M3, M4, M5. Genuinely most of the build.

```sh
# 1. Docker must be running. Supabase runs Postgres inside it.
open -a Docker

# 2. Supabase CLI
brew install supabase/tap/supabase

# 3. Dependencies
corepack enable
pnpm install

# 4. Local database. Prints your URL and keys when it finishes.
supabase start

# 5. Copy those three values into .env.local
cp .env.example .env.local
supabase status          # NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
```

`supabase status` prints local keys that are **identical on every machine**, so they are not
secrets. They are still not committed, because muscle memory is how a real key eventually ends
up in a template.

**Verify:**

```sh
pnpm test:unit          # 11 tests
pnpm db:test            # RLS policy tests
pnpm check:secrets
pnpm dev
```

Everything below this line is for deploying, not for building.

---

## Phase 1: Cloud infrastructure. Needed before the first deploy.

### 1.1 GitHub

The repository already exists: `brightexsolutions/beco-interiors`.

- [ ] **Make it private.** It is currently public.
      `gh repo edit brightexsolutions/beco-interiors --visibility private --accept-visibility-change-consequences`
- [ ] Add Beco as a **read only** collaborator, per D21. This makes the failover in
      `docs/HANDOVER.md` section 7 real rather than theoretical
- [ ] Settings, Branches: protect `main`. Require a pull request, require status checks
- [ ] Settings, Environments: create **`preview`**, **`staging`** and **`production`**. Put
      **required reviewers on `production`**. That is the approval gate D45 exists for
- [ ] Settings, Security: enable Dependabot alerts and security updates
- [ ] **Note:** a private repo drops to 2,000 Actions minutes a month. Public was unlimited.
      Current usage lands near 700

### 1.2 Supabase. Two projects, not one.

Signed in as **becointeriorsdev**, per D10.

- [ ] Create a new organisation for Beco, so this is not mixed with other clients
- [ ] Create **`beco-prod`**
- [ ] Create **`beco-staging`**
- [ ] Invite Brightex as an organisation member **on its own login**, so daily work never needs
      the becointeriorsdev password, per D20

**The free tier allows exactly two active projects per organisation, so this fits precisely and
uses the allowance up.** A third needs Pro.

For **each** project, Project Settings, API:

| Value | Goes to |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY`. **Treat as a database password** |
| Project ref, from the URL | `SUPABASE_STAGING_REF` / `SUPABASE_PROD_REF` |
| Database password | `SUPABASE_*_DB_PASSWORD`. Reset it if lost, it is not shown twice |

Then Account, Access Tokens: create one for CI, into `SUPABASE_ACCESS_TOKEN`.

**Authentication settings, for both projects.** Most of this exists to enforce no public signup:

- [ ] Allow new users to sign up: **OFF**
- [ ] Allow anonymous sign ins: **OFF**
- [ ] Confirm email: **OFF**. Brightex issues credentials out of band
- [ ] Phone, OAuth, magic link: **OFF**. Unused surface is attack surface
- [ ] Minimum password length: **12**
- [ ] JWT expiry: **3600**
- [ ] MFA, TOTP: **enabled**
- [ ] Site URL: the dashboard origin. The storefront has no login

### 1.3 Vercel

Brightex's account.

- [ ] `vercel login`, then from the repo root: `vercel link` **twice**, once per app
- [ ] Create project **`beco-storefront`**, Root Directory `apps/storefront`
- [ ] Create project **`beco-dashboard`**, Root Directory `apps/dashboard`
- [ ] For both: Install Command `pnpm install --frozen-lockfile`, Ignored Build Step
      `npx turbo-ignore`, Node 22
- [ ] **Disable Git integration on both projects.** Settings, Git, disconnect. Otherwise it
      keeps building alongside the pipeline and the two race each other. See D45
- [ ] Settings, Tokens: create one, into `VERCEL_TOKEN`
- [ ] `.vercel/project.json` after linking gives `VERCEL_ORG_ID` and each `VERCEL_PROJECT_ID`

**Environment variables, per project, per environment. This is where the split is enforced:**

```
  beco-storefront   Preview      -> beco-STAGING url + anon key
                    Production   -> beco-PROD url + anon key
                    NEVER any service role key, Resend key, R2 key or Gemini key

  beco-dashboard    Preview      -> beco-STAGING url, anon AND service role
                    Production   -> beco-PROD url, anon AND service role
                                    plus Resend, R2, Gemini
```

**Never paste a production service role key into a Preview environment.** Preview points at
staging, always.

- [ ] Upgrade to **Pro before cutover**. Hobby forbids commercial use and this is a client site.
      This is a blocking item on the M6 checklist

### 1.4 GitHub Actions secrets

Settings, Secrets and variables, Actions. From everything above:

```
VERCEL_TOKEN                     VERCEL_ORG_ID
VERCEL_PROJECT_ID_STOREFRONT     VERCEL_PROJECT_ID_DASHBOARD
SUPABASE_ACCESS_TOKEN
SUPABASE_STAGING_REF             SUPABASE_PROD_REF
SUPABASE_STAGING_DB_PASSWORD     SUPABASE_PROD_DB_PASSWORD
AGE_PUBLIC_KEY                   GOOGLE_SERVICE_ACCOUNT_JSON
```

---

## Phase 2: External services. Needed per feature, not up front.

### 2.1 Google service account, for the Drive import. Unblocks M2.

Signed in as **becointeriorsdev**.

- [ ] Google Cloud Console, create project `beco-platform`
- [ ] APIs and Services, Library, enable **Google Drive API**. No billing needed at this volume
- [ ] IAM, Service Accounts, create `beco-import`. **Grant it no project roles.** Its access
      comes from the Drive share, not from IAM
- [ ] Keys, Add Key, **JSON**. Downloads once
- [ ] Save the file **outside the repository**. Path goes in `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`,
      contents go in the `GOOGLE_SERVICE_ACCOUNT_JSON` GitHub secret
- [ ] Copy the service account email, `beco-import@beco-platform.iam.gserviceaccount.com`
- [ ] **Share `BECO PRODUCTS` with it as Viewer.** Brightex can do this directly, because the
      folder allows editors to re-share. See D5
- [ ] Create a `BECO BACKUPS` folder, share with the same account as **Editor**

**Verify:** `pnpm drive:import --dry-run` lists the 24 stone folders.

### 2.2 Cloudflare R2, for images. Unblocks M2 and M4.

Signed in as **becointeriorsdev**, per D13.

- [ ] Create the Cloudflare account, invite Brightex as a member with admin
- [ ] R2, create bucket **`beco-product-images`**
- [ ] Manage R2 API Tokens, create one: **Object Read and Write, scoped to that one bucket**,
      not account wide
- [ ] The secret is **shown once**. Capture it then
- [ ] Values go to `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

### 2.3 Resend, for email. Unblocks M4.

Signed in as **becointeriorsdev**.

- [ ] Domains, Add Domain, `beco.co.ke`
- [ ] It gives DKIM and SPF records. Add them in Cloudflare as **DNS only**, grey cloud
- [ ] **Do not touch the existing Zoho MX records.** They carry human mail and breaking them
      breaks info@beco.co.ke
- [ ] API Keys, create with **Sending access only**, not Full access, into `RESEND_API_KEY`

### 2.4 Gemini, for blog drafting. Unblocks M7.

Brightex's own key, per D40.

- [ ] `aistudio.google.com/apikey`, signed in as **Brightex**, not becointeriorsdev
- [ ] Set a billing alert. A loop bug against a paid API is an expensive way to learn
- [ ] `GEMINI_API_KEY` and `GEMINI_MODEL` go on the **dashboard project only**

### 2.5 Backup encryption. Unblocks M1.

```sh
age-keygen -o beco-backup-key.txt
```

Public half into the `AGE_PUBLIC_KEY` GitHub secret. **Private half into the password manager
and nowhere else**, because CI only needs to write backups, not read them.

**If the private key is lost, every backup is permanently unreadable.** Store it twice.

---

## Phase 3: Launch. Unblocks M6.

### 3.1 DNS

- [ ] Cloudflare, add site `beco.co.ke`. It gives two nameservers
- [ ] **Beco changes the nameservers at their registrar.** Everything downstream waits on this,
      which is why it is asked for in week one
- [ ] Add records **DNS only, grey cloud, first**. Let Vercel issue its certificates. **Only
      then** switch to proxied with SSL/TLS Full (Strict). The other order produces a redirect
      loop that looks like a Vercel bug and is not one
- [ ] Rocket Loader **OFF**, Auto Minify **OFF**, Email Obfuscation **OFF**. All three break
      things silently. See `docs/DEPLOYMENT.md` section 8.2

### 3.2 Google properties. On **Beco's own** account, not becointeriorsdev.

- [ ] Search Console, Domain property, verified by DNS TXT
- [ ] GA4 property, Measurement ID into `NEXT_PUBLIC_GA4_ID`
- [ ] Business Profile: **start the claim in week one**, postcard verification is slow
- [ ] Brightex added as manager or editor on each, **owner on none**
- [ ] **Capture the baseline before cutover:** traffic, indexed pages, and positions for the
      five target terms. That data stops existing the moment DNS moves

### 3.3 Monitoring

- [ ] cron-job.org, under becointeriorsdev. **One keep alive job per Supabase project**, every
      3 days. Each project pauses independently
- [ ] UptimeRobot, under becointeriorsdev, one monitor per live surface

---

## Where values live

| Location | Holds |
|---|---|
| Password manager | Every secret, canonically. The source of truth |
| `.env.local` | Local development only. Gitignored. **Never production values** |
| Vercel, per project, per environment | Runtime values, scoped so Preview never sees production |
| GitHub Actions secrets | CI values |
| This repository | **Nothing. Names only, in `.env.example`** |

## The shortest path

If you want to start today and defer the rest: **Phase 0 only.** Docker, Supabase CLI,
`pnpm install`, `supabase start`. That is enough to build the database, both apps, the design
system and the import pipeline against local fixtures.

The first thing that genuinely needs a cloud account is the Drive import against real
photography, which is Phase 2.1.
