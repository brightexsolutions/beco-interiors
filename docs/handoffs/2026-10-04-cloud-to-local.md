# Handoff, 4 to 5 October 2026: cloud session to the local machine

Written for the agent on Brown's local machine, which owns the Drive import, the staging and
production deploys, and real device QA. Everything below was built in a cloud session against
a stand-in stack, never against staging or production. Nothing has been deployed. `main` has
not been touched; every change is on `dev`, merged from a named branch.

Paste the prompt at the end into the local chat to begin.

## 1. What to pull

```sh
git fetch origin dev
git log --oneline HEAD..origin/dev        # what you are missing
git checkout dev && git pull --ff-only origin dev
pnpm install --frozen-lockfile            # @aws-sdk/s3-request-presigner is new
git config core.hooksPath .githooks
git config user.name "Brightex Solutions"
git config user.email "info.brightexsolutions@gmail.com"
```

The cloud work is the merges on `dev` dated 3 and 4 October. Each merge names its branch, each
branch is one piece of work, and each piece has a decision in `docs/DECISIONS.md`, D104 to
D125. Read `docs/STATUS.md` first; it is the plan of record at the end of the session.

| Branch merged into dev | What it is | Decision |
|---|---|---|
| `catalogue/retire-lighting` | Lighting retired from the catalogue | D103 |
| `ops/keep-alive-and-health`, `ops/keep-alive-on-cron-job-org` | Health probe, keep-alive via cron-job.org, not Actions | `docs/DEPLOYMENT.md`, keep-alive |
| `catalogue/three-level-taxonomy` | Major category, range, sub range; importer reads Drive as kept | D104 |
| `dashboard/drive-import-screen` | Catalogue, Drive import screen dispatching the GitHub workflow | D105 |
| `dashboard/redesign-shadcn-charts` | Sidebar shell, charts, toolbars, tables | D106 |
| `storefront/seo-and-legacy-urls` | SEO on every page, old WordPress URLs redirected, Search Console procedure | D107 |
| `security/headers-rate-limits-and-input` | Security review closed, migration 60 | D108 |
| `docs/system-record-and-sketches` | `docs/SYSTEM.md`, `docs/SKETCHES.md` | |
| `email/templates-v2` | Emails open on a photograph and carry the figure; confirmation relay | D109 |
| `dashboard/mobile-bottom-nav-and-role-gating` | Bottom bar on phones; cancel, production import and allowlist admin only, migration 61 | D110, D111 |
| `dashboard/phone-layout-pass`, `dashboard/responsive-three-widths` | Every screen laid out at 390, 820, 1280 | D112, D113 |
| `catalogue/range-browser` | Catalogue browses one level at a time | D114 |
| `catalogue/import-brightex-only` | Drive import visible to brightex_admin only | D115 |
| `catalogue/sheet-phone-polish` | Range delete reason beneath the button, styled file picker | |
| `catalogue/direct-photo-upload` | Photographs PUT straight to R2 under a presigned URL | D116 |
| `dashboard/action-feedback` | Pending, result and reloading states on every action; editor key fix | D117 |
| `ci/stop-the-red-runs` | CI fixed and quiet on dev pushes; workflow files valid again | D118 |
| `storefront/shop-range-index` | The shop browses by range first; `/shop/all`; the strip inside a range | D119 |
| `storefront/cinematic-room-hero` | About copy in the first person. Its home hero half was taken back out of dev on 5 October, see below | D120 |
| `catalogue/hinges-by-colour` | Hinges import one product per photograph, sorted by finish | D122 |
| `catalogue/hardware-split-heic-codes` | Door locks and legs split too; HEIC on Linux; codes on quote lines | D122, D123, D124 |
| `storefront/hold-back-home-hero` | Takes the cinematic home hero back out of dev; the range hero is live again | D120, D121 status |
| `design/subtle-corner-radius` | Slight corners: 4px controls, 6px cards and image frames, both apps | D125 |
| `documents/subtle-corner-radius` | The same corners on the emails and the quote PDF | D125 |

## 2. What the cloud could not do, and you can

These are yours. Each is a line in `docs/QA-CHECKLIST.md` or `docs/DEPLOYMENT.md` marked as
not yet confirmed on a server.

**Database.** Migrations 58 to 62 are new since the last deploy you made. Migration 62 (D124) adds
`code` to quote and order lines and restates `convert_quote_to_order` to copy it. Apply to staging first
with the pipeline, confirm `supabase test db` is green there, then production after approval.
Migration 61 changes `set_order_status()` so only an admin can cancel; a salesperson's cancel
button is already gone from the UI.

**R2 bucket, two settings, before anyone uploads a photograph from the dashboard.** The CORS
rule and the `uploads/` lifecycle rule in `docs/DEPLOYMENT.md` 3.6. Without CORS the browser's
PUT fails and the dashboard falls back to posting files under 4MB through Vercel; anything
larger is refused with a message. Then upload one real phone photograph on staging and watch
it land: the percentage on the button, the Done toast, the derivatives in the bucket, the
staging object gone. That is the one piece of D116 that has only run against a mocked client.

**Environment variables.** Nothing new on Supabase or R2. On Vercel, both projects already
need `STOREFRONT_URL` and `REVALIDATE_SECRET` for instant storefront refresh (check they are
set, the cloud stack never had them). `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` on the storefront
is optional, only if Beco verifies by HTML tag rather than DNS. `GITHUB_ACTIONS_TOKEN` on the
dashboard is required for the Catalogue import screen to dispatch the workflow; it was never
set. Full table in `docs/ENVIRONMENT.md`.

**The import workflow had never been valid.** `.github/workflows/drive-import.yml` was rejected
by GitHub on every push until 4 October (a `runner` context in a job level `env`). It is fixed
on `dev`. The first dispatch from the dashboard, or from the Actions tab, dry-run to staging,
is a real first run: confirm the report artifact appears and the storefront refresh step logs
an HTTP 200. The next real import creates sub ranges under D104; run it as dry-run first and
read the plan.

**Real phone QA.** The whole dashboard was laid out and measured against a headless phone
viewport, never a real device. Walk `docs/QA-CHECKLIST.md` on an iPhone and an Android over
mobile data: the bottom bar, the quote flow one handed, the catalogue sheets, the photo upload,
the Updating and Saving states. Log anything off against the screen's row.

**Email.** The quote confirmation to the customer is relayed from the storefront to the
dashboard (`/api/quote-confirmation`); it has been tested but never observed in a real inbox.
Submit a quote on staging and check the customer and the Brightex ops mailbox.

**The home hero redesign is not in dev.** On Brown's instruction, 5 October, the cinematic rooms
hero (D120) and its follow ups (D121: no rules or bars, `pnpm hero:frames`, the stock photo
shortlist) were taken out of `dev` and live on their own branch, `storefront/home-hero-cinematic-finished-rooms`. `dev` keeps
the earlier `PinnedHero` and everything else, including the first person About copy. Do not
deploy the hero from that branch until Brown approves it; merging it into `dev` brings all of it
back in one step.

**Hinges, door locks and furniture legs, one product per photograph (D122, D123).** Every one of
these photographs is HEIC. The dashboard's import button now decodes it on GitHub's runners
(D123); this has only run against a test file, so the first dispatch is the real test. Against
staging, Check only first, from the dashboard or `pnpm drive:import --dry-run` on the Mac: the report should list `HINGES` under "Ranges split one product per
photograph" with about 63 products, and `DOOR LOCKS` and `FURNITURE LEGS` beside it, about 11 and
55. Then the real run. Check on staging: the old "Hinges"
product is unpublished, Hardware then Hinges holds Black, Silver and Gold Hinges (whichever
finishes the photographs read as) plus any unsorted ones, and each is quotable on its own. Look
through the finishes against the photographs and note how many were misread, since that decides
whether colour sorting stays (D122, "Reverses if"). Then the Beco team sets each hinge's code,
name and price in the dashboard and deletes repeat photographs of the same hinge. Production
after approval, the same way.

**Search Console and cron-job.org.** Both are Beco's to set up, with Brightex as manager.
`docs/SEO-MIGRATION.md` is the procedure, now with an ordered table; `docs/DEPLOYMENT.md`
covers the two cron-job.org jobs. Neither needs code.

## 3. CI, read before you push

CI no longer runs on a push to `dev`. It runs on a pull request, on `main`, and by hand. Before
you deploy, run what CI runs locally:

```sh
pnpm typecheck && pnpm check:secrets && pnpm check:type-floor
pnpm --filter @beco/ui check:contrast
pnpm test:unit && pnpm test:component && pnpm test:dashboard
supabase start && supabase test db && pnpm test:integration && supabase stop
pnpm build
```

CI was dispatched by hand on `dev` at commit 7d9d2e1 on 4 October and passed, both jobs,
run 37202363371: the first green run in the repository since 12 September. That is the state
you inherit. If you want a fresh record on `dev`, dispatch CI from the Actions tab; if it is
red, the failure is yours to read before anything deploys.

## 4. Known gaps left on purpose

- The earlier 56 commits on `dev` carry the cloud container's default author. A rewrite was
  offered and not done; it is Brown's call, and it rewrites shared history.
- The storefront shop was rebuilt as a range index on 4 October, D119, branch
  `storefront/shop-range-index`: `/shop` tiles, `/shop/all` flat list, the strip inside a range.
  Walk it on a real phone; the chip row scrolls sideways and must not trap the page scroll.
- `files/BUILD-PLAN.md` is gitignored and was not present in the cloud; if a decision looks
  like it contradicts the plan, the plan wins and the decision is reopened.

## 5. The prompt to begin the local chat

```
You are the local agent for the Beco Interiors platform. A cloud session worked on dev from
3 to 5 October 2026 and pushed everything to origin/dev. None of it is deployed and main is
untouched. Your job: bring dev down, prove it is sound, deploy it to staging, verify it there,
and deploy to production only when I say so.

1. Sync. git fetch origin, then git checkout dev and git pull --ff-only origin dev. If local
dev has commits that origin/dev does not, stop and tell me; never force push or reset. Then
pnpm install --frozen-lockfile, git config core.hooksPath .githooks, and set the author to
Brightex Solutions <info.brightexsolutions@gmail.com>. Read
docs/handoffs/2026-10-04-cloud-to-local.md in full, then docs/STATUS.md and D104 to D125 in
docs/DECISIONS.md, before changing anything.

2. Prove it locally. Run the full list in section 3 of the handoff: typecheck, secret scan,
type floor, contrast, unit, component, dashboard, supabase test db, integration, and pnpm build
for both apps. Report anything red and fix it on a branch off dev before going further. Then
start both apps against supabase start and click through the home page, the shop by range, a
product page, adding to the quote, and a dashboard quote with its PDF.

3. What ships, and what does not. In: everything merged into dev (the handoff table), including
migrations 58 to 62, the hardware split by finish (D122), HEIC decoding on Linux (D123), product
codes on quote lines (D124) and the slight corners (D125). Not in: the cinematic home hero, which
lives on storefront/home-hero-cinematic-finished-rooms (D120, D121). Do not merge or deploy
that branch.

4. Staging first. Follow docs/DEPLOYMENT.md sections 4 and 11 and the deploy path you used
last time. Export first, per the backup rule. Apply migrations 58 to 62 to beco-staging, confirm
the database tests pass there, then deploy both apps to staging. Then work through section 2
of the handoff on staging: the R2 CORS and lifecycle rules and one real phone photograph
uploaded from the dashboard; STOREFRONT_URL, REVALIDATE_SECRET and GITHUB_ACTIONS_TOKEN set; a
Check only import from the dashboard button, reading the plan for HINGES, DOOR LOCKS and
FURNITURE LEGS, then the real import and a look at whether the finishes match the photographs;
a quote with a coded product showing its code on the dashboard and in the PDF; a quote
submitted from the site with its confirmation email received. Report what passed, what failed,
and what you could not check.

5. Production only on my word. Stop after staging and wait for me to say "deploy production".
Until then main does not move. When I do: open the pull request from dev to main, let CI go
green, merge, and run the production deploy so migrations land before the apps, behind the
approval gate, with the export first. Then check www.beco.co.ke and dashboard.beco.co.ke, the
health endpoint, and one quote end to end, and tell me the result.

6. Housekeeping. Delete the remote branches storefront/cinematic-room-hero and
storefront/hero-premium-rooms; both are contained in storefront/home-hero-cinematic-finished-rooms
and the cloud session was not allowed to delete them.

Rules that stand: never touch production data, and nothing tests against it; production only
after I approve; no em dashes; no browser dialogs; every change tested; commits authored by
Brightex Solutions with no agent attribution; and tell me plainly what you could not verify
rather than marking it done.
```
