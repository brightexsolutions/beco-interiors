# M5 quotes handover

**Read this first if you are starting a new dashboard session.** Quotes and
the catalogue editor are built. Do not reopen quotes, AppShell, the charcoal
band, or `/products` unless Brown asks.

`docs/milestones/M5-TODO.md` is the full ticked list. This file is only what
the next agent needs to start cold.

**State, 18 September 2026:** quotes list, counter create, detail mutations,
PDF, email, dashboard home figures and the catalogue editor (`/products`,
stock, create, photographs, D89) are on branch `m5-quotes`, off
`m5-dashboard` at `a6d784d`. `/stock` redirects to `/products`. Receipt PDF
waits for orders. Live beco.co.ke is still WordPress; that is expected until
the storefront launches.

**Local stack:** `pnpm db:reset` then `pnpm drive:import` if you need
photographs. After a plain reset the local catalogue is 24 published 12mm
sintered stones. Handles, lighting, panels and hardware exist as empty
taxonomy until the import. The quotes catalogue picker lists those empty
ranges on purpose. Migration 39 adds `stock_quantity` and
`low_stock_threshold`. A fresh reset is the honest replay.

---

## 1. Start the next session with this

Branch: `m5-quotes`. Dashboard: `http://localhost:3001/`.

Own `/users` next (M5 section B, `brightex_admin` only). After that:
announcements, orders, reports. The catalogue editor is no longer a
placeholder.

Do not start a second products pass, and do not edit quotes, AppShell or the
charcoal band unless Brown says so.

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
- `apps/dashboard/src/components/app-shell.tsx` and the charcoal band
- `apps/dashboard/src/app/(app)/products/**` and `components/product-*`,
  `components/new-product.tsx`
- Stock columns, product photographs and `dashboard_summary` low-stock
  (migration 39)

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
- List: reduced columns on a phone, full table on desktop (D38). Name,
  availability, price or POA, stock, low-stock flag, explicit Edit.
- Editor sheet: one column, Save and Delete pinned (no sideways scroll).
  Photographs, price, compare-at, specs, descriptions, SEO, availability,
  badge, published, sort, plus `stock_quantity` and `low_stock_threshold`.
  Half unit for per slab, whole otherwise, never negative. Blank is
  uncounted, not zero.
- New product: heading button on desktop, charcoal FAB on a phone, `?new=1`.
  Inserts an unpublished draft, then opens the editor.
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
