# Handoff, 4 October 2026: cloud session to the local machine

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
D124. Read `docs/STATUS.md` first; it is the plan of record at the end of the session.

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
| `storefront/cinematic-room-hero` | The home hero shows our finished rooms; About copy in the first person | D120 |
| `catalogue/hinges-by-colour` | Hinges import one product per photograph, sorted by finish | D122 |
| `catalogue/hardware-split-heic-codes` | Door locks and legs split too; HEIC on Linux; codes on quote lines | D122, D123, D124 |
| `storefront/hero-premium-rooms` | No rules or bars on the hero; `pnpm hero:frames` to cut stock room photographs | D121 |

## 2. What the cloud could not do, and you can

These are yours. Each is a line in `docs/QA-CHECKLIST.md` or `docs/DEPLOYMENT.md` marked as
not yet confirmed on a server.

**Database.** Migrations 58 to 61 are new since the last deploy you made. Apply to staging first
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

**Premium hero photography, blocked in the cloud.** Brown asked on 4 October for the hero to
use premium room photographs, free stock if need be, showing each range in use. The cloud's
network policy refuses every stock host (Pexels, Unsplash, Wikimedia), so the photographs were
shortlisted from search and not downloaded. Look at each one before using it: these are picked
from search descriptions, not seen.

| Room, range | First choice | Fallback |
|---|---|---|
| Kitchen, sintered stone | [4800189](https://www.pexels.com/photo/4800189/), Curtis Adams, marble island under gold pendants | [35189706](https://www.pexels.com/photo/35189706/) |
| Bathroom, sintered stone vanity | [11701114](https://www.pexels.com/photo/11701114/), Max Vakhtbovych, marble walls, double basin | [6585741](https://www.pexels.com/photo/6585741/) |
| Living room, SPC flooring | [7027720](https://www.pexels.com/photo/7027720/), Curtis Adams | [18041820](https://www.pexels.com/photo/18041820/) |
| Kitchen, hardware | [6538936](https://www.pexels.com/photo/6538936/), black handles on cabinetry | [6969865](https://www.pexels.com/photo/6969865/) |
| Walk-in closet, accessories | [11701120](https://www.pexels.com/photo/11701120/) | [6670657](https://www.pexels.com/photo/6670657/) |
| Living room, wall panels | Keep our own `living-room-slat-wall`, no stock photograph found yet | |

For each one you keep:

```sh
pnpm hero:frames kitchen-stone pexels:4800189 --wide=centre --tall=attention
```

That writes `<slug>-wide.webp` (1600x900) and `<slug>-tall.webp` (900x1200) under
`apps/storefront/public/hero/rooms/`, each under 150KB or not at all. Open both: if the crop
loses the material, rerun with another `--wide` or `--tall` position. Then add the room to
`HERO_ROOMS` in `apps/storefront/src/lib/hero-rooms.ts` with its alt text and a comment
crediting the photographer and Pexels id, the way `HERO_RANGE_IMAGES` in `lib/ranges.ts`
already does. Captions must name the material, not claim the room as our installation, since
it is not. Delete the frames of any room you drop, run `pnpm test:component`, check the hero
live on a phone and a desktop, and record the swap as the next free decision number, reversing D120's own-work-only
rule for the hero on Brown's instruction.

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
Read docs/handoffs/2026-10-04-cloud-to-local.md first, then docs/STATUS.md and D104 to D124
in docs/DECISIONS.md. The cloud session merged seventeen branches into dev between 3 and 4
October; nothing has been deployed and main is untouched. Pull dev, run pnpm install, set the
commit hooks and the Brightex Solutions author, and run the full local check list in section
3 of the handoff. Report what is red before changing anything.

Then, in this order: apply migrations 58 to 61 to staging through the pipeline and confirm
supabase test db there; add the R2 CORS and lifecycle rules from docs/DEPLOYMENT.md 3.6 and
upload one real phone photograph on staging from the dashboard, confirming the direct PUT,
the derivatives and the toast; set GITHUB_ACTIONS_TOKEN on the dashboard and dispatch a
dry-run import to staging, confirming the report artifact and the refresh step; submit a
quote on staging and confirm the confirmation email arrives; run the hardware import per the D122 step in section 2; swap the hero photographs per
the "Premium hero photography" step in section 2 of the handoff; walk docs/QA-CHECKLIST.md on a
real iPhone and Android over mobile data and log every defect against its row.

Rules that stand: never touch production data, production only after a human approves, no
em dashes, no browser dialogs, every change tested, commits authored by Brightex Solutions
with no agent attribution, nothing merged to main until Brown says so, and tell me what you
could not verify rather than marking it done.
```
