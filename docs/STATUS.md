# Status

**The single place to look.** Updated at every milestone close and whenever something moves.

Legend: `DONE` verified against reality, `WIP` in progress, `TODO` not started, `BLOCKED`
waiting on someone, `OPEN` known gap, deliberately named rather than rounded up.

Last updated: 23 September 2026. M0 through M4 done. M5 (operations dashboard)
is **WIP** on branch `dev`, approaching close. `dev` is now the primary
developer branch, forked from `m5-dashboard` and always kept ahead of `main`;
a feature or polish branch forks from `dev` and merges back once built and
verified, and `dev` is what pushes to GitHub. It carries the operations
dashboard and the photography-led storefront revamp (merged from `m5-quotes`
and `storefront-revamp`). Auth, shell, quotes, PDF and email, admin home
figures, catalogue (`/products`), category and range management
(`/categories`, D91), orders, reports, users, announcements, settings, Studio
blog (`/studio/blog`), audit (`/audit`) and the dashboard appearance toggle
are built. Next is M5 close: walk sections S and T, real-phone QA including
the 12-tap count, then Codex review on committed state. Handoff:
`docs/milestones/M5-QUOTES-HANDOVER.md`. Live beco.co.ke is still
WordPress; that is expected until the storefront launches.

**Consolidation pass, 23 September.** The branch had accumulated real debt
from several concurrent sessions that nobody had caught because the whole
suite had never been run together: `pnpm typecheck` had never once passed
end to end (a broken build was committed, the product page imported a
function that did not exist yet), three migrations collided on the same
number from an unrenumbered merge so a fresh `supabase db reset` failed
outright, and `stock_quantity` was recorded as reaching the storefront when
the query layer never actually selected the column. All fixed, D90.
`pnpm typecheck`, both app builds, the full Vitest suite and pgTAP are now
clean together for the first time; see the headline numbers below. The Drive
importer had two real bugs, found before reusing it to pick up photographs
added to previously empty folders: a re-run could silently drop existing
photos when new ones were added alongside them, and it reverted a dashboard
rename or recategorisation on the next unrelated change to that product's
Drive folder. Both fixed and proven against a real, live import, not only
fixtures, D90.

**Both external dependencies confirmed against real infrastructure**, since 31 August.

- **Drive:** `beco-import@beco-platform.iam.gserviceaccount.com` reads BECO PRODUCTS. **17
  category folders, 24 priced stones, and `md5Checksum` present on every file**, which is the
  one thing the incremental import design depends on
- **R2:** write, read with matching contents, list and delete all succeed against
  `beco-product-images`, with a token scoped to that bucket alone

**Headline numbers, 23 September:** 53 migrations replaying clean (renumbered this session to
resolve a merge collision, see D90), **21 tables, 55 policies, 0 tables without RLS**, **1331
Vitest across 211 files**, **330 pgTAP across 29 files**, 9 packages typechecking clean, both
apps building clean, all four checked together for the first time this session. **After a real,
live `drive:import` run against local** (69 minutes, HEIC decode is the bottleneck): 42
products, 41 published, 79 files downloaded, 1698 derivatives generated, imported clean on the
fixed importer (D90), zero photos dropped, zero commercial fields reverted. The six categories
long stuck at zero products (Door Locks, Furniture Legs, Kitchen Accessories, Hinges, Floating
Shelf Accessories, Office Accessories) each now hold one umbrella product with real photography,
same as five more loose folders (Bamboo Veneer Wall Panels, Drawer Rails, Fluted Wall Panels,
Lights, 15mm Sintered Stones): the underlying gap, one product per folder rather than one per
item, is unchanged and still needs Beco to create a subfolder per real product, see below.
Decisions recorded through **D91**, `docs/DECISIONS.md`. `docs/BECO-COMPANY-PROFILE.md` is
Beco's own description of the business, supplied 10 September, and is the source for About page
copy,
hours (Mon to Fri 8am to 4pm, Sat 8am to 2pm) and the two live social accounts.

---

## Milestones

| # | Milestone | Days | State |
|---|---|---|---|
| M0 | Rules and rails | 0.5 | **DONE** |
| M1 | Foundation and infrastructure | 3.5 | **DONE**, schema and RLS complete. DNS on Beco and the Vercel Pro upgrade on Brightex are the two items still open, both blocking M6 rather than M1 itself |
| M2 | Drive import pipeline | 3.5 | **DONE**, live against real Drive and R2, incremental, reports rather than guesses |
| M3 | Design system | 2.0 | **DONE**, tokens, contrast verified, `@beco/ui` built out through M4 |
| M4 | Storefront, SEO, conversion, motion | 8.5 | **DONE**, Codex review ran 9 Sept. A modernisation pass (D82) followed 9 to 10 Sept on branch `storefront-revamp`: real photography imported, fluid type scale, craft floor, specimen plates, the home hero and `SlabToSurface` reworked, a rotating announcement bar, a transparent header across the dark-hero pages, the `/shop` filter rebuilt for mobile, `/about` opened on Beco's own copy, confirmed hours and social. Uncommitted working-tree, all green. Follow-ups deferred in `docs/PLAN.md`: portrait video sections, `/about` lower sections, the import pipeline EXIF fix |
| M5 | Operations dashboard | 6.5 | **WIP**, screens done, close remaining. Auth, shell, quotes, PDF, email, home figures, catalogue (`/products`, D89), category and range management (`/categories`, D91), orders, reports, users, announcements, settings (payment channels and Brightex grants), `/studio/blog`, `/audit` and dashboard dark mode are on `dev`, which also carries the photography-led storefront revamp. Studio write is Brightex-only; audit read stays grantable. Still open: docs walk (S), definition of done (T), Codex review (U), 12-tap count and phone QA, LastUpdated, section L realtime. Handoff: `docs/milestones/M5-QUOTES-HANDOVER.md` |
| M6 | Launch | 3.5 | TODO. Depends on M4, M5, and the old URL list, still not received and the largest ranking risk in the project |
| M7 | Studio, inside the dashboard | 3.5 | After launch, unbilled. Blog authoring at `/studio/blog` shipped early inside M5; remaining Studio scope stays here |

28 working days, 26 calendar. Gap against four weeks is 6 days. Cut order in `docs/PLAN.md`.

**What M4 is actually waiting on**, in order of how long it has been outstanding: the old
beco.co.ke URL list, eleven Drive categories still holding one umbrella product each rather
than a real per-item catalogue (changed but not resolved by the 23 September import, see
"Waiting on Beco" below), two supplier folders that need splitting or moving up a level into
their real products, about 130 handle photographs named with supplier codes, the handles price
list, and a real human walking `docs/QA-CHECKLIST.md` on an actual phone, which has not
happened once. Full current list in "Waiting on Beco" below.

---

## M0: Rules and rails. DONE

| Item | State | Verified by |
|---|---|---|
| `.gitignore` fixed, 1GB zip moved out of the repo | DONE | `git status` clean, zip ignored |
| `CLAUDE.md` with 8 hard rules | DONE | Present, no em dashes |
| `AGENTS.md` symlink to `CLAUDE.md` | DONE | `readlink` returns `CLAUDE.md`, bytes identical, CI asserts it |
| Ten skills | DONE | All load |
| 18 documentation files | DONE | Written as milestones land, not in a catch up pass |
| Prototype moved to `prototype/` with a README | DONE | |
| pnpm via corepack, build scripts approved declaratively | DONE | `pnpm install` clean |

## M1: Foundation. DONE

**Table below is the M1 close snapshot, September.** For the current total, headline numbers
above: 53 migrations, 21 tables, 55 policies, 330 pgTAP across 29 files, confirmed 23 September.

### Verified

| Item | Evidence |
|---|---|
| 23 migrations replay from scratch | `supabase db reset`, run repeatedly, most recently 4 September |
| 20 tables, **53 policies, 0 tables without RLS** | Asserted by test, so a future table cannot ship without it |
| **63 pgTAP tests passing, across 7 files** | `supabase test db` |
| Constraints enforced in the database | POA cannot carry a price, `paid_at` must agree with `payment_status`, a published post needs alt text, `line_total` is generated |
| Anonymous denial proven | Cannot read unpublished, soft deleted, quotes, orders, users or audit log. **Can** insert a quote |
| **Per role writes proven** | `beco_sales` cannot write another's quote, cannot escalate its own role, cannot create products. `beco_product_manager` cannot touch quotes. `beco_editor` cannot create products. An inactive user has no role at all |
| **D42 Studio gate proven both ways** | `brightex_admin` on the allowlist passes; the same role **not** on it fails, which a domain suffix check would have missed |
| Realtime on `quotes` and `orders` only | In the publication, `replica identity full` confirmed |
| Seed with the real 24 products, 7 bookmatch | Fictional customers only, never cloned from production |
| Types generated, 22 tables | `pnpm db:types` |
| Design tokens, contrast verified 7/7 | Caught white-on-red at 4.38:1, below the AA floor |
| Secret scan clean, 121 files | |

### Open, named rather than rounded up

| Item | Why it matters |
|---|---|
| Optimistic locking is a column, not enforcement | `updated_at` is compared in application code at M5. Until then two salespeople can still overwrite each other |
| ~~Category description is null~~ | **DONE**, migration 14. Sintered stone and handles have real copy; the empty categories still do not, because there is nothing to describe yet |
| `analytics_events` has no retention policy | A row per page view will outgrow a 500MB free tier eventually |

### Blocked

| Item | On whom |
|---|---|
| ~~`beco-staging` Supabase project~~ | **DONE**, 31 Aug |
| Vercel projects, token, Pro upgrade | Brightex |
| ~~Cloudflare account, R2 bucket, token~~ | **DONE and verified**, 31 Aug |
| Nameserver change | Beco. Everything downstream of DNS waits. **The single largest thing blocking M6** |
| Keep alive cron, backup workflow, uptime | Needs the accounts above |

---

## M2: Drive import pipeline. DONE

Live against real Drive and R2, not a fixture run. Incremental: unchanged files are never
re-downloaded, `import_files.md5_checksum` is what makes that safe. Reports rather than guesses,
per rule 3's spirit applied to content: a misnested folder, a mixed folder naming several
products at once, an unnamed file, a loose category, all become a recorded issue rather than a
silent wrong import. HEIC decodes via `sips` on this machine; Linux CI still cannot until Sharp
is built with libheif. Video transcoding is manual; `ffmpeg` was installed 4 September and is
now available for it, which was a standing gap until today.

**Since 31 August:** the importer's own env loading was fixed, so `--dry-run` cannot silently
fall back to fixtures and report success against data that was never real (see D-series entries
around 3 September in `docs/DECISIONS.md`). A folder holding several products, `mixed.ts`,
is now detected and reported rather than imported as one wrong product, which is what caught
`DELFONE 12MM` and `HEIXIN 12MM`, see D53.

## M3: Design system. DONE

`@beco/ui` is the working set of components, not a separate design phase that finished and
stopped: `Field`, `Input`, `Select` and `Textarea` were added under M4 when a second form needed
them, per rule 5. Contrast verified by script, 7 of 7 pairs, caught white text on pure Warm Red
at 4.38:1 before it shipped. Self hosted Titillium Web and Cormorant Garamond, no Google Fonts
request. Motion vocabulary, `packages/ui/src/tokens/motion.css`, has grown through M4 as new
sections asked for it: the hero's orbit, the range rail's self-driving marquee, the gallery's
assembled entrance, all landed as M4 work rather than as a returned-to M3 phase.

---

## Waiting on Beco

**Resynced 23 September against the actual `drive:import` report, not memory or an older
run.** `docs/milestones/M4-HANDOVER.md` section 3 predates this resync and is now stale; this
table is the current short form.

Resolved since 3 September, removed from the table below: product prices and descriptions,
"10+ years" vs "new entrant", does Lighting stay a category (yes, confirmed top level with no
Drive folder, see D47 and D52). **Changed by the 23 September import, not resolved**: the six
categories once stuck at literally zero products (Door Locks, Furniture Legs, Kitchen
Accessories, Hinges, Floating Shelf Accessories, Office Accessories) now each hold one umbrella
product with real photography, the importer's documented behaviour for a category with no
per-item subfolder. Five more loose folders imported the same way: Bamboo Veneer Wall Panels,
Drawer Rails, Fluted Wall Panels, Lights, 15mm Sintered Stones. The underlying gap is the row
below, unchanged: one product per folder, not one per real item.

| Item | Asked | Blocks |
|---|---|---|
| Old beco.co.ke URL list | Not yet | M6 redirect map, **the largest ranking risk in the project** |
| Eleven categories hold one umbrella product each rather than a real per-item catalogue, photos loose with no product subfolder: Door Locks, Furniture Legs, Kitchen Accessories, Hinges, Floating Shelf Accessories, Office Accessories, Bamboo Veneer Wall Panels, Drawer Rails, Fluted Wall Panels, Lights, 15mm Sintered Stones | Not yet | M4 breadth. Beco can now create a subfolder per real product directly, or ask Brightex; a subfolder rename is enough, no re-import needed beyond the next `drive:import` |
| `DELFONE 12MM` names 9 products inside one folder (Calacatta Macchia, Bosnia Grey, Bulgaria Black, Martha Brown, Staturio, Taj Mahal, Verde Lepanto, Verde, Statuario) and imports as one umbrella product | Not yet | M4 catalogue accuracy, and it is why Statuario and Taj Mahal read as unphotographed |
| `HEIXIN 12MM` has 7 real product folders (Prada Green, Ink White, Hanting Jade, Appricot, Hermes Gold, Black Sandstone, Anakin) nested one level too deep, under `HEIXIN 12MM` instead of directly under the sintered stone category, so all 7 are skipped rather than imported wrong | Not yet | M4 catalogue accuracy across those 7 stones |
| ~130 handle photographs (six real handle products already have their own folders) have filenames that do not say what they show, so every one imports with no role and sorts by filename rather than by shot type | Not yet | M4 catalogue accuracy across the Handles range |
| WPC or SPC, which does Beco actually sell | Not yet | M4 category names and URLs |
| Is the 2 hour quote promise real | Not yet | M5 dashboard, the site currently states no promise |
| Handles price list and prices PDF, columns unconfirmed | Not yet | Cannot load without guessing a price |
| Brand guideline pages 20 to 21, images | Not yet | Low priority, M3 already shipped without them |

---

## Decisions

Recorded through D102. D1 to roughly D45 are architectural, made before the build started, and
live in `files/BUILD-PLAN.md`, gitignored internal Brightex material. From D46 on, every decision
discovered or made DURING the build is recorded in the committed `docs/DECISIONS.md`: D50 is the
VAT arithmetic every quote document depends on, D52 through D65 are the M4 storefront's taxonomy
and motion decisions, D66 through D78 include two real bugs found and fixed with a regression
test each, D79 reverses the hero back to a full-bleed photograph on Brown's explicit call, D80
is the first-anniversary countdown and launch control, D81 the app-level rate-limit stopgap in
front of the Cloudflare edge rule, D82 the post-M4 storefront modernisation pass, D83 through
D89 the M5 dashboard's authorization model, shell, quote approval gate, an RLS gap closed, the
shadcn construction standard and where stock lives, and D90 and D91 (23 September) the Drive
importer's ownership fix and the `/categories` range editor.
D92 to D101 are the storefront and dashboard refinements of 24 September. D102 (28 September)
is the polish and hardening pass: operational alerts to Brightex, the `PT409` stale edit fix,
staff names for sales, business identity on quotes, and the red square mark on the dashboard.

## Known weaknesses

`docs/REVIEW.md`. Two of its findings are resolved: Studio as a third app, and preview sharing
the production database. The rest are open and honest.
