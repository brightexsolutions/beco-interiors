# Test coverage

What is covered, where, and what each layer is for. Per CLAUDE.md rule 2, nothing ships without
a test, and this is the record of what that has actually meant so far.

**No Playwright and no browser automation**, per D23. Component interaction is Vitest plus
React Testing Library in jsdom. UI journeys are verified by hand against `docs/QA-CHECKLIST.md`
on a real device.

As of 3 September 2026: **203 Vitest tests** across 28 files, **56 pgTAP tests** across 6 files.

## How to run it

```
pnpm test              # everything
pnpm test:unit         # pure functions
pnpm test:component    # jsdom, React Testing Library
pnpm test:integration  # against the local Supabase stack
pnpm db:test           # pgTAP: RLS policies and constraints
pnpm typecheck         # all nine packages
```

`pnpm test:integration` and `pnpm db:test` need `supabase start` running. They talk to the
LOCAL stack only and never to a hosted project, per rule 6.

## The layers

| Layer | Runs against | What it is for |
|---|---|---|
| Unit | Nothing | Pure functions: the role matcher, the slug rules, the money maths, the category tree |
| Component | jsdom | That a control performs the operation it advertises, per rule 3 |
| Integration | Local Postgres | Anything touching the database, auth or an external service, failure paths included |
| pgTAP | Local Postgres | Every RLS policy, from every role, and every constraint |

## Database, `supabase/tests`

| File | Proves |
|---|---|
| `01_constraints.test.sql` | A POA product cannot carry a price and a fixed one must. Renaming a product keeps its old slug for a 301. An order cannot be paid with no `paid_at`. A published post must have alt text. `line_total` is generated and cannot disagree with its inputs. Auditing works on a table with no `deleted_at`, and a soft delete is audited as a delete |
| `02_anon_rls.test.sql` | **Proving the negative is the point of this file.** Anon sees only published, non deleted products, and cannot read quotes, orders, users or the audit log. Anon cannot insert a quote directly, and CAN submit one through `submit_quote`. Exactly one `submit_quote` exists |
| `03_role_separation.test.sql` | Each Beco role sees only what it should. No Beco role reaches `brightex_admin` data. The D42 Studio gate passes for an allowlisted `brightex_admin` and fails for the same role off the list |
| `04_role_writes.test.sql` | `beco_sales` cannot write another's quote, escalate its own role, or create products. `beco_product_manager` cannot touch quotes. An inactive user has no role at all |
| `05_team_and_clients.test.sql` | **A director cannot be made public.** A client row cannot be published without recorded permission |
| `06_category_groups.test.sql` | The taxonomy is exactly two levels deep, attacked from every direction: a grandchild by update, a grandchild by insert, a parent given a parent, a category made its own parent. Every Drive folder is filed under a group except Lighting. Anon can read a group, which the browse tree depends on |

## Storefront

| Area | File | Notes |
|---|---|---|
| Quote list | `lib/__tests__/quote-list.test.ts` | localStorage, the prototype's `beco_quote_cart_v1` key. 11 tests |
| Quote submission | `app/quote/submit-quote.integration.test.ts` | **Against the real database.** The row exists, the items exist, the reference is minted, the quote arrives unowned, and a crafted request cannot supply its own description or price |
| Quote form | `components/__tests__/quote-builder.test.tsx` | That the labels reach their controls and the `name` attributes the server action reads survived the move onto the shared primitives. A dropped `name` renders perfectly and sends nothing |
| Add to quote | `components/__tests__/add-to-quote.test.tsx` | Asserts the LIST CHANGED, not that a handler exists |
| Category tree | `lib/__tests__/category-tree.test.ts` | Counts roll up to the group, a childless top level category is still a group, an orphan is dropped rather than promoted. Plus D27's index gate, which the sitemap and the robots tag both call so they cannot disagree |
| Mobile menu | `components/__tests__/mobile-menu.test.tsx` | Focus trap, escape returns focus to the trigger, closes on navigation |
| Images | `lib/__tests__/image-loader.test.ts` | |
| Social links | `components/__tests__/social-links.test.tsx` | A null URL DRAWS the icon without making it a link, so no control advertises an operation it cannot perform |

## Design system, `packages/ui`

| Component | Notes |
|---|---|
| `Button` | Variants, and the ref forward a form needs to focus a failed field |
| `ConfirmDialog` | Escape, backdrop, focus placement, focus trap. 9 tests |
| `Field` `Input` `Select` `Textarea` | The label genuinely reaches the control, an error is announced not just coloured, the drawn chevron stays out of the click path, `optgroup` carries the taxonomy. 10 tests |
| `PriceDisplay` | POA reads as deliberate. "fixed" with a null price falls back rather than rendering `KES null`. A stale `compare_at_price` cannot fake a sale |
| `ProductCard` `ProductGallery` | Correct on three images as well as six, since a fifth of the catalogue has only three |
| `ScrollMotion` | An element with no attribute is fully visible, so nothing is hidden waiting for JavaScript |
| Tokens | Contrast verified by script, never assumed. Caught white on pure Warm Red at 4.38:1, below the AA floor |

## Import pipeline, `tools/drive-import`

| File | Proves |
|---|---|
| `roles.test.ts` | Role from the TOKEN SET, not token order, so `SLAB ON STAND` and `STAND ON SLAB` agree. A filename matching nothing is `unknown`, never guessed |
| `misnest.test.ts` | A product folder nested inside another product folder is skipped, not merged |
| `mixed.test.ts` | A folder NAMING several products inside itself is detected and reported, never split. Built from the real `DELFONE 12MM` folder. The false positive cases matter most: a single odd filename, a finish word, a folder repeating its own name |
| `classify.test.ts` | New, changed, unchanged and missing |
| `quality.test.ts` | Size budgets, and the reports that come with them |
| `slug.test.ts` `plan.test.ts` `decode.test.ts` | Slug rules, plan assembly, HEIC detection by MAGIC BYTES rather than extension |

## Known gaps

Named rather than rounded up.

- **Nothing has been checked by hand on a real phone.** No iOS, no Android
- Reduced motion has not been toggled and looked at
- Lighthouse has never been run against these pages
- The interaction inventory in `docs/QA-CHECKLIST.md` is not filled in for any storefront screen
- No accessibility assertion library is wired in. The `component` skill asks for `vitest-axe`
  and it is not installed, so accessibility is currently held by hand written assertions about
  labels, roles and focus rather than by an automated check
- A quote has never been submitted from the actual browser form. The server action is covered
  against the real database; the form itself has not been used by a person
- Linux CI cannot process HEIC until Sharp is built with libheif
