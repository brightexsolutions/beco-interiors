# M5 quotes handover

**Read this first if you are starting a new dashboard session.** Quotes and
the catalogue editor are built. Do not reopen quotes, AppShell, the charcoal
band, or `/products` unless Brown asks.

`docs/milestones/M5-TODO.md` is the full ticked list. This file is only what
the next agent needs to start cold.

**State, 18 September 2026:** quotes, catalogue editor, `/orders`,
`/reports`, `/users`, announcements, `/settings`, `/studio/blog`,
`/audit` and the dashboard appearance toggle are on branch `m5-quotes`,
off `m5-dashboard` at `a6d784d`. `/stock` redirects to `/products`.
Receipt PDF ships with orders. Quote, receipt and report PDFs preview as
canvas pages with zoom. Live beco.co.ke is still WordPress; that is
expected until the storefront launches.

**Local stack:** `pnpm db:reset` then `pnpm drive:import` if you need
photographs. After a plain reset the local catalogue is 24 published 12mm
sintered stones. Handles, lighting, panels and hardware exist as empty
taxonomy until the import. The quotes catalogue picker lists those empty
ranges on purpose. Migration 39 adds `stock_quantity` and
`low_stock_threshold`. A fresh reset is the honest replay.

---

## 1. Start the next session with this

Branch: `m5-quotes`. Dashboard: `http://localhost:3001/`.

Close M5. Do not reopen quotes, AppShell, the charcoal band,
`ShellContext`, `/products`, `/orders`, `/reports`, `/users`,
announcements, `/settings`, `/studio/blog`, `/audit` or the appearance
toggle unless Brown asks.

Do not start a second products pass, and do not edit quotes, AppShell, the
charcoal band, `ShellContext`, `/orders` or `/reports` unless Brown says so.

**Locked with Brown, 18 September. Carry these forward. Do not re-argue
them on `/orders`, `/reports` or later screens:**

- List screens: `DataTable` on desktop, cards on a phone. Desktop must keep
  the table. A phone must not get a table that scrolls left and right.
  **Exception:** `/users` is a D38 lookup: reduced-column table plus a
  detail sheet, not cards.
- Filter bars from `lg`: search and the selects share **one row**. Compact
  on a phone (search full width, selects under it).
- Page headings: no lede under the title on operations lists. The primary
  create action is a labelled charcoal FAB on desktop and on a phone, never
  a heading button. Quotes already do this. Products now match.
- Last table column is named Actions. The control says the verb and carries
  an `Icon` from `@beco/ui`.
- Side sheets group fields with `FormSection`. Close uses the x icon.
- SKU is a first-class optional field on product create and edit. Search
  already matches it.
- Quotes do not reduce stock. D89 stands.
- shadcn and Radix live in `@beco/ui` only (D88). No lucide, no phosphor.

---

## 2. Do not touch

These were owned by the quotes and catalogue sessions. Leave them unless a
new write genuinely has to call them.

- `apps/dashboard/src/app/(app)/quotes/**`
- `apps/dashboard/src/components/quote-*`
- `apps/dashboard/src/components/catalogue-picker.tsx`
- `apps/dashboard/src/components/new-quote-*`
- `apps/dashboard/src/lib/quote-*`, `catalogue.ts`, `catalogue-search.ts`
- Quote RPCs and migrations 30 to 38
- `packages/documents` quote PDF and priced-quote email
- `apps/dashboard/src/components/app-shell.tsx`, `shell-context.tsx`, and
  the charcoal band
- `apps/dashboard/src/app/(app)/products/**` and `components/product-*`,
  `components/new-product.tsx`
- `apps/dashboard/src/app/(app)/orders/**` and `components/order-*`
- `apps/dashboard/src/app/(app)/reports/**` and `components/report-*`
- `apps/dashboard/src/app/(app)/users/**` and `components/user-*`
- `apps/dashboard/src/app/(app)/announcements/**` and `components/announcement-*`
- `apps/dashboard/src/app/(app)/settings/**` and `components/settings-*`
- `apps/dashboard/src/app/(app)/studio/**` and `components/blog-*`, `new-blog.tsx`
- `apps/dashboard/src/app/(app)/audit/**` and `components/audit-*`
- `apps/dashboard/src/components/theme-toggle.tsx`, `lib/dashboard-theme.ts`
- `apps/dashboard/src/app/api/img/**` (dashboard R2 preview proxy)
- Stock columns, product photographs and `dashboard_summary` low-stock
  (migration 39)
- Order and report RPCs, migrations 40 and 41, receipt and report PDFs
- Migration 45 (`guard_users_staff`, `end_user_sessions`) and pgTAP 26 / 27
- Migrations 46 to 48 (settings / blog / audit grants, payment channels,
  studio Brightex-only) and pgTAP 28

Storefront availability and `POST /api/revalidate` already landed for
catalogue writes. Do not restyle the storefront to get the next screen done.

Dashboard home (`apps/dashboard/src/app/(app)/page.tsx` and
`lib/dashboard-summary.ts`) is already wired. Do not restyle it.

## 3. What quotes actually shipped

Pattern for later list / create / detail screens: `docs/DASHBOARD-UI.md`.

- List: `/quotes`, paginated, cards on a phone, table on desktop. Source
  `web` labels as Website. FAB for New quote on mobile.
- Create: `/quotes/new`. Add from catalogue is a dialog (search focused,
  range select with optgroups, multi-select). Custom item beside it. Save
  writes `create_counter_quote`.
- Detail: `/quotes/[reference]`. Actions top right. One Save on line items
  (`update_quote_lines`). Unsaved / Changed while dirty. View, Download and
  Email flush dirty lines first so the PDF matches the form. Assign is the
  select itself, Beco sales and Beco admin only, never `brightex_admin`.
  Lost and Reopen use `ConfirmDialog`. Toasts only, never `window.alert`.
- PDF: `GET /quotes/[reference]/pdf`. From block reads **Beco Interiors
  Limited**. Brand eyebrow stays Beco Interiors. VAT backed out per D50.
  Unpriced quotes print Pricing on application, never `KES 0.00`.
- Home: six `StatCard`s from `dashboard_summary()`, Nairobi boundaries in
  Postgres.

## 4. Left on quotes, not for the next session

- `age` list filter
- Realtime new-quote banner (section L). Nav count is still wired to 0
- Inline audit trail on quote detail
- `quoteWhatsAppLink` is tested but not on the document panel. Copy today is
  "Download the file to send it on WhatsApp"
- 12-tap budget, counted on a real phone
- Receipt PDF: with orders, not here
- Local catalogue besides stones: needs `pnpm drive:import`
- Migrations 34 to 37 were applied locally out of `supabase_migrations`
  order once. A fresh `pnpm db:reset` is the honest replay. Do not apply
  SQL by hand against a foreign container. `supabase/config.toml` pins
  `project_id = "beco-interiors-website"` so worktrees share one stack

## 5. What the catalogue editor shipped

- Nav: one Catalogue item at `/products`. `/stock` redirects there.
  Product manager landing stays `/products`. No sidebar.
- List: table on desktop, cards on a phone. Name, SKU, range,
  availability, price or POA, stock, low-stock flag. Last column is
  Actions. The card is Edit. No horizontal scroll on a phone.
- Filters: compact. From `lg`, search plus Availability, Published and
  Stock sit on one row. Phone: search full width, three selects under it.
  No Search label, placeholder plus aria-label.
- Heading: Products, no lede. Charcoal labelled FAB on desktop and on a
  phone, same as New quote. No heading button. FAB goes to `?new=1` and
  inserts an unpublished draft (name, SKU, slug, range, unit, price), then
  opens the editor.
- Editor sheet: grouped `FormSection`s (Name, Photographs, Copy,
  Availability, Price, Search). SKU on create and edit. One column, Save
  and Delete pinned. Stock quantity and low-stock threshold live on
  Availability. Half unit for per slab, whole otherwise, never negative.
  Blank is uncounted, not zero.
- Photographs in the editor: upload JPEG, PNG or WebP to R2 (400/800/1600
  webp plus blur), role, alt, reorder, remove via `ConfirmDialog`. Needs
  the R2 keys locally.
- Soft delete via `ConfirmDialog`. Quotes keep their line and price.
- Stock writes audited. `beco_product_manager` and admins write; sales and
  anon cannot (pgTAP `20_product_stock.test.sql`).
- Storefront card reads Out of stock when quantity is 0. Writes POST
  storefront `/api/revalidate`. No auto-decrement from orders.
- Former slugs 308 via `permanentRedirect` after the `product_slugs` row.

## 6. Rules that still hold for the next screen

- No em dashes
- Vitest plus RTL in jsdom. No Playwright
- No decorative controls. Inventory in `docs/QA-CHECKLIST.md`
- No `window.confirm` / `alert` / `prompt`
- Shared widgets in `@beco/ui`. shadcn copy-paste is allowed there only
  (D88). Never a `components.json` in an app
- RLS and the proxy both gate writes

## 7. Orders and reports have shipped

`/orders` and `/reports` landed 18 September (M5 sections K and I). Receipt
PDF and email ride paid orders. Reports: compact StatCards in a 2 by 2
grid on a phone, tabs for Sales / Products / Categories, a written sales
performance PDF at `/reports/pdf`, previewed in a dialog before download,
for the team (Overall) or one salesperson. Custom start and end dates
shipped (`?period=custom&from=&to=`). Trends stay deferred. Quote, receipt
and report previews paint onto canvas (`PdfPreview`), with zoom in, zoom
out and pinch, because iPhone Safari blanks a PDF in an iframe. The
breadcrumb docks after the white header scrolls away, on a phone and on
desktop. Realtime is still section L: do not block the next screen on it.

Quote header money is refreshed from priced lines (migration 44). Convert
copies that onto the order. Do not reopen that unless Brown asks.

Convert lives on a won quote detail (`QuoteActions`). That is the only
quote-surface write from this pass. Do not restyle quotes to change it.

**Leave for later, not for settings:** installation and delivery lines are
still VAT-inclusive in the quote UI (D50 is products only). `top-nav.tsx`
has a known hydration warning from locale dates.

## 8. Users and announcements have shipped

`/users` is Brightex admin only (`beco.brightex.dev@gmail.com`). D38 lookup:
reduced-column table on a phone, not cards. Create issues a password once.
Role, deactivate and reset sit behind `ConfirmDialog`. Sales rows can carry
a `/team` portrait (R2 `team/{id}/{hex}-400|800|1600.webp`), title, phone
and Show on /team. Only `beco_sales` can be public. Dashboard preview uses
this app's `/api/img`, same `NEXT_PUBLIC_IMAGE_HOST=/api/img` as the
storefront.

`/announcements` is `beco_admin` (`irene.kariuki@beco.co.ke`) and
`brightex_admin`. Nairobi datetime-local. Writes bust storefront `/` so the
bar updates. Do not restyle the storefront bar.

**Next:** close M5. Walk the remaining Definition of done items: tick
sections S and T against reality, finish the Dashboard QA inventory
including the 12-tap count on a real phone, run Codex's M5 review on
committed state, and leave LastUpdated plus section L live updates unless
Brown asks for them now. Do not reopen settings, Studio, audit or the
theme toggle.

Settings (`beco_admin` and `brightex_admin`), blog (`/studio/blog`) and audit
(`/audit`) shipped this session. Payments on Settings cover bank, till,
paybill and send money. Studio write is Brightex-only. Audit read stays
grantable. Appearance toggle is dashboard-only (`html.dark`).

