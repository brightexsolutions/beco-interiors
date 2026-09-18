# Dashboard UI pattern

For later sessions working on dashboard screens. Keep the Beco shell and top
navigation. Do not restyle them. Borrow layout and component patterns from the
Brightex admin (`brightex-website`) and Dreamville Estates admin
(`wordpress/dreamvilleestate`) list and create flows, translated onto Beco
tokens.

## Starting the next screen

Quotes is the reference implementation. Copy its list / create / detail
shape, not a new one. Cold start: `docs/milestones/M5-QUOTES-HANDOVER.md`.
Next page is settings. Leave quotes, `AppShell`, the
charcoal band, `/products`, `/orders`, `/reports`, `/users` and announcements
alone.

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

## What stays uniquely Beco

- Charcoal band, wordmark, top nav, floating white content panel (`AppShell`)
- Desktop chrome stays the original white header in flow. A breadcrumb docks after that header scrolls away, on a phone and on desktop. Do not restyle the charcoal band.
- Titillium for UI, Cormorant for page titles
- Charcoal, High-Vis White, Warm Red rationed (three or four marks a page)
- 16px type floor, 44px targets, 8px grid
- Have chart where necessary, no dark sidebar, no bento, no glass, no icon nav



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

## shadcn

**Dashboard only, never the storefront.** Construction may start from shadcn
copy-paste (Radix for focus trap, keyboard, ARIA). That is the method, not
the look. `apps/storefront` does not import these widgets.

- Land every new widget in `@beco/ui`. Never paste shadcn into `apps/dashboard`
  or `apps/storefront`.
- Restyle against Beco tokens before it ships: Titillium, 16px floor, 44px
  targets, charcoal and High-Vis White, Warm Red rationed, `rounded-[2px]` like
  `Button`. If it looks like default shadcn, it is not finished.
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

