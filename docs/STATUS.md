# Status

**The single place to look.** Updated at every milestone close and whenever something moves.

Legend: `DONE` verified against reality, `WIP` in progress, `TODO` not started, `BLOCKED`
waiting on someone, `OPEN` known gap, deliberately named rather than rounded up.

Last updated: 4 September 2026. **This document had drifted badly**: it still read as though M2
through M4 had not started, when M0 through M3 are done and M4 is the milestone currently being
built. Rewritten against the actual repository rather than carried forward from 31 August.

**Both external dependencies confirmed against real infrastructure**, since 31 August.

- **Drive:** `beco-import@beco-platform.iam.gserviceaccount.com` reads BECO PRODUCTS. **17
  category folders, 24 priced stones, and `md5Checksum` present on every file**, which is the
  one thing the incremental import design depends on
- **R2:** write, read with matching contents, list and delete all succeed against
  `beco-product-images`, with a token scoped to that bucket alone

**Headline numbers, 4 September:** 23 migrations replaying clean from an empty database, 20
tables, 53 RLS policies, 246 Vitest tests across 32 files, 63 pgTAP tests across 7 files, 9
packages typechecking. 31 products, 30 published, one held back deliberately by the pipeline
itself (`DELFONE 12MM`, see D53), 24 priced, 21 described, 258 real images. Decisions recorded
through D74, `docs/DECISIONS.md`.

---

## Milestones

| # | Milestone | Days | State |
|---|---|---|---|
| M0 | Rules and rails | 0.5 | **DONE** |
| M1 | Foundation and infrastructure | 3.5 | **DONE**, schema and RLS complete. DNS on Beco and the Vercel Pro upgrade on Brightex are the two items still open, both blocking M6 rather than M1 itself |
| M2 | Drive import pipeline | 3.5 | **DONE**, live against real Drive and R2, incremental, reports rather than guesses |
| M3 | Design system | 2.0 | **DONE**, tokens, contrast verified, `@beco/ui` built out through M4 |
| M4 | Storefront, SEO, conversion, motion | 8.5 | **WIP.** 109 items ticked, 24 open. Code is mostly ahead of Beco's content now: most of what remains is blocked on Drive folders, files and confirmations, not on build work. Full detail in `docs/milestones/M4-TODO.md` and `docs/milestones/M4-HANDOVER.md` |
| M5 | Operations dashboard | 6.5 | **TODO.** `apps/dashboard` is a bare scaffold: a layout, a page, a robots file, nothing else. Two requirements already captured ahead of scoping: stock tracking in half slab units, and per agent quote ownership against admin assignment, see D68 |
| M6 | Launch | 3.5 | TODO. Depends on M4, M5, and the old URL list, still not received and the largest ranking risk in the project |
| M7 | Studio, inside the dashboard | 3.5 | After launch, unbilled |

28 working days, 26 calendar. Gap against four weeks is 6 days. Cut order in `docs/PLAN.md`.

**What M4 is actually waiting on**, in order of how long it has been outstanding: the old
beco.co.ke URL list, six Drive categories still stuck at zero products, two supplier folders
that need splitting into their real products, about 130 handle photographs named with supplier
codes, a Drive folder that matches nothing in the taxonomy, the handles price list, and a real
human walking `docs/QA-CHECKLIST.md` on an actual phone, which has not happened once. Full list
with reasons in `docs/milestones/M4-HANDOVER.md` section 3.

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

**This table drifted out of date and was resynced 3 September against the live
`import_issues` table rather than memory.** `docs/milestones/M4-HANDOVER.md` section 3 is the
fuller, maintained version with reasons and detail; this is the short form.

Resolved since 31 August, removed from the table below: product prices and descriptions
(Irene's sheet landed 1 Sept), "10+ years" vs "new entrant" (the About page was rewritten to
lead on stock rather than history), does Lighting stay a category (yes, confirmed top level
with no Drive folder, see D47 and D52).

| Item | Asked | Blocks |
|---|---|---|
| Old beco.co.ke URL list | Not yet | M6 redirect map, **the largest ranking risk in the project** |
| Six categories still stuck at zero products, photos loose with no product subfolder: Door Locks, Furniture Legs, Kitchen Accessories, Hinges, Floating Shelf Accessories, Office Accessories | Not yet | M4 breadth |
| `DELFONE 12MM` and `HEIXIN 12MM` need splitting into their real products, 9 and 7 respectively | Not yet | M4 catalogue accuracy, and it is why Statuario and Taj Mahal read as unphotographed |
| ~130 handle photographs named with supplier codes rather than shot type | Not yet | M4 catalogue accuracy across the Handles range |
| `FLUTED WALL PANELS`, a Drive folder matching nothing in the taxonomy | Not yet | Confirm before it imports as an ungrouped top level category |
| WPC or SPC, which does Beco actually sell | Not yet | M4 category names and URLs |
| Is the 2 hour quote promise real | Not yet | M5 dashboard, the site currently states no promise |
| Handles price list and prices PDF, columns unconfirmed | Not yet | Cannot load without guessing a price |
| Brand guideline pages 20 to 21, images | Not yet | Low priority, M3 already shipped without them |

---

## Decisions

Recorded through D74. D1 to roughly D45 are architectural, made before the build started, and
live in `files/BUILD-PLAN.md`, gitignored internal Brightex material. From D46 on, every decision
discovered or made DURING the build is recorded in the committed `docs/DECISIONS.md`, which is
the one to read for anything from 1 September onward: D50 is the VAT arithmetic every quote
document depends on, D52 through D65 are the M4 storefront's taxonomy and motion decisions,
D66 through D74 are from this week specifically, including two real bugs, D67 and the splash
freeze under D66's own entry, found and fixed with a regression test proving each one, and D73,
the cutout reveal treatment new this session.

## Known weaknesses

`docs/REVIEW.md`. Two of its findings are resolved: Studio as a third app, and preview sharing
the production database. The rest are open and honest.
