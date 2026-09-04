# Status

**The single place to look.** Updated at every milestone close and whenever something moves.

Legend: `DONE` verified against reality, `WIP` in progress, `TODO` not started, `BLOCKED`
waiting on someone, `OPEN` known gap, deliberately named rather than rounded up.

Last updated: 31 August 2026, evening.

**Both external dependencies confirmed against real infrastructure.**

- **Drive:** `beco-import@beco-platform.iam.gserviceaccount.com` reads BECO PRODUCTS. 17
  category folders, 24 stones, and **`md5Checksum` present on every file**, which is the one
  thing the incremental design depends on. Sizes confirm the 44MB reality
- **R2:** write, read with matching contents, list and delete all succeed against
  `beco-product-images`, with a token scoped to that bucket alone

---

## Milestones

| # | Milestone | Days | State |
|---|---|---|---|
| M0 | Rules and rails | 0.5 | **DONE** |
| M1 | Foundation and infrastructure | 3.5 | **WIP**, schema done, infrastructure blocked |
| M2 | Drive import pipeline | 3.5 | **WIP**, logic verified, Drive access confirmed live |
| M3 | Design system | 2.0 | TODO, overlaps M2 |
| M4 | Storefront, SEO, conversion, motion | 8.5 | TODO |
| M5 | Operations dashboard | 6.5 | TODO |
| M6 | Launch | 3.5 | TODO |
| M7 | Studio, inside the dashboard | 3.5 | After launch, unbilled |

28 working days, 26 calendar. Gap against four weeks is 6 days. Cut order in `docs/PLAN.md`.

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

## M1: Foundation. Schema DONE, infrastructure BLOCKED

### Verified

| Item | Evidence |
|---|---|
| 9 migrations replay from scratch | `supabase db reset`, run repeatedly |
| 19 tables, **51 policies, 0 tables without RLS** | Asserted by test, so a future table cannot ship without it |
| **35 pgTAP tests passing** | `supabase test db` |
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
| Category description is null | A grid alone does not rank. Real copy comes from Beco |
| `analytics_events` has no retention policy | A row per page view will outgrow a 500MB free tier eventually |

### Blocked

| Item | On whom |
|---|---|
| ~~`beco-staging` Supabase project~~ | **DONE**, 31 Aug |
| Vercel projects, token, Pro upgrade | Brightex |
| ~~Cloudflare account, R2 bucket, token~~ | **DONE and verified**, 31 Aug |
| Nameserver change | Beco. Everything downstream of DNS waits |
| Keep alive cron, backup workflow, uptime | Needs the accounts above |

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

46 recorded, D1 to D46. Reasoning in `docs/DECISIONS.md` and `files/BUILD-PLAN.md`.

## Known weaknesses

`docs/REVIEW.md`. Two of its findings are resolved: Studio as a third app, and preview sharing
the production database. The rest are open and honest.
