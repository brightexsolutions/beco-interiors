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

M5 section D (quotes) on `m5-quotes`, 17 September: list, counter create, detail
mutations, catalogue picker, PDF, priced-quote email, and dashboard home
figures. Catalogue editor (F, G, D89) landed the same day: `/products` is the
one screen, `/stock` redirects there, stock writes are audited, storefront
cards read as out when `stock_quantity` is 0.

M5 sections K and I (18 September): `/orders` (convert from a won quote, status,
mark paid, receipt PDF and email) and `/reports` (salesperson leaderboard and
conversion funnel, Nairobi month). pgTAP is **266 tests** across 22 files.
Integration is **26 tests** across 5 files.

M5 sections B and J (18 September): `/users` (Brightex admin, D38 lookup table
plus sheet) and `/announcements` (Beco admin authoring UI). Migration 45.

M5 settings, blog and audit (18 September): `/settings` for admins, `/studio/blog`
and `/audit` for Brightex or a granted user. Migration 46.

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
| `12_quote_claim_assign.test.sql` | Claim takes an unassigned quote. Assign is admin only and refuses `brightex_admin`. Stale lock refused. Anon cannot execute |
| `13_dashboard_summary.test.sql` | Nairobi month and day boundaries. Awaiting, won, conversion and leads figures. A role that cannot read orders contributes zero sales rather than an error |
| `14_quote_finalized_at.test.sql` | Won and lost stamp `finalized_at`. A later status change off those states clears it. The stamp is the decision time, not `created_at` |
| `15_quote_mutations.test.sql` | Counter quote, line edit, custom line, catalogue add on an existing quote, stale lock, someone else's quote, unpublished product, approval, reissue. Anon cannot execute the RPCs |
| `16_update_quote_lines.test.sql` | Batch save of two dirty lines under one lock. Other-owner refused. Stale lock refused |
| `17_reopen_quote.test.sql` | Lost to reviewing. Clears lost_reason and finalized_at. Other-owner refused. Won refused. set_quote_status cannot un-lose. Anon cannot execute |
| `18_quote_milestones.test.sql` | reviewing_at on insert. quoted_at and lost_at on status change. lost_at kept after reopen. reopened_at stamped |
| `19_add_catalogue_quote_lines.test.sql` | Two published products under one lock. Other-owner refused. Unpublished product refuses the whole batch. Stale lock refused. Empty selection refused. Product manager and anon cannot execute |
| `20_product_stock.test.sql` | `stock_quantity` and `low_stock_threshold` cannot go negative. Half units for `per slab` only, whole otherwise, zero is allowed. `beco_product_manager` and `beco_admin` write stock; `beco_sales`, `beco_editor` and anon cannot (RLS filters the UPDATE). A stock write is audited as `entity_type = products`. 16 tests. Migration 39 |
| `21_convert_quote_to_order.test.sql` | Line prices copy, including a discount. Second convert refused. Sales converts own only. Confirm, cannot go back to pending. Mark paid writes `paid_at` and does not decrement stock. Admin convert still attributes to the quote owner. Product manager and anon cannot execute. Cancelled cannot be marked paid. 23 tests. Migration 40 |
| `22_order_reports.test.sql` | Nairobi this-month leaderboard: raised, won, conversion. Product views and view-to-cart. Category WhatsApp. A role that cannot read `analytics_events` sees empty conversion rows. 8 tests. Migration 41 |
| `23_person_sales_review.test.sql` | Per-person invoiced and collected are that salesperson, not the team. Team invoiced still sums. Uses a custom range so live this-month orders cannot leak in. 3 tests. Migration 42 |
| `24_report_custom_range.test.sql` | Custom start and end dates include a quote inside the window and exclude one outside it. Inverted dates fall back to this month. Conversion uses the same bounds. 5 tests. Migration 43 |
| `25_refresh_order_money.test.sql` | A priced line writes the quote header. An unpriced line does not zero priced ones. Convert copies line money, not a stale 0. Reports invoiced follows the confirmed order. 6 tests. Migration 44 |
| `26_users_staff.test.sql` | Sales, product manager and editor cannot write `users`. Allowlisted Brightex can. Self role and self deactivate refused. Last `beco_admin` cannot be deactivated. Created user has `must_change_password`. Anon cannot execute `end_user_sessions`. Migration 45 |
| `27_announcements_admin.test.sql` | Anon sees a live row and not one that starts tomorrow. Once the window includes `now()`, anon can read it. Sales and product manager cannot write. Beco admin can, and the write is audited |
| `28_settings_blog_audit_grants.test.sql` | Sales cannot write settings; admin can. Anon cannot read bank details or the Brightex allowlist. Brightex can write a blog post, read the audit log and grant `can_write_blog` / `can_read_audit` to a salesperson; the grant opens audit reading but never blog write, Studio stays Brightex-only regardless of the flag (D42, migration 48). Product manager cannot grant either. 18 tests |
| `29_category_admin.test.sql` | Closes the write-side gap `06` left open: `beco_product_manager` and admins can create and update a category, sales and editor cannot (an INSERT denial raises 42501, an UPDATE denial just matches zero rows under USING, both asserted correctly). Anon cannot write. A rename records the former slug in `category_slugs` and survives a second rename; anon can read that history, which the storefront redirect depends on, and cannot write it. 12 tests. Migration 49, D91 |

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
| Canonical product slug | `lib/__tests__/canonical-product-slug.test.ts` | A former slug from `product_slugs` resolves to the current one. A current slug and a miss both return null, so the page 404s rather than redirecting to itself. A Supabase error throws. 4 tests |
| Social links | `components/__tests__/social-links.test.tsx` | A null URL DRAWS the icon without making it a link, so no control advertises an operation it cannot perform |
| Error pages | `app/__tests__/error-pages.test.tsx` | `error.tsx` and `global-error.tsx`: `reset()` fires, the digest reference shows only when present and is logged, the WhatsApp and phone routes are there. 8 tests |
| Home hero fallback | `components/__tests__/hero-static.test.tsx` | `HeroStatic` renders the same words and CTAs as `PinnedHero` when there is no photography. 4 tests |
| Gallery project types | `lib/__tests__/project-type-facets.test.ts` | Counts by type with real labels, ignores unclassified shots, returns nothing when nothing is classified. 4 tests. Plus `app/gallery/__tests__/metadata.test.ts` for D29 on `?type=` |
| Client showcase | `components/__tests__/client-showcase.test.tsx` | Renders nothing until a client is published and permitted; logo, name fallback, sector and project line. 5 tests |
| Launch banner | `components/__tests__/launch-banner.test.tsx` | Countdown to the date, reveal on the switch, confetti once per browser and skipped under reduced motion. 9 tests |
| Blog JSON-LD | `app/blog/[slug]/__tests__/blog-posting-schema.test.tsx` | Both ld+json blocks parse; headline, description, absolute image URL, author, publisher, omit-not-null, breadcrumb. 5 tests |
| Revalidate API | `app/api/revalidate/__tests__/route.test.ts` | Wrong secret is 401. Named product and category tags plus matching paths are revalidated. A path that is not site-relative is ignored. `/` revalidates as a layout so the announcement bar refreshes |

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
| Quote helpers | `lib/__tests__/quotes.test.ts` | `isExpired`'s Nairobi day boundary (string compared, no Date/timezone parsing), a won or lost quote is never shown as expired. Every `quote_status` has a label and tone. `quoteMilestones` lists Raised only until later stamps exist, and keeps Lost after reopen |
| `QuoteDates` | `components/__tests__/quote-dates.test.tsx` | Raised only when new. Lost and Reopened both show after a come-back. Axe clean |
| Quotes query | `lib/quotes.integration.test.ts` | Against the real database with real signed-in sessions, not a mock: a salesperson's `mine` and `unassigned` filters return exactly the right rows, an admin's `all` sees everyone's (D87's read policy), search narrows to a match, a comma in a search term cannot reshape the filter into an `or` clause, `value`/`isPriced` are computed from the real `quote_items`, not a stored total. 6 tests |
| `QuoteFilters` | `components/__tests__/quote-filters.test.tsx` | Status, owner and search each push into the URL, so the result set actually changes; clearing a filter removes the param rather than setting it empty; search is debounced, not fired on every keystroke; the owner control hides itself when there is only one option; axe clean |
| `QuoteLines` | `components/__tests__/quote-lines.test.tsx` | One Save on the heading writes dirty lines through `updateQuoteLines`. Unsaved + Changed appear when qty or price change. Add from catalogue opens a dialog, multi-select submits `addCatalogueLines`. Custom form is present. Read-only hides the picker. Axe clean |
| `PdfPreview` | `components/__tests__/pdf-preview.test.tsx` | Fetches the file, paints page 1 as a canvas, never an iframe. HTTP and parse errors show a Notice. Unmount after load does not throw. Zoom in widens, Zoom out disabled at 100 percent, Zoom in disabled at 200 percent. Axe while loading |
| `QuoteDocumentPanel` | `components/__tests__/quote-document-panel.test.tsx` | View opens the dialog, `PdfPreview` loads the PDF, Download is a real file link, Email is a real form. Dirty quantities are written through `updateQuoteLines` before the PDF fetch. Axe clean |
| `CataloguePicker` | `components/__tests__/catalogue-picker.test.tsx` | Button opens a dialog. Search is focused. Range select lists Hardware and Lighting, not only stone. Multi-select, Add disabled until a tick, filter by typing, disabled reason shown. Axe clean |
| Catalogue search helpers | `lib/__tests__/catalogue-search.test.ts` | Ranges split into ungrouped pillars and Drive folders under Hardware. Hits group by category so handles are not dumped under stone |
| `QuoteActions` | `components/__tests__/quote-actions.test.tsx` | Claim, Quoted, Mark lost ConfirmDialog, Approve gated, Assign on select change, Reopen ConfirmDialog on lost, Convert to order ConfirmDialog on won, View order once converted, axe |
| Order helpers | `lib/__tests__/orders.test.ts` | Milestones list only the stamps that exist. Mutation messages name a stale lock and do not leak SQLSTATE. Period and n/a rate labels |
| Orders query | `lib/orders.integration.test.ts` | Against local Postgres: convert copies the override price, stock stays put, the new order appears on `mine`, confirm then mark paid stamps `paid_at` |
| `OrderFilters` | `components/__tests__/order-filters.test.tsx` | Status and Website source write into the URL. Search has no visible Search label. One row from lg. Axe |
| `OrderResults` | `components/__tests__/order-results.test.tsx` | Desktop table plus phone cards, explicit View, Website not Web, pagination, empty state with no New order. Axe |
| `OrderActions` | `components/__tests__/order-actions.test.tsx` | Confirm on pending, Fulfil on confirmed, Mark paid and Cancel order ConfirmDialogs named for the order. Axe |
| `OrderDates` | `components/__tests__/order-dates.test.tsx` | Raised only until later stamps. Paid does not imply fulfilled. Axe |
| `OrderLines` | `components/__tests__/order-lines.test.tsx` | Catalogue strike sits on the item, not on the line total. Totals show once priced. POA otherwise. Axe |
| `OrderDocumentPanel` | `components/__tests__/order-document-panel.test.tsx` | Renders nothing until paid. View receipt opens `PdfPreview`, Email form, Download is a real file link. Empty address still offers Email. Axe |
| Order mutations | `app/(app)/orders/__tests__/actions.test.ts` | Session re-check on convert. Stale lock sentence. Mark paid goes through `mark_order_paid`. Receipt email refused until paid, then `sendReceipt` |
| Order PDF helper | `lib/__tests__/order-pdf.test.ts` | Download uploads bytes and writes a `documents` row typed receipt |
| Order PDF route | `app/(app)/orders/[reference]/pdf/__tests__/route.test.ts` | 409 until paid. Preview is inline. `?download=1` stores the file |
| `ReportFilters` / `ReportResults` | `components/__tests__/report-results.test.tsx` | Period writes the URL and sits on the Reports title row. Custom writes `from` and `to`. View PDF opens a dialog and `PdfPreview` fetches the live document. Review is Overall or one salesperson. Download is `?download=1`. Invoiced and collected are two StatCards, 2 by 2 on a phone. Tabs switch Sales / Products / Categories and write `?view=`. Empty states stay on the active view. Axe |
| `ReportBars` | `components/__tests__/report-bars.test.tsx` | Leader fill is charcoal. Values can be formatted |
| Report helpers | `lib/__tests__/reports.test.ts` | `parseView`, `parsePersonId`, `parseReportQuery`, team conversion, funnel totals |
| Report PDF helper | `lib/__tests__/report-pdf.test.ts` | Filename carries the period, and the name on an individual review. Input copies on-screen figures or one person |
| Report PDF route | `app/(app)/reports/pdf/__tests__/route.test.ts` | Preview is inline. `?download=1` is an attachment. Person review is named. Unknown person 404. Bad person 400. Period from the query, including custom `from`/`to`. Inverted custom 400. 500 on render failure. No `documents` row |
| `@beco/validation` report range | `packages/validation/src/__tests__/dashboard-report.test.ts` | Named months need no dates. Custom needs both. Inverted and over-year ranges refused |
| `@beco/validation` order schemas | `packages/validation/src/__tests__/dashboard-order.test.ts` | Forward statuses, unknown status refused, convert needs the quote lock, receipt email needs an address |
| Quote mutations | `app/(app)/quotes/__tests__/actions.test.ts` | Session re-check, stale lock sentence, lost-reason before the RPC, counter path refuses `web`, catalogue add goes through `add_catalogue_quote_line`, batch add through `add_catalogue_quote_lines`, reopen goes through `reopen_quote` |
| Quote PDF helper | `lib/__tests__/quote-pdf.test.ts` | Download uploads bytes and writes a `documents` row. Preview does not |
| PDF route | `app/(app)/quotes/[reference]/pdf/__tests__/route.test.ts` | Preview is inline. `?download=1` is an attachment. Unauthenticated is bounced |
| Dashboard summary | `lib/__tests__/dashboard-summary.test.ts` | Card wording and tone. Warm Red only on a breached SLA, never on a merely non-zero number. Low-stock count is named on the catalogue card and stays plain |
| WhatsApp link | `lib/__tests__/whatsapp.test.ts` | Kenyan mobiles to `wa.me`. Helper exists; the document panel does not yet use it |
| `NewQuoteForm` | `components/__tests__/new-quote-form.test.tsx` | Catalogue dialog, custom item, Save disabled until a line, axe |
| `NewQuoteFab` | `components/__tests__/new-quote-fab.test.tsx` | Link to `/quotes/new`, stays labelled |
| Quote mutations (db) | `lib/quote-mutations.integration.test.ts` | Counter quote against local Supabase: row, items, lock |
| Nav items | `lib/__tests__/nav-items.test.ts` | The role -> section list, and that it never lists a path the access map would then deny. Product manager sees Catalogue at `/products`, not a separate Stock item. `navContext` names section roots and nested screens |
| `AppShell` | `components/__tests__/app-shell.test.tsx` | Licensed still behind the chrome. Section nav exposed. Appearance toggle present. White header stays in flow. Only the breadcrumb docks on a phone. Axe |
| `ThemeToggle` | `components/__tests__/theme-toggle.test.tsx` | Click adds `html.dark` and stores the choice, click again restores light. Syncs after mount when dark is already stored. Axe |
| Dashboard theme | `lib/__tests__/dashboard-theme.test.ts` | apply and toggle write the class and localStorage |
| `ShellContext` | `components/__tests__/shell-context.test.tsx` | Hidden while the header is on screen. Docks after, with no `lg:hidden`. Nested path shows section / page, section is a real list link, New quote labelled, axe. 6 tests |
| Stock redirect | `app/(app)/stock/__tests__/page.test.ts` | `/stock` redirects to `/products` so old links do not 404 |
| Categories redirect | `app/(app)/categories/__tests__/page.test.ts` | `/categories` redirects to `/products`, same shape as `/stock`, since ranges folded into the catalogue (D100) |
| Product helpers | `lib/__tests__/products.test.ts` | Low stock is at-or-below the mark and still above zero. Zero is out. Uncounted (NULL) keeps the stored availability |
| Product list query | `lib/products.integration.test.ts` | Against local Postgres: product manager sets half-slab stock, SEO and a rename (old slug lands in `product_slugs`). Sales cannot write stock. Product manager can insert an unpublished draft. Soft delete leaves the quote line and its price. The `categoryIds` filter matches a product under the given category and excludes it under any other, self-contained fixture. 5 tests |
| Product actions | `app/(app)/products/__tests__/actions.test.ts` | Session re-check. POA with a price is refused before the write. Save writes stock and SEO then POSTs storefront revalidation. Stale lock named. Soft delete unpublishes and stamps `deleted_at`. Create inserts an unpublished draft. Add photograph without a file is refused |
| Product photographs | `lib/__tests__/product-photo.test.ts` | Sharp writes 400/800/1600 webp plus a blur placeholder. A non-image buffer is refused |
| R2 image proxy | `app/api/img/__tests__/route.test.ts`, `lib/__tests__/product-storage.test.ts` | Dashboard `/api/img` streams a webp. Traversal keys are refused |
| Storefront revalidate | `lib/__tests__/storefront-revalidate.test.ts` | Always refreshes the dashboard list. Posts tags and paths when the secret is set. Skips the HTTP call when it is missing so a local save still works. `revalidateStorefrontPaths` busts `/announcements` and the storefront root |
| `ProductFilters` | `components/__tests__/product-filters.test.tsx` | Availability, published and stock each push into the URL. Clearing a filter removes the param. One row from lg. Axe clean |
| `ProductResults` | `components/__tests__/product-results.test.tsx` | Desktop table plus phone cards, explicit Edit, POA and low-stock, SKU, create and edit sheets, axe. 7 tests |
| `ProductEditor` | `components/__tests__/product-editor.test.tsx` | Delete ConfirmDialog names the product and says quotes keep their line. Add spec is a real control. SKU field present. Save submits the lock token and, on success only, fires `onSaved` to close the sheet; a rejected save does not. Axe clean. 7 tests |
| `ProductCreate` | `components/__tests__/product-create.test.tsx` | Slug fills from the name. Create product submits. Axe clean |
| `ProductImages` | `components/__tests__/product-images.test.tsx` | Remove ConfirmDialog names the product. Add photograph is a real file control. Axe clean |
| `NewProductFab` | `components/__tests__/new-product.test.tsx` | Charcoal FAB to `/products?new=1` on desktop and on a phone |
| Category grouping helper | `lib/__tests__/products.test.ts` | `groupCategoryOptions` nests a range under its group in arrival order, keeps a childless top level category like Lighting selectable on its own, and never lists a range itself at the top level |
| Category id expansion | `lib/__tests__/categories.test.ts` | `categoryIdsInSelection`, pure, no database: null for no selection, a childless group matches itself, a group with children expands to every child and never the group id, a range matches its own id, an id absent from the tree passes through unchanged rather than dropping the filter. 5 tests |
| Category tree query | `lib/categories.ts` | No dedicated unit file for the fetch itself: exercised through `CatalogueRanges`'s fixtures and the actions integration below. `fetchCategoryGroupOptions` excludes the row being edited so a category cannot become its own parent from the UI |
| Category actions | `app/(app)/categories/__tests__/actions.test.ts` | Session re-check. Create returns the slug so the editor can open, looks up the parent slug for revalidation. Update busts the current and former slug. Stale lock named. Delete refuses and never issues the DELETE when products or child ranges are still filed under it, naming which. Bad slug refused before any write. 10 tests |
| Storefront revalidate, categories | `lib/__tests__/storefront-revalidate.test.ts` | `revalidateCategory` busts `/shop`, the range, its former slug and its parent group; omits what does not apply |
| `CatalogueRanges` | `components/__tests__/catalogue-ranges.test.tsx` | Every group and its ranges render as the identical pill, a group's count sums its ranges rather than its own always-0 figure, a group is ordered directly before its own ranges (the only cue left that they're related, once every pill takes the same form), a group pill and a range pill assert byte-identical className, the "Ranges" heading collapses and re-expands the whole panel (`aria-expanded`), draft mark named, a click pushes `?category=` rather than opening the sheet, the selected control carries `aria-pressed`, "All products" clears the filter, explicit Edit link per pill at `?range=` (not `?edit=`), create at `?newRange=1`, empty state named, axe. 13 tests |
| `CategoryEditor` | `components/__tests__/category-editor.test.tsx` | Save submits and, on success only, fires `onSaved` to close the sheet; a rejected save does not. Delete ConfirmDialog names the range. Delete disabled with the blocking count in its own label when products or children exist. Parent select locked, with the reason, when the group has children. Axe. 8 tests |
| `CategoryCreate` | `components/__tests__/category-create.test.tsx` | Slug fills from the name. Defaults to a top level group, can be filed under one instead. Cancel returns without creating anything. Axe |
| User helpers | `lib/__tests__/users.test.ts` | Issued password length. Duplicate email, last-admin, sales-only website sentences. `parseStaffPublicPhoto` |
| Users query | `lib/users.integration.test.ts` | Seeded Brightex admin inserts a flagged sales row and can set `is_public` plus `public_photo`. Product manager cannot deactivate anyone |
| User actions | `app/(app)/users/__tests__/actions.test.ts` | Session re-check. Password not stored on the profile insert. Duplicate email cleans up the auth user. Self role refused. Deactivate revokes sessions. Director cannot be listed on `/team`. Photograph without a file is refused |
| `UserFilters` | `components/__tests__/user-filters.test.tsx` | Role writes the URL. One row from lg. Axe |
| `UserResults` | `components/__tests__/user-results.test.tsx` | Explicit View, Actions column, sheet from `?user=`, axe |
| `UserEditor` | `components/__tests__/user-editor.test.tsx` | Deactivate ConfirmDialog names the person. Own row hides those controls. Photograph file control and named remove. Show on /team hidden for a director. Axe |
| `UserCreate` | `components/__tests__/user-create.test.tsx` | Issued password shown once, Copy password writes the clipboard |
| `NewUserFab` | `components/__tests__/new-user.test.tsx` | Charcoal FAB to `/users?new=1` |
| Announcement helpers | `lib/__tests__/announcements.test.ts` | Live / scheduled / ended / off. Nairobi datetime-local round trip |
| Announcements query | `lib/announcements.integration.test.ts` | Tomorrow is hidden from anon, then visible once the window includes now. Product manager cannot insert |
| Announcement actions | `app/(app)/announcements/__tests__/actions.test.ts` | Session re-check. Nairobi instants. Storefront root revalidated |
| `AnnouncementFilters` | `components/__tests__/announcement-filters.test.tsx` | Type writes the URL. One row from lg. Axe |
| `AnnouncementResults` | `components/__tests__/announcement-results.test.tsx` | Explicit Edit, sheet from `?edit=`, axe |
| `AnnouncementEditor` | `components/__tests__/announcement-editor.test.tsx` | Preview updates from the title. FormSections present. Save submits. Axe |
| `NewAnnouncementFab` | `components/__tests__/new-announcement.test.tsx` | Charcoal FAB to `/announcements?new=1` |
| Settings helpers | `lib/__tests__/settings.test.ts` | Email lists, VAT numbers, storefront paths only for public-facing keys |
| Settings query | `lib/settings.integration.test.ts` | Irene can write VAT. Sam cannot write blog until Brightex grants it |
| Settings actions | `app/(app)/settings/__tests__/actions.test.ts` | Session re-check. VAT stored as a fraction. Irene cannot grant. Brightex can |
| `SettingsForm` | `components/__tests__/settings-form.test.tsx` | Save on the title row, Anniversary launch Brightex-only, Payments tab, axe |
| `SettingsGrants` | `components/__tests__/settings-grants.test.tsx` | Allow audit ConfirmDialog names the person |
| Blog helpers | `lib/__tests__/blog.test.ts` | Slug, reading time, Gemini text extraction |
| Blog actions | `app/(app)/studio/blog/__tests__/actions.test.ts` | Generate returns a draft. Save inserts and busts `/blog` |
| `BlogFilters` / `BlogResults` / `BlogEditor` / `BlogBodyEditor` / `NewBlogFab` | `components/__tests__/blog-*.test.tsx` | Filters, Edit, Generate, markdown toolbar, preview, FAB |
| `AuditFilters` / `AuditResults` | `components/__tests__/audit-results.test.tsx` | Filters, View sheet with labelled before / after, axe |
| Settings / blog / audit grants pgTAP | `28_settings_blog_audit_grants.test.sql` | Sales cannot write settings or blog. Irene can write settings, not blog or audit. Brightex can grant. Granted sales can write blog and read audit |
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
| `ProductCard` `ProductGallery` | Correct on three images as well as six, since a fifth of the catalogue has only three. Card reads Out of stock when `stockQuantity` is 0 |
| `ScrollMotion` | An element with no attribute is fully visible, so nothing is hidden waiting for JavaScript |
| `RoomStack` | Extracted from the storefront. Picks each product's application shot and only that, caps at four, renders nothing under two. Tests in both `@beco/ui` and the storefront wrapper |
| `LoadingState` | The skeleton keeps its shape but stops pulsing under `motion-reduce` |
| Tokens | Contrast verified by script, never assumed. Caught white on pure Warm Red at 4.38:1, below the AA floor |
| `cn` | `twMerge` actually resolves conflicting same-property utilities, for example `opacity-50` then `opacity-0`, which a raw string join did not: the D67 bug shape |
| `DropdownMenu` | Trigger pointerdown asks to open. Items fire `onSelect`. `asChild` keeps a real link. Escape asks to close. Rows are `min-h-11`. The panel is `rounded-panel` with no shadow and no `animate-in`. Asserted in controlled `open` state because a Radix trigger click hangs in jsdom. Axe on the closed trigger. 7 tests. D88 |
| `Tabs` | Click reveals the named panel. Active tab is a charcoal underline, not a muted pill. Axe. 3 tests |
| `Dialog` | Escape, backdrop, focus return, optional `initialFocusRef`. Locks the page behind so a wheel does not scroll it. 8 tests. Stays plain for jsdom |
| `Sheet` | Bottom sheet on a phone, right rail on desktop. Close and Escape actually close. Footer stays out of the scrolling body. 7 tests. D38 |
| `useScrollLock` | `lib/__tests__/use-scroll-lock.test.tsx` | Locks html and body. Cancels a wheel on the page. Allows a wheel inside a panel scroller |
| `Fab` | Labelled charcoal pill, `fabClasses` for genuine links. 5 tests |
| `Panel` `Pagination` `Skeleton` `BackLink` `EmptyState` | Shape of list / create / loading screens. Pagination hidden on one page |
| `toast()` | Done / Failed / Note on an opaque white panel. `useActionToast` for `{ ok }` / `{ error }` |

## Shared packages

| Package | File | Proves |
|---|---|---|
| `@beco/validation` | `__tests__/rate-limit.test.ts` | The sliding-window limiter: allows up to the limit then denies, per key, frees a slot as the oldest hit ages out, reports the exact wait, shares a store when given one. 7 tests. See D81 |
| `@beco/validation` | `__tests__/money.test.ts` | D50 split: 65,000 contains 8,965.52 VAT inside, not 10,400 on top. Rounds after every operation |
| `@beco/validation` | `__tests__/dashboard-quote.test.ts` | Counter create, line batch, catalogue add, lost-reason schemas |
| `@beco/validation` | `__tests__/dashboard-product.test.ts` | Half-unit stock for slabs, whole otherwise, never negative. Blank stock is uncounted, not zero. POA cannot carry a price. SKU keeps a handle code and blank is none. Specs drop blank rows |
| `@beco/documents` | `email/__tests__/shell.test.ts` | Shared branded shell, 18 tests. Escapes markup in copy, labels, values and the inbox preheader. Sharp-cornered reference box, no border-radius. Warm Red on the eyebrow, not heading or body copy. Full document (doctype, html, head, body), not a fragment. Hidden preheader. Logo from `STOREFRONT_URL`, falling back to `https://www.beco.co.ke`, never a relative path. Wordmark is real text beside the mark. Footer phone and address. Light-only colour-scheme meta tags. No em dashes |
| `@beco/documents` | `email/__tests__/quote-confirmation.test.ts` | Reference in subject and both bodies. First-name greeting, blank-name fallback. No items or totals on an unpriced request. Name escaped. No em dashes. Wrapped in the branded shell |
| `@beco/documents` | `email/__tests__/quote-priced.test.ts` | Reference in subject and both bodies. Mentions the attached PDF and validity date. An unpriced quote never prints a KES figure. Name escaped. No em dashes. Wrapped in the branded shell |
| `@beco/documents` | `email/__tests__/receipt.test.ts` | Order reference in subject and both bodies. Says payment is recorded and the receipt is attached. Name escaped. No em dashes. Wrapped in the branded shell |
| `@beco/documents` | `email/__tests__/send.test.ts` | Confirmation, priced quote and receipt are each a no-op without `RESEND_API_KEY`. With a key, confirmation sends the reference to the recipient, priced quote and receipt attach the named PDF. `QUOTE_FROM_EMAIL` is honoured. Provider and transport errors return `{ sent: false }` rather than throwing |
| `@beco/documents` | `pdf/__tests__/quote-document.test.ts` | Bytes are a PDF. Unpriced never prints `KES 0.00`. From block is Beco Interiors Limited. Till, Paybill and Send money labels print when those channels are set. 15 lines span pages. No em dashes. Receipt title is Receipt, not Quotation |
| `@beco/documents` | `pdf/__tests__/report-document.test.ts` | Sales review PDF carries period, figures and names. Empty tables say so. No em dashes |

## Import pipeline, `tools/drive-import`

| File | Proves |
|---|---|
| `roles.test.ts` | Role from the TOKEN SET, not token order, so `SLAB ON STAND` and `STAND ON SLAB` agree. A filename matching nothing is `unknown`, never guessed |
| `misnest.test.ts` | A product folder nested inside another product folder is skipped, not merged |
| `mixed.test.ts` | A folder NAMING several products inside itself is detected and reported, never split. Built from the real `DELFONE 12MM` folder. The false positive cases matter most: a single odd filename, a finish word, a folder repeating its own name |
| `classify.test.ts` | New, changed, unchanged and missing |
| `quality.test.ts` | Size budgets, and the reports that come with them |
| `slug.test.ts` `plan.test.ts` `decode.test.ts` | Slug rules, plan assembly, HEIC detection by MAGIC BYTES rather than extension |
| `merge-images.test.ts` | `mergeProductImages` (D90): an unchanged file's own prior entry is carried forward rather than dropped when new photos are added alongside it, the actual bug that shipped. A file removed from Drive entirely is dropped. Empty-to-populated works cleanly, the common case for a folder that just got its first photos. A legacy entry with no `driveFileId` falls back to a same-role positional match. A file that needed downloading this run but failed processing is never backfilled from a stale entry. `parseStoredImages` drops a malformed entry rather than carrying it through. 9 tests |
| `run.test.ts` | `productWriteFields` (D90): an existing product's write never includes `name` or `category_id`, so a dashboard rename or recategorisation survives a re-import; a new product's insert includes both |

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
- `pnpm vitest run` with no `--project` filter occasionally fails one or two `integration`
  files on a fixture email already existing, confirmed 23 September to be resource contention
  from every project's files racing the same local Postgres and GoTrue at once, not a real bug:
  `pnpm vitest run --project integration` alone is consistently green. `ci.yml` already runs
  `test:unit`, `test:component` and `test:dashboard` as separate steps before `test:integration`
  runs alone in its own step, so CI itself is not exposed to this. Only a local
  `pnpm test` / `pnpm vitest run` with no project filter can hit it
