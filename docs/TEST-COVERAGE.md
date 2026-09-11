# Test coverage

What is covered, where, and what each layer is for. Per CLAUDE.md rule 2, nothing ships without
a test, and this is the record of what that has actually meant so far.

**No Playwright and no browser automation**, per D23. Component interaction is Vitest plus
React Testing Library in jsdom. UI journeys are verified by hand against `docs/QA-CHECKLIST.md`
on a real device.

As of 11 September 2026: **605 Vitest tests** across 83 files, **17 integration tests**, and
**123 pgTAP tests** across 11 files. Nine packages typecheck. `vitest-axe` is wired: every
component test asserts no accessibility violations on its rendered output, per the `component`
skill's baseline.

M5 section A (dashboard auth, sessions and accounts) added the dashboard's proxy and access
map, the forced first-login flow, `record_sign_in()` / `complete_first_login()`, the six
seeded staff, and `PasswordInput`. See the Dashboard section below and
`09_dashboard_first_login.test.sql`.

M5 section D (quotes) so far: the approval gate (D86, `10_quote_pricing_approval.test.sql`),
a real RLS gap closed on quotes and orders (D87, `11_quotes_orders_read_gap.test.sql`), and the
quotes list plus a read-only detail screen.

The storefront modernisation pass (D82) rebuilt or extended these suites: `announcement-bar`
(now a rotating client component, `buildAnnouncementItems` plus roll and reduced-motion
behaviour), `add-to-quote` (the "Review quote" route after an add), `shop-controls` (the
mobile filter panel, contracts otherwise unchanged), `pinned-hero` (the shortened fallback
lede), `product-card` (the specimen plate is `aria-hidden`, the heading link is the accessible
name), and `quote-builder` (the confirmed hours string).

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
| `07_fractional_quantity.test.sql` | Half a slab is a valid quantity for anything sold per slab, a whole unit for everything else, enforced in `submit_quote` because it is a public RPC. See D68 |
| D80 launch switch, in `02` and `04` | Anon and `beco_sales` cannot write `settings.site_launch_at` or `site_launch_live`; `beco_admin` can. Anon CAN read both keys, which the storefront countdown needs before any login exists |
| `09_dashboard_first_login.test.sql` | `record_sign_in()` stamps `last_login_at` and writes exactly one `login` audit row per sign-in, and it advances on the next sign-in. `complete_first_login()` clears `must_change_password` once and audits the transition once. A user cannot re-arm their own flag, deactivate themselves, or change their own email or role by hand (the narrowed `users_update_self_safe`), but CAN still edit their own `full_name`. Both functions are a no-op for a deactivated user and cannot be executed by anon. See D83, migration 26 |
| `10_quote_pricing_approval.test.sql` | A catalogue priced line needs no approval; a discount flips `requires_approval`; a priced custom line does too, an unpriced one does not. `beco_sales` cannot approve their own quote or move it to `quoted` while unapproved (a database `check`, not only RLS), but can still edit everything else on it. `beco_admin` can approve, after which `quoted` succeeds and the approver is recorded. Editing a line on an already quoted, approved quote is refused outright. See D86, migration 27 |
| `11_quotes_orders_read_gap.test.sql` | `beco_product_manager` and `beco_editor` cannot read `quotes`, `quote_items`, `orders` or `order_items`, closing a gap where any active role could. `beco_sales` and `beco_admin` still can, checked as a regression. See D87, migration 28 |

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
| Error pages | `app/__tests__/error-pages.test.tsx` | `error.tsx` and `global-error.tsx`: `reset()` fires, the digest reference shows only when present and is logged, the WhatsApp and phone routes are there. 8 tests |
| Home hero fallback | `components/__tests__/hero-static.test.tsx` | `HeroStatic` renders the same words and CTAs as `PinnedHero` when there is no photography. 4 tests |
| Gallery project types | `lib/__tests__/project-type-facets.test.ts` | Counts by type with real labels, ignores unclassified shots, returns nothing when nothing is classified. 4 tests. Plus `app/gallery/__tests__/metadata.test.ts` for D29 on `?type=` |
| Client showcase | `components/__tests__/client-showcase.test.tsx` | Renders nothing until a client is published and permitted; logo, name fallback, sector and project line. 5 tests |
| Launch banner | `components/__tests__/launch-banner.test.tsx` | Countdown to the date, reveal on the switch, confetti once per browser and skipped under reduced motion. 9 tests |
| Blog JSON-LD | `app/blog/[slug]/__tests__/blog-posting-schema.test.tsx` | Both ld+json blocks parse; headline, description, absolute image URL, author, publisher, omit-not-null, breadcrumb. 5 tests |

## Dashboard, `apps/dashboard`

M5 section A. The dashboard has its own Vitest project (`--project dashboard`, jsdom).

| Area | File | Proves |
|---|---|---|
| Access map | `lib/__tests__/access.test.ts` | The route/role matrix, every path against every role, both directions. A prefix rule reaches everything under it (`/quotes/new`) but not a sibling that merely shares a stem (`/quotes-archive`). Every role's landing is somewhere that role is actually allowed |
| Proxy | `__tests__/proxy.test.ts` | Signed-out to `/login` with a return path (and none for `/`). A deactivated or unknown user is bounced and the `sb-*-auth-token` cookie is cleared. A flagged user is forced to `/change-password` from every route including `/launch`, and can reach `/change-password` itself. Then the full role x route grid, admit or redirect-to-landing, including a nested path |
| Session helpers | `lib/__tests__/session.test.ts` | `resolveSessionUser` returns the full shape and nulls the role for an inactive account, matching `current_user_role()`. `resolveAdminRole` unchanged |
| Sign-in action | `app/login/__tests__/actions.test.ts` | One message for every auth failure, no session started. A deactivated account is signed straight back out. On success, `record_sign_in` is called and the redirect is home (or a safe local `next`). The D81 burst limit still bites at the eleventh attempt |
| Forced-change action | `app/change-password/__tests__/actions.test.ts` | Rejects a short password and a mismatch before Supabase. A Supabase rejection is one generic message and does not clear the flag. An RPC failure is reported, not hidden. On success `complete_first_login` runs and the role lands on its home |
| Sign-in form | `app/login/__tests__/sign-in-form.test.tsx` | Labels reach both controls, the return path is carried, the denied notice renders, axe clean |
| Change-password form | `app/change-password/__tests__/change-password-form.test.tsx` | Both fields labelled, a hidden `username` field for password managers, the length hint reaches the browser, axe clean |
| Quote helpers | `lib/__tests__/quotes.test.ts` | `isExpired`'s Nairobi day boundary (string compared, no Date/timezone parsing), a won or lost quote is never shown as expired. Every `quote_status` has a label and tone |
| Quotes query | `lib/quotes.integration.test.ts` | Against the real database with real signed-in sessions, not a mock: a salesperson's `mine` and `unassigned` filters return exactly the right rows, an admin's `all` sees everyone's (D87's read policy), search narrows to a match, a comma in a search term cannot reshape the filter into an `or` clause, `value`/`isPriced` are computed from the real `quote_items`, not a stored total. 6 tests |
| `QuoteFilters` | `components/__tests__/quote-filters.test.tsx` | Status, owner and search each push into the URL, so the result set actually changes; clearing a filter removes the param rather than setting it empty; search is debounced, not fired on every keystroke; the owner control hides itself when there is only one option; axe clean |
| Nav items | `lib/__tests__/nav-items.test.ts` | The role -> section list, and that it never lists a path the access map would then deny |
| `TopNav` | `components/__tests__/top-nav.test.tsx` | Only the current section carries `aria-current`, a nested path keeps its section, a shared stem does not, the Warm Red count shows on Quotes only and only when positive, axe clean. 6 tests |
| `AccountMenu` | `components/__tests__/account-menu.test.tsx` | Closed until clicked, offers exactly Change password and Sign out, Sign out goes through the server action not a link, Escape closes, axe clean open and closed. 5 tests |
| `PageHeading` | `components/__tests__/page-heading.test.tsx` | Title is the `h1`, eyebrow and lede show when given, the actions slot renders, axe clean. 4 tests |

## Design system, `packages/ui`

| Component | Notes |
|---|---|
| `Button` | Variants, and the ref forward a form needs to focus a failed field |
| `ConfirmDialog` | Escape, backdrop, focus placement, focus trap. 9 tests |
| `Field` `Input` `Select` `Textarea` | The label genuinely reaches the control, an error is announced not just coloured, the drawn chevron stays out of the click path, `optgroup` carries the taxonomy. 10 tests |
| `PasswordInput` | The toggle actually flips the input between `password` and `text`, both ways, from mouse and from the keyboard. It is `type="button"` so it never submits. Ref forwards to the input, `name` and `autoComplete` pass through. Axe clean masked and revealed. See the show/hide toggle on the dashboard auth screens |
| `PriceDisplay` | POA reads as deliberate. "fixed" with a null price falls back rather than rendering `KES null`. A stale `compare_at_price` cannot fake a sale |
| `ProductCard` `ProductGallery` | Correct on three images as well as six, since a fifth of the catalogue has only three |
| `ScrollMotion` | An element with no attribute is fully visible, so nothing is hidden waiting for JavaScript |
| `RoomStack` | Extracted from the storefront. Picks each product's application shot and only that, caps at four, renders nothing under two. Tests in both `@beco/ui` and the storefront wrapper |
| `LoadingState` | The skeleton keeps its shape but stops pulsing under `motion-reduce` |
| Tokens | Contrast verified by script, never assumed. Caught white on pure Warm Red at 4.38:1, below the AA floor |
| `cn` | `twMerge` actually resolves conflicting same-property utilities, for example `opacity-50` then `opacity-0`, which a raw string join did not: the D67 bug shape |

## Shared packages

| Package | File | Proves |
|---|---|---|
| `@beco/validation` | `__tests__/rate-limit.test.ts` | The sliding-window limiter: allows up to the limit then denies, per key, frees a slot as the oldest hit ages out, reports the exact wait, shares a store when given one. 7 tests. See D81 |
| `@beco/documents` | `email/__tests__/*.ts` | `buildQuoteConfirmationEmail` carries the reference and no totals, escapes the name, no em dashes. `sendQuoteConfirmation` no-ops without a key, sends with one, and reports a provider or transport error without throwing. 10 tests |

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
- Reduced motion: the code audit is done and `vitest-axe` runs on every component, but the OS
  setting has not been toggled on a device and looked at
- Lighthouse is wired in `ci.yml` but has not run green on a PR, and CI's page has no hero
  image so LCP and byte weight only warn there
- The interaction inventory in `docs/QA-CHECKLIST.md` is filled in but not yet walked on a device
- A quote has never been submitted from the actual browser form. The server action is covered
  against the real database; the form itself has not been used by a person
- Neither error page has been triggered by a real thrown error in a browser
- Linux CI cannot process HEIC until Sharp is built with libheif
