# Dashboard UI pattern

For later sessions working on dashboard screens. Keep the Beco shell and top
navigation. Do not restyle them. Borrow layout and component patterns from the
Brightex admin (`brightex-website`) and Dreamville Estates admin
(`wordpress/dreamvilleestate`) list and create flows, translated onto Beco
tokens.

## Starting the next screen

Quotes is the reference implementation. Copy its list / create / detail
shape, not a new one. Cold start: `docs/milestones/M5-QUOTES-HANDOVER.md`.
Settings, blog, audit and the appearance toggle are done. Next session is
M5 close, not another screen. Leave quotes, `AppShell`, the charcoal band,
`/products`, `/orders`, `/reports`, `/users`, announcements, `/settings`,
`/studio/blog`, `/audit` and the theme toggle alone.

**Locked catalogue decisions (18 Sept, Brown).** Do not reopen or "improve"
these unless Brown asks:

- `/products` list: `DataTable` on desktop, informative cards on a phone.
  Never cards on desktop. Never a squeezed table on a phone.
- Product filters from `lg`: search and Availability, Published, Stock on
  **one row**. On a phone, search full width then the three selects.
- Products heading has no lede. New product is the charcoal labelled FAB
  on desktop and on a phone, same as New quote. Never a heading button.
- Last column of every dashboard table is Actions, with an icon plus the
  verb (Edit, View).
- Product sheet is grouped `FormSection`s (Name, Photographs, Copy,
  Availability, Price, Search). SKU is on create and edit.
- Icons come from `@beco/ui` `Icon`. No lucide, no phosphor.
- Stock does not auto-decrement from quotes. Blank stock is uncounted, 0 is
  out of stock.
- Do not restyle the charcoal band or the desktop header. The breadcrumb docks on scroll after the pill header leaves, on a phone and on desktop.

**Revised 23 September, Brown asked directly.** `/categories` is a real screen now (D91),
Ranges beside Catalogue in the nav, product manager and admins. It is not "another screen" the
18 Sept lock was refusing, it is what that catalogue work was always missing: the taxonomy
itself had no editor, only the products inside it did. Pattern: one `Panel` per top level group
listing its ranges, `Sheet` at `?edit=id` / `?new=1`, same as `/products`, but the list is a tree
render, not `DataTable`, since a two-level hierarchy does not read as a flat sortable table. The
product editor's Range select now groups by parent (`optgroup` per group, a childless top level
category like Lighting as its own option) instead of one flat alphabetical list; this is the one
sanctioned touch to `/products` itself, additive, not a restyle of anything the 18 Sept lock
named.

**Reversed 24 September, Brown asked directly, developer to developer.** `/categories` as its
own screen was reported back as confusing to build against, not just to look at: managing a
range and managing what is filed under it are one task, not two nav items and two URLs. D100 in
`docs/DECISIONS.md` has the full reasoning; the pattern going forward is `CatalogueRanges`, a
chip panel above the product list on `/products` itself, one chip per range and group, each
carrying its product count and a Draft mark, clicking one narrows the list below it via
`?category=`. `/categories` is now a bare redirect to `/products`, the same shape `/stock`
already used. `CategoryTree` and `NewCategoryFab`, built for the standalone screen, are deleted
rather than kept unused; `CategoryEditor` and `CategoryCreate`, the range's actual form, are
unchanged and reused inside the sheet the chip's own pencil opens. Read the 23 Sept note above
for why a taxonomy editor exists at all, not for where it now lives.

## What stays uniquely Beco

- Charcoal band, wordmark, top nav, floating white content panel (`AppShell`)
- Desktop chrome stays the original white header in flow. A breadcrumb docks after that header scrolls away, on a phone and on desktop. Do not restyle the charcoal band.
- Titillium for UI, Cormorant for page titles
- Charcoal, High-Vis White, Warm Red rationed (three or four marks a page)
- 16px type floor, 44px targets, 8px grid
- Have chart where necessary, no dark sidebar, no bento, no glass, no icon nav
- Appearance lives in the chrome (`ThemeToggle`), not a settings tab. It writes `html.dark` for the dashboard only. The storefront never sets that class. The showroom band and auth panel use `ink` / `paper` so they stay charcoal and white when the rest of the UI inverts.



## Screen types

**List** (Quotes, Orders, later Users): page heading with no primary
in the title row. The create action is a labelled charcoal FAB on desktop
and on a phone, only when the plan names a create path. Orders have none:
conversion is from a won quote. No lede under the title on operations lists. Optional KPI
row using `StatCard`. Toolbar of search and filters: from `lg` they share
**one row**. Then `DataTable` on desktop, cards on mobile. Every list row
has an explicit View or Edit action, last column named Actions, not a
click-anywhere row. Paginate. Empty state fills the panel. Skeleton
matches that shape. The stored quote source `web` is labelled Website
everywhere it is shown. Catalogue (`/products`) follows this: table on
desktop, cards on a phone, charcoal FAB for New product. Reports use compact StatCards in a 2 by 2 grid on a phone and four across from `lg`, tabs for Sales, Products and
Categories, bars, then the same table/card split with no Actions column and no FAB.
View PDF on the heading row opens the sales review in a dialog first, as canvas pages so a phone can read it. Zoom in, zoom out, and pinch, 100 to 200 percent. Review in that dialog is Overall (team: salespeople, products, ranges) or one salesperson. Download is `?download=1` for that same document. Same `/reports/pdf` file for the selected period, including a custom start and end date, not stored in `documents`.

**Create** (`/quotes/new` is the reference): heading with Save on desktop.
Work column is a `Panel` (Add from catalogue plus Custom item, line list or empty). Inspector rail
(`lg:grid-cols-[minmax(0,1fr)_22rem]`) holds customer, source, running total,
and Save on a phone. Add from catalogue opens a dialog of published products
across every range, not only stone. Range is a native select with optgroups.
Search is focused, tick several, then Add. Custom item is the same height as that trigger (`h-11`), full width on a phone,
beside it from `sm`. Lines are a shared 5-column grid on desktop. On a
phone each line is two rows: name with Remove, then qty, unit price, and total
on one control row. The list scrolls inside the panel
(`max-h-[min(28rem,50dvh)]`) so more lines do not push the customer off the
page.

**Detail** (`/quotes/[reference]`): heading with the quote reference and View
on the same row, View compact on the top right with a right arrow. Work
surface left, inspector rail right (Actions, customer, ownership, dates).
Line items use the same Item / Qty / Unit / Line grid as create. One Save
on the Line items heading writes every dirty line through
`update_quote_lines`. Rows never have their own Update. An Unsaved pill
and a Changed mark on the row appear as soon as a quantity or price
differs from what is stored. View, Download and Email write those dirty
lines first, so the PDF matches the form without a separate Save tap.
Adding a catalogue product or a custom line
is blocked until those changes are saved. To add products that are already
in the catalogue, open Add from catalogue, tick them, then add. That writes
new lines through `add_catalogue_quote_lines` under one lock. Custom remains for something
not listed. Assign to is a select: choosing a salesperson assigns
immediately. Do not add a Reassign button beside it. The list is Beco
sales and Beco admin. A Brightex admin never appears. Status actions share
one compact row. A lost quote offers Reopen, behind a ConfirmDialog, so a
client who changed their mind is not a new quote. Dates lists Raised,
Reviewed, Approved, Quoted, Valid until, Won, Lost and Reopened when those
stamps exist. Lost and Reopened stay after a reopen.

## Controls

- Status as `StatusPill`, not a coloured left border
- Numbers `tabular-nums`
- Primary action is Warm Red deep and appears once
- Disabled controls state why
- No `window.confirm` / `alert` / `prompt`

## Feedback: every action is seen to start, run and finish (D117)

A tap on a phone over a slow connection is the case to design for. The rule has three parts
and no exceptions:

1. **While it runs, the control says so.** The button that started the work gets
   `pending`: it disables itself, shows the spinner before its label, carries `aria-busy`,
   and its label turns to the present participle ("Saving", "Creating", "Sending",
   "Uploading 43%"). No ellipsis, the spinner is the ellipsis. When several buttons share
   one action (the status buttons on a quote or an order) only the pressed one spins, the
   others disable. A `ConfirmDialog` keeps its verb on the confirm button and spins beside it
2. **When it finishes, the result is stated.** Success and failure both arrive as a toast,
   "Done" or "Failed" in words plus the message the action returned, via `useActionToast`.
   A sheet that created or saved something also closes, which is the second signal. A form
   whose error belongs to one field shows it on that field instead (sign in, change
   password, the quote editor's notice), never silently
3. **While a list reloads, the list says so.** Filters, search, sort and paging are
   navigations. The filter row renders `Busy`, a live status line reading "Updating" with
   the spinner, and the table dims to half with `aria-busy` until the new rows land. Both
   come from one place: `useQueryNavigation` owns the transition and its `isPending`.
   When the controls and the list are separate components (the catalogue's range pills,
   filter row and product list), wrap them in `QueryNavigationProvider` so all three share
   one transition; without it each hears only its own navigations. A control whose own
   state is the selection (a range pill) shows the new choice at once with `useOptimistic`,
   before the server answers

Page to page navigation shows the route's `loading.tsx`, a settled layout with the heading
in place, never a spinner page.

Pieces: `Spinner` (one mark, holds still under reduced motion), `Busy`, `Button pending`,
`DataTable busy`, `useQueryNavigation`. Build on these; do not hand roll a loading word.

## shadcn

**Dashboard only, never the storefront.** Construction may start from shadcn
copy-paste (Radix for focus trap, keyboard, ARIA). That is the method, not
the look. `apps/storefront` does not import these widgets.

- Land every new widget in `@beco/ui`. Never paste shadcn into `apps/dashboard`
  or `apps/storefront`.
- Restyle against Beco tokens before it ships: Titillium, 16px floor, 44px
  targets, charcoal and High-Vis White, Warm Red rationed, `rounded-control` like
  `Button` and `rounded-card` for anything boxed (D125). If it looks like default shadcn, it is not finished.
- Do not run the shadcn CLI against either app. No `components.json` in
  `apps/dashboard` or `apps/storefront`.
- `packages/ui/components.json` is the only shadcn config. Never in an app.
- `DropdownMenu` is the reference. Next: Popover, Tabs. Combobox only when a
  native `Select` cannot carry the interaction. Do not add lucide or phosphor.
- Keep what already works: `ConfirmDialog`, `Dialog` and `AccountMenu` stay
  plain so they remain testable in jsdom. Native `Select` keeps `optgroup`.
  `DataTable` and `AppShell` stay. Do not restyle the charcoal band. Do not
  rip those out to "be more shadcn".
- Tests stay Vitest plus RTL in jsdom. Radix menus are asserted in controlled
  `open` state, because `userEvent.click` on a Radix trigger hangs in jsdom.

## Do not

- Recreate the Brightex navy sidebar or gold accent
- Recreate Dreamville purple
- Put Inter, Geist, or a serif on UI labels
- Center the page heading
- Use shadcn, Radix menus, or the shadcn CLI on the storefront


## 3 October 2026: the sidebar shell, charts and toolbars (D106)

Brown lifted the dashboard's original design constraints on 3 October so the admin could be
polished properly. What changed, and what did not:

- **Desktop gets a sidebar.** White, 248px, the mark at the top, sections grouped by job, the
  current one filled charcoal with a Warm Red tick. A slim top bar names where the reader is and
  holds appearance, settings and the account. The screen sits on a floating white panel over the
  off-white ground. The phone kept the D85 header card and pill strip until D111 below: a sidebar has no room on
  a 390px screen.
- **Charts, where they carry a figure the tiles cannot.** Home: quotes raised against won by
  week, and the pipeline from new to lost. Reports: invoiced against collected by week, and the
  ranked bars redrawn in Recharts. Every chart is the emphasis form from the dataviz method
  (charcoal for the series that matters, a light neutral for context, Warm Red for one attention
  stage), with a legend, direct labels, a tooltip in text tokens and a hidden table. No chart was
  added because a dashboard is expected to have one; each answers a question someone asked.
- **Tables open the same way.** A toolbar above every list: search, filters, the count. Headers in
  small caps with the sort state visible, a sticky header, row hover, numbers flush right.
- **Unchanged.** Type floor, touch targets, the no browser dialog rule, the ban on a dark sidebar
  (this one is white), text over icons, and the storefront, whose own rules were not lifted.

## 3 October 2026, later: the phone gets a bottom bar (D111)

The pill strip in the header card is gone. On a phone the sections sit in a fixed bar along the
bottom, under the thumb: Quotes, New quote, Orders for a salesperson; Overview, Quotes, New quote,
Orders and More for an admin; Catalogue and Import for the product manager. Each is an icon over a
word at 14px, the current one charcoal with a short tick above it. New quote is a raised charcoal
tile in the middle, since raising a quote is what the phone is for. More opens the shared `Dialog`
as a sheet with the remaining sections, Change password and Sign out. The header card now names the
screen where the strip used to be.

The shell sets `--dock` to the bar's height on phones and tablets and to zero from `lg` up. The
docked save bars on the new quote and settings screens sit at `bottom-[var(--dock)]`, and the
floating action pills add it to their offset, so nothing is ever under the bar. The New quote pill
on `/quotes` shows from `lg` up only; the bar carries it below that.

The bar reads the same access map as everything else (`bottomNavFor` over `navItemsFor`), so it
cannot offer a screen the proxy would refuse, and a role with no sections gets no bar.

## 3 October 2026, the phone layout pass (D112)

Measured with a script that walks every screen at 390px and lists each element whose right edge
leaves the viewport. Two screens overflowed outright (the orders list and the Drive import), and
the rest wrapped badly in ways a desktop never shows. What changed:

- **List cards** (quotes, orders): the customer owns a row and wraps; the figure sits on the
  next row with the status chips; nothing is truncated to make room. A chevron marks the card as
  the link, no "View" word
- **Chips wrap.** `ChipGroup` no longer scrolls sideways with a chip cut at the edge; every
  option is on screen. A group with five or more options is a select on the phone: source on
  quotes, status on orders
- **Headings**: title, lede, then the actions at full width; from `sm` the actions sit beside
  the title. The four "New" controls (product, user, announcement, article) are heading buttons,
  charcoal, not pills floating over the list under the bottom bar
- **Home**: the plate rows size the figure at xl on a phone so the label stays whole; the pipeline
  legend wraps rather than truncating "Reviewing"
- **Reports**: the person cards stack label and value in one column; the ranked bars size the
  label column to the longest name, so the bars have room
- **Settings** tabs wrap into two rows; the new quote's empty list is shorter so the customer
  card is reached sooner; `--dock` matches the bar's real height so the docked save bars sit on it

The audit script is the proof: zero offenders on every screen, every role, after the pass.

## 3 October 2026, the three width review (D113)

Every screen captured at 390, 820 and 1440 side by side, then at 1024, and read as a reader
would. The finding that mattered: the sidebar appears at 1024px and takes 248px, so the content
pane is about 776px wide, tablet width, yet every screen switched to its two column and full
table layout at that same breakpoint. The quote detail squashed into two narrow columns, the line
item headers overlapped, and the quotes and orders tables clipped their Actions column.

The rule now: **screens treat the sidebar breakpoint like a tablet and go wide at 1280px.**
Two column detail pages, the new quote form, the settings layout, the home plate and charts,
the report charts, and every desktop table switch at `xl`, not `lg`. The shell's own `lg:` rules
(sidebar, bottom bar, `--dock`) are unchanged. On the tables, Source steps aside below 1536px so
the laptop table fits, references, owners and figures never break across lines, and the row
action is an arrow with a screen reader label rather than a second word. The phone header names
the page alone; the screen's own back link names the section. New quote is a heading button on
desktop and the bar's tile on a phone; the pill that floated over the table is retired.

## 3 October 2026, the range browser (D114)

The flat strip of every category and range in one wrapping row, with a pencil on each, read as
a wall: nine groups and their ranges and sub ranges all at once, with nothing but adjacency to
say which belonged to which. It now opens one level at a time. The first row is the major
categories. Choose one and its ranges appear on a second row beneath it; choose a range with sub
ranges and a third row appears. The rows a reader is not inside are not drawn. A line under the
rows names the path, "Sintered Stone / 12mm Sintered Stones, 24 products", and carries Edit and
Add range for that selection alone; New category sits in the heading. Drafts are dashed and say
so. The collapse toggle is gone because there is nothing left to collapse.

