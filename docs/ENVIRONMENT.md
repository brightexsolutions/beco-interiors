# Environment and Credentials

Reference BEC-2026-004-PLAN. Every variable by name, what it is, **where to obtain it**, which
surface uses it, and how it rotates.

**No values in this file, ever.** Values live in the password manager and in each platform's
own secret store. This file is committed; a value in it is a leak.

---

## 1. The rule that governs this file

The storefront receives **only** public variables. The service role key and every other admin
secret exist solely in the dashboard and studio environments, server side.

If the storefront is fully compromised, the attacker holds the anon key, which every visitor's
browser already has. That is the whole point of the split, and it is enforced by a CI secret
scan, a pre-commit hook, and a bundle scan that fails the build.

**Any variable prefixed `NEXT_PUBLIC_` is shipped to the browser in plain text.** Never put
anything there you would not print on a billboard.

---

## 2. Variable inventory

### Public, safe in the browser

| Variable | What | Where to get it | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL | Supabase, Project Settings, API, Project URL | all three |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key, scoped entirely by RLS | Supabase, Project Settings, API, `anon public` | all three |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, for metadata and OG | You set it. `https://www.beco.co.ke` | storefront |
| `NEXT_PUBLIC_IMAGE_HOST` | R2 image origin | You set it. `https://img.beco.co.ke` | storefront, dashboard |
| `NEXT_PUBLIC_GA4_ID` | Measurement ID, `G-XXXXXXXXXX` | GA4, Admin, Data Streams, your web stream | storefront |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Click to chat number, digits only | Beco. `254722333730` | storefront, dashboard |
| `NEXT_PUBLIC_BUSINESS_PHONE` | `tel:` link number | Beco. `+254722333730` | storefront |

### Server only, never in the storefront

| Variable | What | Where to get it | Used by |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS entirely | Supabase, Project Settings, API, `service_role`. **Treat as a database password** | dashboard, studio, CI |
| `SUPABASE_PROJECT_REF` | Project identifier | Supabase, in the project URL | CI, migrations |
| `SUPABASE_DB_PASSWORD` | Direct connection, for `pg_dump` | Supabase, Project Settings, Database. Reset if lost, it is not shown twice | backup workflow |
| `RESEND_API_KEY` | Transactional email | resend.com, API Keys, Create. **Scope to Sending access only** | dashboard, studio |
| `R2_ACCOUNT_ID` | Cloudflare account | Cloudflare dashboard, R2 overview | pipeline, dashboard |
| `R2_ACCESS_KEY_ID` | S3 compatible key | Cloudflare, R2, Manage R2 API Tokens, Create. **Object Read and Write, scoped to the one bucket** | pipeline, dashboard |
| `R2_SECRET_ACCESS_KEY` | Its secret | Shown **once** at creation. Capture it then | pipeline, dashboard |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Drive import identity | See section 3.1 | pipeline, backup |
| `AGE_PUBLIC_KEY` | Backup encryption, public half | `age-keygen -o key.txt`, then read the public line | backup workflow |
| `AGE_SECRET_KEY` | Decrypts backups | The private half. **Store in the password manager and nowhere else.** Losing it makes every backup useless | restore only, never in CI |
| `GEMINI_API_KEY` | Blog draft generation. **Brightex's key, in Studio only** | See 3.6 | **studio only** |
| `GEMINI_MODEL` | Model id, so it changes without a deploy | Google's current model list. Do not hardcode | studio only |
| `VERCEL_TOKEN` | Optional, CLI deploys | vercel.com, Settings, Tokens | CI, if used |

### Local only

| Variable | What |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Path to the key file on disk. **The file lives outside the repo.** `.gitignore` blocks `service-account*.json` regardless |

---

## 3. How to obtain each credential

### 3.1 Google service account, for the Drive import

Used by the import pipeline and the nightly backup upload. It runs headlessly in CI, which is
why it is a service account rather than a person's login.

1. **Google Cloud Console**, signed in as **becointeriorsdev**, per D19
2. Create a project, for example `beco-platform`
3. APIs and Services, Library, enable the **Google Drive API**. No billing is required for
   Drive API quota at this volume
4. IAM and Admin, Service Accounts, Create. Name it `beco-import`. **Grant it no project roles**,
   because its access comes from the Drive share, not from IAM
5. Open it, Keys, Add Key, Create new key, **JSON**. It downloads once
6. Store the file outside the repository. Put its path in `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
   locally, and the file contents in the `GOOGLE_SERVICE_ACCOUNT_JSON` GitHub secret
7. Copy the service account email, which looks like
   `beco-import@beco-platform.iam.gserviceaccount.com`
8. **Share `BECO PRODUCTS` with that email as Viewer.** Brightex can do this directly, because
   the folder allows editors to re-share, per D5
9. Create a `BECO BACKUPS` folder and share it with the same account as **Editor**, since the
   nightly backup writes into it

**Verify:** `pnpm drive:import --dry-run` lists the 24 sintered stone folders.

**Rotate:** create a new key, deploy it, then delete the old one from the Keys tab. Keys do not
expire on their own, so rotate at handover and annually.

### 3.2 Supabase keys

Project Settings, API. The `anon` key is public by design. The `service_role` key bypasses RLS
completely and is equivalent to a database password.

**Rotate:** Project Settings, API, Reset. This invalidates the old key immediately, so update
every consumer first and expect brief downtime.

### 3.3 Resend

1. resend.com, sign in as **becointeriorsdev**
2. Domains, Add Domain, `beco.co.ke`
3. It gives you DKIM and SPF records. Add them in Cloudflare as **DNS only**, grey cloud
4. **Do not touch the existing Zoho MX records.** They carry human mail and breaking them
   breaks info@beco.co.ke
5. Wait for verification, usually minutes
6. API Keys, Create, **Sending access only**, not Full access

**Verify:** send a test to a Gmail and an Outlook address. Check the headers show SPF and DKIM
passing.

### 3.4 Cloudflare R2

R2, Manage R2 API Tokens, Create API Token. **Object Read and Write, scoped to the
`beco-product-images` bucket only**, not account wide. The secret is shown once.

### 3.5 Backup encryption key

```sh
age-keygen -o beco-backup-key.txt
```

Public key goes in CI as `AGE_PUBLIC_KEY` and encrypts. The private key goes in the password
manager as `AGE_SECRET_KEY` and **never goes into CI**, because CI only needs to write backups,
not read them.

**If the private key is lost, every backup is permanently unreadable.** Store it in two places.

### 3.6 Gemini API key, for blog drafting

Used only by Brightex Studio, server side, to draft blog content from a title or a brief.
**Never reaches the storefront or the dashboard**, and never reaches a browser.

1. `aistudio.google.com/apikey`, signed in as **Brightex**, not becointeriorsdev and not Beco
2. Create an API key. Bind it to a Google Cloud project if you want quota visibility and
   billing alerts, which is worth doing
3. Store it as a Vercel environment variable on the **studio project only**

**This key is Brightex property**, unlike almost everything else in this file. Studio is
Brightex tooling and the drafting capability goes with Brightex at handover. That is recorded
in `docs/HANDOVER.md` and it is a deliberate consequence of D19, not an oversight.

Set `GEMINI_MODEL` rather than hardcoding a model id. Google renames and retires models, and a
config value is a one line change instead of a deploy.

**Quota:** there is a free tier, and drafting two articles a month sits far inside it. Set a
billing alert anyway, because a loop bug against a paid API is an expensive way to learn.

**Rotate:** at handover, on any Brightex staff change, and annually.

---

## 4. Where each value lives

| Location | Holds |
|---|---|
| Password manager | Every secret, canonically. The source of truth |
| Vercel, per project, per environment | Runtime values, scoped so Preview never sees a production service role key |
| GitHub Actions secrets | CI values: Supabase, R2, `AGE_PUBLIC_KEY`, the service account JSON |
| Local `.env.local` | Development only. Gitignored. Never production values |
| This repository | **Nothing. Names only** |

---

## 5. Rotation

| Trigger | Rotate |
|---|---|
| Handover, or a Brightex staff change | Everything, per `docs/HANDOVER.md` |
| Someone with access leaves Beco | Their dashboard account deactivated, shared secrets rotated |
| Suspected exposure | The affected credential, immediately, then audit what it touched |
| Routine | Annually, checked in the yearly review |

Rotation order matters: create the new credential, deploy it everywhere, verify, **then** revoke
the old one. Revoking first causes an outage.
