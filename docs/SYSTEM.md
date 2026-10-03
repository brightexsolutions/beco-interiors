# How the system was built

The record a successor reads first. Reference BEC-2026-004-PLAN. Where another document already
holds the detail, this one says which and stops; where none does, the detail is here. Written 3
October 2026 against the `dev` branch, which is what `main` will receive once Beco sign off.

`docs/SKETCHES.md` draws the shapes this document describes. `docs/ARCHITECTURE.md` walks every
flow in detail. `docs/HANDOVER.md` is the exit plan, written to be shown to Beco.

## 1. What it is

A Nairobi interior materials supplier whose business runs on multi item quotations, not single
item checkout. Nobody pays online. A buyer builds a list on the public site and asks for a price;
a salesperson at the counter builds the same list on a phone and issues a branded PDF before the
customer has finished their tea. The quotation flow is the product and everything else serves it.

Three surfaces come out of one repository:

| Surface | Host | Who | Built with |
|---|---|---|---|
| Storefront | `www.beco.co.ke` | The public | `apps/storefront`, Next.js 16, anon Supabase key, mostly static with hourly revalidation |
| Dashboard | `dashboard.beco.co.ke` | Beco staff, Brightex | `apps/dashboard`, Next.js 16, Supabase Auth, every query under RLS as the signed-in user |
| Studio | `dashboard.beco.co.ke/studio/*` | Brightex only | Routes inside the dashboard, gated by the `brightex_admin` role AND an email allowlist in `settings` (D42) |

## 2. The stack, and why each piece

| Layer | Choice | Reason, in one line |
|---|---|---|
| Runtime | Node 22, pnpm 11 workspaces, Turborepo | One repository, one install, shared packages typed end to end |
| Framework | Next.js 16 App Router, React 19, TypeScript 7 strict with `exactOptionalPropertyTypes` | Server components by default, ISR for the catalogue, server actions for every form. Note `proxy.ts`, the renamed middleware |
| Styling | Tailwind 4 reading `@theme` tokens from `packages/ui/src/tokens/tokens.css` | One token file, no second source of colour; the contrast checker reads the same palette |
| Database | Supabase Postgres, two projects: `beco-staging`, `beco-prod` | RLS as the authority on access; pgTAP tests on every policy; GoTrue for staff auth |
| Images | Cloudflare R2 behind `img.beco.co.ke`, derivatives made by sharp | No egress cost; photographs regenerable from Drive, so excluded from backups |
| Email | Resend, from `beco.co.ke` | Hand built table markup in `packages/documents`, no framework |
| PDFs | `pdf-lib` in `packages/documents` | Quote, receipt and sales review, rendered server side, stored as `documents` rows |
| Photography source | Google Drive, a service account on Beco's account | The business already keeps its catalogue there; the importer reads, never writes |
| Blog drafting | Gemini, from Studio | Drafts only, a human publishes |
| Charts | Recharts inside `@beco/ui` | Built against the dataviz method, monochrome emphasis form, D106 |
| Hosting | Vercel, two projects, deployed by GitHub Actions only | Vercel's Git integration is off; nothing deploys without CI (D44, D45) |
| Edge | Cloudflare DNS, WAF, one rate limit rule | Zone on Beco's account |
| Keep alive | cron-job.org on Beco's account | Both apps' `/api/health` and the staging REST URL, so the free tier never pauses |

Nothing else. No Redis, no queue, no search service, no CMS. Each was considered and the reason it
was not needed is in `docs/DECISIONS.md`.

## 3. Repository layout

```
apps/
  storefront/        www.beco.co.ke
  dashboard/         dashboard.beco.co.ke, including /studio
packages/
  ui/                @beco/ui: tokens, primitives, charts, data table, dialogs, toast
  documents/         @beco/documents: PDF and email rendering, Resend send
  validation/        @beco/validation: zod schemas, rate limiter, bearer check, return path
  supabase-client/   @beco/supabase-client: browser, server and admin clients
  types/             @beco/types: Database types (hand maintained), enums
tools/
  drive-import/      the catalogue importer, run by CI from the dashboard or by hand
  backup/            nightly backup verify, secret scan, CSP test
  setup/             env linking, type floor assertion
  test/              shared Vitest setup
supabase/
  migrations/        one file per change, numbered, RLS and tests travel together
  tests/             pgTAP, 37 files
  seed.sql           fictional data for local and staging, never a production clone
docs/                everything committed about the project
.github/workflows/   ci, deploy-preview, deploy-production, drive-import
.claude/skills/      the working rules an agent follows: seo-checklist, component, git-commit...
files/               gitignored: the build plan and client material
```

`CLAUDE.md` and `AGENTS.md` are the same bytes (a symlink) and hold the rules every change is
held to. CI fails if they diverge.

## 4. How the pieces talk

The storefront reads the catalogue with the anon key under RLS, which exposes only published,
non deleted rows. It writes exactly one thing, a quote request, through the `submit_quote` RPC,
which recomputes every price from the database so a crafted request cannot name its own.
After a catalogue change the dashboard POSTs to the storefront's `/api/revalidate` with a shared
secret, so a repriced slab is live on the next request rather than within the hour.

The dashboard signs staff in with Supabase Auth and runs every query as that user. Postgres RLS
decides what each role may read and write; the route proxy decides what each role may see. Those
are the two layers of rule 7 and neither trusts the other. The service role key appears in two
places only: `supabase-admin.ts` for creating accounts, and the import pipeline in CI.

The importer walks the Drive folder tree, plans what changed, downloads only new or changed
photographs, makes derivatives, uploads them to R2 and upserts categories and products. It runs
as a GitHub Actions workflow the dashboard dispatches (D105) or as `pnpm drive:import` by hand.
Its decisions about folder shape are in `tools/drive-import/src/plan.ts` and the Drive shape
guide on the import screen.

Email and PDFs are rendered in `packages/documents` and sent or stored from dashboard server
actions. Operational failures in either app go to `info.brightexsolutions@gmail.com` through the
dashboard's `/api/ops-alert` relay, so the storefront never holds the Resend key.

## 5. Data

`docs/SCHEMA.md` is the table by table record with the RLS intent for each. The shape:

- **Catalogue:** `categories` (a tree, three levels at most, D104), `products` (price or POA,
  stock, images as JSON, soft deleted), `category_slugs` and `product_slugs` keeping every old
  slug for a redirect
- **Sales:** `quotes` and `quote_items` (status `new`, `reviewing`, `quoted`, `won`, `lost`;
  source `web`, `walk_in`, `phone`, `whatsapp`), `orders` and `order_items` (a won quote
  converted, `pending` to `fulfilled`, `unpaid` or `paid`), `documents` (every PDF issued)
- **People:** `users` (five roles: `beco_sales`, `beco_product_manager`, `beco_editor`,
  `beco_admin`, `brightex_admin`), `settings` (business identity, KRA PIN, payment details, the
  Studio allowlist, the launch switch)
- **Content:** `blog_posts`, `announcements`, `testimonials`, `clients`, `team`
- **Record:** `audit_log` written only by triggers and two RPCs, `import_runs`, `import_issues`,
  `import_files`, `import_state`, `analytics_events`

Everything with commercial meaning is soft deleted so the audit trail points at a real row. Money
is `numeric`, VAT is inside the price (D50), quantities may be half a slab (D68).

## 6. Auth and access

No public signup. `brightex_admin` creates accounts; each opens with a forced password change.
`current_user_role()` returns null for an inactive account so RLS falls closed, and the proxy
clears the session cookie on the same signal. The route map in `apps/dashboard/src/lib/access.ts`
says which role sees which prefix; the proxy and the pages read the same map. Studio needs the
role and the allowlist. There is no MFA (deferred, D83) and no self service reset.

`docs/SECURITY.md` has the model, the 3 October review and what was fixed.

## 7. Working on it

```sh
pnpm install                 # links .env files, installs everything
pnpm db:start && pnpm db:reset   # local Supabase, migrations and seed
pnpm dev                     # storefront :3000, dashboard :3001
pnpm typecheck               # every package
pnpm test                    # unit, component, dashboard projects
pnpm test:integration        # against the local database
pnpm db:test                 # pgTAP
pnpm check:secrets && pnpm check:type-floor
pnpm build
```

`docs/SETUP.md` is the from-nothing guide. `docs/ENVIRONMENT.md` names every variable and where
its value lives. Local seed accounts and their passwords are in `supabase/seed.sql`; the dashboard
offers a one tap dev sign-in that refuses to exist outside `next dev`.

Branches: `main` is production and moves only when Beco say so. `dev` is the integration branch
and always ahead of `main`. Feature branches fork from `dev` with descriptive names
(`storefront/seo-and-legacy-urls`, `security/headers-rate-limits-and-input`) and merge back
`--no-ff`. Commits are imperative, carry no agent attribution, and have no em dashes; the hook
in `.githooks` enforces it.

## 8. Testing, what is where

Every function, route, query helper and policy has a test. The layers, each with its own
Vitest project in `vitest.config.ts`:

| Layer | Where | Count, 3 October |
|---|---|---|
| Unit | `packages/**`, `tools/**` | 341 |
| Storefront components and libs, jsdom | `apps/storefront` | 623 |
| Dashboard components, actions and libs, jsdom | `apps/dashboard` | 729 |
| Integration, against the local database | `*.integration.test.ts` | 37 |
| RLS and functions, pgTAP | `supabase/tests` | 37 files, 393 assertions |

No Playwright, no browser automation. Screens are walked by hand against `docs/QA-CHECKLIST.md`,
which carries an interaction inventory for every control. `docs/TEST-COVERAGE.md` says what each
test file proves.

## 9. Shipping

CI (`ci.yml`) on every push: secret scan, type floor, typecheck, contrast, the three Vitest
projects, integration against a Supabase container, pgTAP, both builds, Lighthouse on the
storefront. `deploy-preview.yml` deploys a green `dev` to the preview projects against
`beco-staging`. `deploy-production.yml` is `workflow_dispatch` with a typed confirmation: migrate
staging, deploy staging, then a human approves the production environment, then migrate and deploy
production. `docs/DEPLOYMENT.md` has the full procedure, the secrets list and the rollback.

## 10. Who owns what

Brightex holds the GitHub repository and the Vercel projects, nothing else. Cloudflare, R2,
Supabase, Resend, cron-job.org, monitoring and the Drive service account are Beco's, under
`becointeriorsdev@gmail.com`, with Brightex as a member. Search Console, GA4 and the Business
Profile are under Beco's own Google account with Brightex as manager. `docs/OWNERSHIP.md` is the
matrix; `docs/HANDOVER.md` is what happens if Brightex stops; `docs/RETAINER.md` is the ongoing
arrangement.

## 11. The rules that shaped it

Read `CLAUDE.md` before changing anything. The ones a newcomer trips on:

- No em dashes, anywhere, including commit messages. The hook rejects them
- No browser dialogs. `ConfirmDialog` and `toast()` from `@beco/ui`
- No decorative controls. Every button is proven to do what it says, in a test or in the QA
  checklist
- Type floor 16px, 14px for small print, dashboard included
- Sharp corners everywhere on the storefront. The dashboard's constraints were relaxed on 3
  October (D106) but the floor and the no-dialog rule stand
- Never test against production data. Staging is seeded from `seed.sql`, never cloned
- A pattern that appears twice moves into `@beco/ui`

## 12. Where it stands, 3 October 2026

Built and merged to `dev`: the storefront with the photography led revamp, SEO per page, the old
WordPress addresses carried over (D107); the dashboard redesigned on shadcn with charts, table
toolbars and the sidebar shell (D106); the three level taxonomy (D104) with Lighting retired
(D103); the Drive import from the admin panel (D105); the security review closed (D108); keep
alive documented for cron-job.org.

Not yet done, and said plainly:

- Nothing is merged to `main`. Beco decide when
- The dashboard import has not dispatched a real GitHub workflow: `GITHUB_ACTIONS_TOKEN` is not
  set on any environment yet
- The cron-job.org jobs exist on paper in `docs/DEPLOYMENT.md` 3.12, not yet in the account
- Search Console is not yet verified under Beco's account; `docs/SEO-MIGRATION.md` is the
  procedure
- The next real `drive:import` run creates the sub ranges (12mm and 15mm under Sintered Stone,
  colours under Handles) from the folder tree; until then those rows do not exist
- Real phone QA of the redesigned dashboard is outstanding
- Lighthouse has not been run against the live choreography

`docs/STATUS.md` is updated at every milestone close and is the place to check this list.
