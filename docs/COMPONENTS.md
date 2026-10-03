# Component Inventory

Everything shared lives in `@beco/ui`. **If a pattern appears twice, it belongs here.**
Duplicated components drift, and drifted components are how a design system quietly dies.

`packages/ui/src/components/button.tsx` is the reference. Follow its shape: `cva` for variants,
`cn` for merging, tokens for every value, no shadcn default surviving.

**shadcn is dashboard only, never the storefront.** New dashboard widgets
may start as a shadcn copy-paste into this package. The CLI does not run
against `apps/dashboard` or `apps/storefront`. Storefront screens keep
using the domain primitives (`PriceDisplay`, `ProductCard`, `RoomStack`).
They do not grow Radix menus and they do not take a shadcn look.
Existing `ConfirmDialog`, native `Select`, `Dialog`, and `AccountMenu`
(plain elements, jsdom-testable) stay unless a replacement here keeps the
same tests and the same Beco look. `DropdownMenu` is the Radix reference
for new dashboard menus (D88).

Status: **B** built, **S** stubbed, **P** planned.

## Foundation

| Component | Status | Notes |
|---|---|---|
| `Button` | **B** | Reference component. Primary uses `warm-red-deep`, never pure warm red, which fails AA with white text |
| `Fab` | **B** | Floating action. Charcoal pill, labelled, fixed to the bottom right. Desktop and phone. Not a circular plus. `fabClasses` for genuine links. New quote and New product. **5 tests** |
| `ConfirmDialog` | **B** | **Replaces `window.confirm` entirely.** Rewritten from the M3 scaffold, which rendered unconditionally and had a Cancel button wired to nothing. **9 tests** covering escape, backdrop, focus placement and the trap. Stays a plain element on purpose (jsdom, D88) |
| `Dialog` / `Sheet` | **B** | Plain modal, same behaviour as ConfirmDialog (escape, backdrop, focus return, tab trap), no Radix, so it is testable in jsdom. Dialog is used for quote PDF preview and the catalogue picker. **Sheet** is the D38 detail rail: bottom sheet on a phone, right rail on desktop, used by the products editor. Optional `initialFocusRef` on Dialog lands focus on search. A wheel on the overlay does not scroll the page behind. Dialog **8 tests**. Sheet **7 tests**. |
| `DropdownMenu` | **B** | Dashboard only. First Radix widget under D88. Restyled onto Beco tokens: `rounded-panel`, no shadow, no zoom animation, 44px rows. New menus start here. AccountMenu stays plain. **7 tests**. The storefront does not import this |
| `Tabs` | **B** | Dashboard only. Radix, restyled: charcoal underline, 44px, 16px, no muted track. Used by `/reports`. **3 tests**. The storefront does not import this |
| `toast()` | **B** | **Replaces `window.alert`.** Sonner headless. Opaque white panel (`rounded-panel`, `shadow-panel`), tone named in words (Done / Failed / Note) never a tinted wash. `useActionToast` for server-action `{ ok }` / `{ error }`. Dashboard toasts sit on the white content panel, below the chrome. **8 tests** |
| `Field` | **B** | Label, hint, error. The CONTROL is passed in, so one wrapper serves an input, a select, a textarea or a radio group without a variant for each. Errors carry `role="alert"`, so they are announced rather than only coloured. Written twice before this, in the quote form and the shop filter bar |
| `Input` `Textarea` `Select` | **B** | 44px minimum, `text-base` so iOS does not zoom on focus. `Select` is NATIVE with `appearance-none` and a drawn chevron, not Radix: it needs `optgroup` to carry the nested taxonomy, and a native menu is better on a phone than a rebuilt one. All three forward refs. **10 tests** |
| `PasswordInput` | **B** | `Input` plus a show/hide toggle. A `'use client'` island because the visibility is local state. The toggle is `type="button"` so it never submits, its label names the action it will perform ("Show password" while hidden), and it is a 44px target. **6 tests**: the type actually flips both ways, mouse and keyboard, ref and props pass through, axe clean in both states. Used on the dashboard auth screens |
| `QuantityStepper` | **B** | **The 12 tap budget depends on this.** Big 44px targets throughout. Static value by default, an editable number field where typing is worth it, its native spinner dropped since it ate into the same box the digits needed. The unit label inherits its colour and dims it rather than a fixed grey, since no one neutral tone clears AA on both a white page and the quote list's charcoal panel. Written twice before this, on the product page and in the quote list, and the two copies had already drifted. Used by `AddToQuote` and `QuoteBuilder`. **13 tests** |
| `TableToolbar` | **B** | The row above every list: search left, filters beside it, the result count right as a live region, so a filter change is announced and proven. Quotes, Orders and Catalogue sit in a `Panel` under one, D106 |
| `TrendBars` / `StageBar` / `RankedBars` | **B** | `@beco/ui/charts`, Recharts under the house method (dataviz skill). The brand is near monochrome, so every chart is the emphasis form: the series that is the point in charcoal, context in a light neutral, Warm Red for one attention stage only; a legend for two series, direct labels, a tooltip in text tokens, and a visually hidden table of the figures in every chart. Colours read from the live tokens, so dark mode follows. Still under reduced motion, drawn only after mount so hydration matches. **10 tests** |
| `ChipGroup` | **B** | A labelled row of pill toggles, each with an optional count, `aria-pressed` on the chosen one, an optional clear value. The phone form of a filter: every option one tap away where a native select hides them behind a sheet. Dashboard quote, order and catalogue filters on a phone, D102. **5 tests** |
| `useKeepValuesSubmit` | **B** | Hook. Submits a form to a `useActionState` dispatcher without React 19's automatic reset of `<form action>`, so a refused save keeps what was typed. Pending state still works; native validation still runs first. Every dashboard form with free text uses it; a form that should empty after a successful add resets itself on the success state. **4 tests** |
| `KeyboardAwareFocus` | **B** | Mounted once in each app's root layout. When the on screen keyboard opens it scrolls the focused text field into the part of the screen the keyboard leaves, using `useVisualViewport` (a keyboard is a visual viewport more than 150px shorter than the layout viewport). `Dialog` pins itself to the same area. No form can forget it, D102. **10 tests** |
| `Notice` | **B** | States a fact at the moment it matters in weight, not a box: `info` inherits the ambient text colour, `alert` (announced) draws from the functional error token. A coloured left border on a tinted fill was tried first and dropped, it is a recognised generic default and it could not carry one accent colour safely across both the quote page's white form and its charcoal list panel. **4 tests** |

## Domain

These carry business rules, so they exist once and are tested once.

| Component | Status | Notes |
|---|---|---|
| `PriceDisplay` | **B** | **The most important component on the storefront.** Renders fixed price, POA, or a sale with a struck through `compare_at_price`. `price_display_mode` is separate from `availability` precisely so this can never be ambiguous, and ambiguity here costs sales |
| `AvailabilityBadge` | **B** | In Stock, Pre-Order, POA. Warm Red only for genuine attention |
| `ProductCard` | **B** | No border, no shadow. Fixed 4:5 frame, image scales on hover, red hairline draws under the name. With no photograph (D82) the frame is a charcoal specimen plate naming the stone, `aria-hidden` so the heading link stays the one accessible name |
| `ProductGallery` | **B** | Ordered by image role: slab, on_stand, bookmatch, application. **Must read correctly on three images as well as six**, since five products have no on stand shot |
| `QuoteActions` | P | The three actions, ranked identically everywhere: Request a quote, WhatsApp, Call |
| `MobileActionBar` | **B** | Storefront. | Mobile. **Never sits under the on screen keyboard.** Verified on real iOS and Android |
| `AnnouncementBar` | **B** | Storefront only. **Rotating strip** since D82: cycles every live announcement, then the phone, then "Email us:". A `'use client'` component with a fixed single-line height so the roll costs no CLS; the outgoing line lifts up and out as the incoming one rises in; pauses on hover; no rotation under `prefers-reduced-motion`. `buildAnnouncementItems` lives in `lib/announcements.ts` so the RSC layout can assemble the items server side. Not dismissible, per D49 |

## Storefront only

Not in `@beco/ui`, because a second surface has no use for them yet. Moved the moment one does.

| Component | Status | Notes |
|---|---|---|
| `RangeBrowse` | **B** | The taxonomy made visible: six top level ranges with a real photograph each and their child ranges as links. A range with no photography gets a charcoal plate with its name on it rather than a grey box with an icon, which is honest about the stock being real and the picture not being taken |
| `ShopControls` | **B** | Search, a grouped range select, finish and sort, URL as the source of truth so the grid stays server rendered. Active filters stated back as removable chips. Sticky on every size since D82. **Mobile**: search plus a "Filters" button that opens a panel with full-width controls and a "Show N results" close; the controls are the same elements at both sizes, `display: contents` from `lg` up. Revises D65 |
| `ProductGrid` | **B** | One grid for the home page, `/shop` and every category, so a card cannot quietly differ between them |
| `RoomStack` (`@beco/ui`) | **B** | The self dealing stack: fan, swipe, caption plate, and the static stacked transform that is also the reduced-motion state. Extracted 5 September, takes `RoomStackCard[]`. A thin `apps/storefront` `RoomStack` wrapper is the only place that still knows `next/image` and `CatalogueProduct`. Tests in both packages |
| `PageHeader` | **B** | Red rule, eyebrow, Cormorant title, lede. The site's one section opening |
| `HeroStatic` | **B** | The home hero when there is no photography for `PinnedHero`: same eyebrow, headline, lede and CTAs on flat charcoal, server rendered, no animation. Guarantees the page never opens with no hero. **4 tests** |
| `ClientShowcase` | **B** | The "Delivered for" section on `/gallery`, from the `clients` table. Renders nothing until a row is both published and permitted, RLS's own gate. **5 tests** |
| `LaunchBanner` | **B** | D80. Takes the announcement slot for the anniversary campaign: a live countdown to `settings.site_launch_at`, then a one-time confetti reveal when `site_launch_live` is thrown, `localStorage` gated, skipped under reduced motion. **9 tests** |

## Dashboard

| Component | Status | Notes |
|---|---|---|
| `Panel` | **B** | Dashboard work surface: white, 1px `neutral-200` rule, `rounded-panel`. Optional header with title and action. Use this for list tables, inspector rails, and create-flow columns so screens do not invent their own cards. **3 tests** |
| `DataTable` | **B** | Desktop table: sortable columns with small-caps headers and the sort state in the icon and `aria-sort`, a sticky header, row hover, numeric columns flush right in tabular figures, an explicit actions column (never a click-anywhere row), an empty state. Restyled 3 October, D106. **Mobile treatment is per table, not one blanket rule**: quotes and orders become full cards because each row is a decision, stock and products keep a reduced column table with a detail sheet because those are scanning tables. Filtering and search are the caller's, since they change the row set and that is screen specific. **9 tests** |
| `Pagination` | **B** | Previous / Next for a sliced list. Caller owns the page and passes numbers from `paginate()`. Hidden when one page holds everything, so it is not decoration. **5 tests**. `paginate` itself: **5 tests** |
| `StatCard` | **B** | States a number, its comparison, and what it implies. A number with no comparison is decoration. `tone` is `plain`, `attention` (Warm Red, reserved for a figure that needs action today), `positive` (the functional success token, never the brand red) or `inverse`. `compact` is the shorter reports size. Since D102 it can also carry a `delta` (direction, label, and whether up is good), a `meter` (a clamped progress bar with `role="meter"`), `segments` (a stacked split with its legend), and an `action` that makes the whole card one link to the list behind the number. Display figures use lining numerals, so a Cormorant 1 never reads as an I. **13 tests** |
| `StatusPill` | **B** | Quote and order lifecycle states, coloured by what they mean: `neutral`, `positive` (success token), `attention` (Warm Red, genuinely needs action), `muted` (a closed, no longer active state). The caller supplies the tone; this component knows nothing about `quote_status` or `order_status`. **5 tests** |
| `LiveUpdateBanner` | P | "3 new quotes, show". **Never inserts rows into a list under the user's finger.** See D46 |
| `LastUpdated` | P | "Updated 2 minutes ago, Refresh". Honest about staleness and gives control back |
| `AuditEntry` | P | Before and after, readable by a human |
| `SignInForm` | **B** | `apps/dashboard/src/app/login`. Password sign in against Supabase Auth, one message for every failure so a wrong password and an unknown email cannot be told apart. Rate limited, D81. Show/hide password via `PasswordInput`. Built for D80, extended in M5 section A |
| `AuthShell` | **B** | `apps/dashboard/src/components`. The frame for `/login` and `/change-password`: a charcoal brand panel over Beco's own `showroom.mp4` with a charcoal wash (poster only under `prefers-reduced-motion`), and a white form panel. No gradient, no card shadow, no dark-sidebar dashboard look. M5 section A |
| `ChangePasswordForm` | **B** | `apps/dashboard/src/app/change-password`. The forced first-login change and a voluntary change later. `changePasswordSchema` (10-char floor, must match), a hidden `username` field for password managers, `PasswordInput` on both fields. **4 tests** |
| `QuoteFilters` | **B** | `apps/dashboard/src/components`. Search, status, source and (role dependent) owner, URL as the source of truth so the list stays server rendered, same rule as the storefront's `ShopControls`. Search is debounced. Changing a filter clears `page`. **7 tests** |
| `QuoteResults` | **B** | `apps/dashboard/src/components`. Owns `DataTable`'s column config, since render functions cannot cross the server-to-client boundary a plain data prop can: the page fetches, this renders. `DataTable` on desktop with an explicit View column (the quote number is also a link). Compact cards on mobile per D38: the card is the View link, not a second full-width button. Paginated with `paginate` / `Pagination`, page in the URL. Status, "Needs approval" and "Expired" as `StatusPill`s. **8 tests** |
| `ReportResults` / `ReportBars` / `ReportFilters` | **B** | `/reports`. Compact StatCards, 2 by 2 on a phone and four across from `lg`. Tabs for Sales, Products, Categories. Horizontal bars, then table on desktop and cards on a phone. Period (This month, Last month, Custom dates) plus PDF on the heading row. Preview is `PdfPreview` |
| `ProductResults` | **B** | `apps/dashboard/src/components`. Catalogue list. `DataTable` on desktop (name and SKU, availability, price, stock, status, Actions). Cards on a phone: the card is the Edit link. Opens a `Sheet` at `?edit=slug`. New product opens `?new=1`. Paginated. **7 tests** |
| `ProductEditor` | **B** | Single-column sheet: name and SKU, photographs, then price, compare-at, specs, descriptions, SEO, availability, badge, published, sort, stock. Save and Delete pinned. Save closes the sheet only once it actually succeeds (`onSaved`), a rejected save leaves it open on its own error. Soft delete via `ConfirmDialog` naming the product, also closes the sheet. **7 tests** |
| `ProductCreate` / `NewProductFab` | **B** | Unpublished draft: name, SKU, slug, range, unit, price. Charcoal FAB on desktop and on a phone, same as New quote. **tests in `product-create` and `new-product`** |
| `ProductImages` | **B** | Add, role, alt, reorder, remove via `ConfirmDialog`. Writes R2 derivatives, not Drive. **3 tests** |
| `ProductFilters` | **B** | Search, availability, published, stock. URL is the source of truth. Search and the three filters share one row from `lg`. **4 tests** |
| `CatalogueRanges` | **B** | `apps/dashboard/src/components`, rendered on `/products` itself (D100, reversing D91's separate `/categories` screen). Third iteration, all against Brown's own screenshots: every group and every range is now the identical `RangePill`, same height and form throughout, in one flat wrapping row, ordered group then its own ranges so adjacency alone carries the taxonomy. Each pill's own edit pencil is a small, narrow segment sharing the pill's own border, not a separate button beside it. A group's own count sums its ranges rather than showing its own always-0 figure, since a group with children is never itself assignable. The whole panel collapses from the "Ranges" heading (a disclosure button, `aria-expanded`), so it costs nothing once a product manager already knows the range they want. Click a pill to filter the product list below via `?category=` (a group expands to its children). Edit opens a `Sheet` at `?range=id`, create at `?newRange=1`, deliberately not `?edit=`/`?new=`, which the product sheet on this same route already owns. **13 tests** |
| `CategoryEditor` | **B** | Name, page URL, File under (locked when the group has children, so it cannot become a range itself), description, published, sort order, SEO overrides. Delete only enabled on an empty range or a childless group, the count named in the disabled label itself rather than a bare disabled control. Save closes the sheet only once it actually succeeds (`onSaved`), a rejected save leaves it open on its own error; delete closes it too. **8 tests** |
| `CategoryCreate` | **B** | A top level group or a range filed under one. Name, auto slug, File under. **4 tests** |
| `UserResults` / `UserFilters` / `UserEditor` / `UserCreate` / `NewUserFab` | **B** | `/users`, Brightex admin only. D38 lookup: desktop `DataTable`, reduced-column table on a phone, detail sheet. FAB New user. Role, deactivate and reset behind `ConfirmDialog`. Sales photograph, title and phone for `/team` |
| `AnnouncementResults` / `AnnouncementFilters` / `AnnouncementEditor` / `NewAnnouncementFab` | **B** | `/announcements`, Beco admin. Desktop table, cards on a phone, sheet with preview of the bar |
| `SettingsForm` / `SettingsGrants` | **B** | `/settings`. Tabs. VAT, validity, SLA, bank, till, paybill, send money, business identity and KRA PIN, WhatsApp, footer, recipients, Brightex allowlist. Brightex-only grant list for blog write and audit read, behind ConfirmDialog. Phone save bar with an unsaved note. **10 tests** |
| `SettingsDocumentPreview` | **B** | `/settings` Payments and Business tabs. The top of a quote and its How to pay box, redrawn as fields are typed, built from `quoteFromLines` and `quotePaymentBlocks` through `@beco/documents/layout`, the client-safe entry that carries no react-pdf or Resend. **5 tests** |
| `BlogResults` / `BlogFilters` / `BlogEditor` / `BlogBodyEditor` / `BlogLivePreview` / `NewBlogFab` | **B** | `/studio/blog`. Brightex by default, or a granted user. Work column plus inspector. Gemini Generate with sparkles icon. Markdown toolbar (bold, italic, heading, list, link Dialog). Live-article preview. Cover uses the product Sharp pipeline |
| `AuditResults` / `AuditFilters` | **B** | `/audit`. Read-only. Brightex by default, or a granted user. Table on desktop, cards on a phone, sheet with labelled before / after |
| `LaunchControls` | **B** | `apps/dashboard/src/app/launch`. Brightex only. Sets `site_launch_at` and throws `site_launch_live` through `ConfirmDialog`. Actions re-check `requirePath('/launch')` |
| `AppShell` | **B** | `apps/dashboard/src/components`. The signed-in frame, wrapping the `(app)` route group. Desktop: a white sidebar (`SideNav`), a slim top bar (`TopBarCrumb`, appearance, settings, account) and the screen on a floating white panel over an off-white ground, D106. Phone: the D85 header card naming the screen, and the sections in `BottomNav` under the thumb, D111. Appearance toggle. The white header stays in flow. `ShellContext` docks after it scrolls away. The home link is Beco's red square mark beside the name, on Brown's direct call, D102, reversing D85's text-only wordmark. The Quotes tab carries a live count of new quotes. M5 section C, D85, D102. **4 tests** |
| `ThemeToggle` | **B** | `apps/dashboard/src/components`. Pins light or dark on `html.dark` for the dashboard only. Storage key `beco-dashboard-theme`. First paint is always light so SSR and hydrate match; the stored choice syncs after mount. **3 tests** |
| `SideNav` | **B** | `apps/dashboard/src/components`. The desktop sidebar, D106: sections grouped by job (Home, Sales, Catalogue, Content, Insight, Admin) from `navGroupsFor`, the current one filled charcoal with a Warm Red tick, the new quote count on Quotes. Text, no icons. Hidden under `lg`, where `BottomNav` takes over |
| `TopBarCrumb` | **B** | The desktop top bar's "you are here": section, then page, from the same `navContext` the phone breadcrumb reads |
| `HomeActivity` / `ReportCharts` | **B** | Home: quotes raised against won by week, and the pipeline from new to lost. Reports: invoiced against collected by week. Both from `activity_series()` and `quote_pipeline()`, security invoker, migration 59. **5 tests** |
| `BottomNav` | **B** | `apps/dashboard/src/components`. The phone's bottom bar, D111: the three or four screens a role lives in from `bottomNavFor`, each an icon over a word, the current one charcoal with a tick above; New quote raised in the middle as a charcoal tile for anyone who raises quotes; More opening the shared `Dialog` as a sheet with the remaining sections, Change password and Sign out, closing itself on navigation. The Warm Red count rides on Quotes. Sets nothing itself; the shell sets `--dock` to its height so docked save bars and floating actions sit above it. Hidden from `lg` up. Replaces the D85 pill strip (`TopNav`, retired). **9 tests** |
| `ShellContext` | **B** | `apps/dashboard/src/components`. "You are here" bar, phone and desktop. Hidden while the pill header is on screen, then docks at the top. Nested screens: section / page, section is a real list link. Section roots: the section name. Blog ids become the article title (or Edit article), never the uuid. **7 tests** |
| `AccountMenu` | **B** | `apps/dashboard/src/components`. Initials open a flat panel: Change password and Sign out. Sign out POSTs to `/sign-out`, not a link. Stays a plain element (jsdom, D88). New menus use `DropdownMenu`. **5 tests** |
| `CataloguePicker` | **B** | `apps/dashboard/src/components`. Button opens a `Dialog` of published products across every range. Native Range select with optgroups, search focused on open. Tick several, Add. Used on `/quotes/new` and quote detail. **7 tests** |
| `QuoteLines` | **B** | `apps/dashboard/src/components`. One Save writes dirty lines. Unsaved / Changed. Catalogue dialog plus custom. **tests in `quote-lines.test.tsx`** |
| `QuoteActions` (dashboard) | **B** | Claim, Assign select, status, Approve, Mark lost and Reopen behind `ConfirmDialog`, Re-issue on expired. Not the storefront `QuoteActions` row, which is still planned |
| `QuoteDocumentPanel` | **B** | View flushes dirty lines, then `PdfPreview` paints the live PDF onto canvas. Download is a real file link. Email is a real form |
| `PdfPreview` | **B** | `apps/dashboard/src/components`. Quote, receipt, and sales-review dialogs. Fetches the PDF and paints each page onto a canvas. Zoom in, zoom out, and pinch, 100 to 200 percent. iPhone Safari blanks a PDF in an iframe or a blob URL. **7 tests** |
| `QuoteDates` | **B** | Lifecycle stamps that exist. Lost and Reopened survive a reopen |
| `NewQuoteForm` / `NewQuoteFab` | **B** | Counter create. Charcoal FAB on desktop and on a phone |
| `HomeFocus` | **B** | `apps/dashboard/src/components`. The top of the dashboard home: a charcoal panel saying what needs doing now: the quotes waiting, with a Warm Red rule when any is past its response time, then quotes needing approval, money owed, low stock and drafts, each row a link to the filtered list behind it, with Open queue and New quote. Approval, stock and draft rows with nothing in them are not drawn. D102. **5 tests** |
| `RecentQuotes` | **B** | Home. The latest quotes as rows with customer, source, a plain age ("3 hours ago"), total or POA and status, each a link to the quote. **4 tests** |
| `CustomerFinder` | **B** | `/quotes/new`. Type a name or phone, pick a returning customer, and the form fills. Searches the caller's readable quotes server side through `searchCustomers`, deduplicated by phone. Clear undoes the fill. **6 tests** |
| `CustomerContact` | **B** | Quote and order detail. Call, WhatsApp prefilled with the reference, and Email where there is one. The counter's most common next move, one tap. **3 tests** |
| `WhatsAppShare` | **B** | Quote and receipt PDFs. On a phone, the share sheet carries the file itself; where a browser cannot share files, the PDF is saved and a chat opens prefilled to the customer. Either way the stored document is recorded as sent on WhatsApp. **7 tests** |
| `ImportRunner` / `ImportWorkflowRuns` / `ImportReport` / `DriveShapeGuide` | **B** | `/products/import`, D105. Two `ChipGroup`s and one button start the GitHub workflow; production writes go through `ConfirmDialog`. Runs from GitHub with status in words and a log link; the importer's own counts and skipped items grouped by folder; the folder shapes in plain words. **22 tests** |
| `ProductThumb` | **B** | Catalogue list and picker thumbnail. Falls back to the product's initials on a charcoal plate when there is no photograph or it fails to load, never a broken image. **4 tests** |
| `AnnouncementPreview` | **B** | `/announcements`. The live bar as the storefront shows it, on the editor and in the "On the site now" strip. **2 tests** |
| `BackLink` | **B** | `@beco/ui`. Text back control, 44px. **tests in `back-link.test.tsx`** |
| `Skeleton` / `SkeletonScreen` | **B** | `@beco/ui`. Shape matches the coming layout. `aria-hidden` blocks, one live region per screen |

## States

Required on anything that loads. **The partially populated state is not optional here**, since
this project lives in it for weeks.

| Component | Status | Notes |
|---|---|---|
| `EmptyState` | **B** | A designed page, never a broken one. Empty categories and the empty quote list use this |
| `LoadingState` | **B** | Skeletons matching final layout, so nothing shifts. `animate-pulse motion-reduce:animate-none`: the shape without the breathing for a reader who asked for no motion |
| `ErrorState` | **B** | Says what happened and what to do next. Used by the dashboard's `(app)/error.tsx`: "This screen did not load", Try again and Go to home. The route's `not-found.tsx` uses `EmptyState`. **tests in `error-pages.test.tsx`** |

## ConfirmDialog

**`window.confirm` is banned outright.** It cannot be styled or branded, blocks the main thread,
is inconsistent across browsers, is untestable in jsdom, and on mobile looks like a phishing
warning. A destructive action confirmed by a grey system box, on a site selling premium
materials, is a credibility problem rather than only an aesthetic one.

Required for anything destructive or irreversible: deleting a product, cancelling an order,
marking a quote lost, deactivating a user, changing a role.

```tsx
<ConfirmDialog
  title="Delete this product?"
  description="Limestone Ivory will be removed from the storefront. Quotes that already
               include it keep their line and their price."
  confirmLabel="Delete product"   // the VERB, never "OK"
  tone="destructive"
  onConfirm={deleteProduct}
/>
```

Rules: name the thing being acted on. Say what happens, including what does **not** happen.
The confirm button carries the verb. Focus lands on cancel, not confirm. Escape cancels.

A lint rule fails the build on `window.confirm`, `alert` and `prompt`. The rule is the
backstop, not the standard.
