# M5 quotes handover

**Read this first if you are starting a new dashboard session.** The quotes
surface is built. The next admin page is the products editor. Do not reopen
quotes unless Brown asks.

`docs/milestones/M5-TODO.md` is the full ticked list. This file is only what
the next agent needs to start cold.

**State, 17 September 2026:** quotes list, counter create, detail mutations,
PDF, email and dashboard home figures are on branch `m5-quotes`, off
`m5-dashboard` at `a6d784d`. `/products` is still an EmptyState placeholder.
Receipt PDF waits for orders. Live beco.co.ke is still WordPress; that is
expected until the storefront launches.

**Local stack:** `pnpm db:reset` then `pnpm drive:import` if you need
photographs. After a plain reset the local catalogue is 24 published 12mm
sintered stones. Handles, lighting, panels and hardware exist as empty
taxonomy until the import. The quotes catalogue picker lists those empty
ranges on purpose.

---

## 1. Start the next session with this

Branch: `m5-quotes`. Dashboard: `http://localhost:3001/`.

Own **M5 section G, the products editor**. `/dashboard/products` currently
renders:

> The catalogue editor, with prices, specs, availability and SEO overrides,
> arrives in the next build.

Paste this into the new chat:

```
Own the Products editor on branch m5-quotes. Read
docs/milestones/M5-QUOTES-HANDOVER.md first, then M5-TODO section G,
docs/DASHBOARD-UI.md, D54 and D88. Do not edit quotes, AppShell, the
charcoal band, or the storefront. shadcn is dashboard only, never the
storefront. New widgets land in @beco/ui.
```

Section F (stock quantity) can share the products list later. Do not start
stock, orders, announcements, users, or reports in the same session unless
Brown says so.

---

## 2. Do not touch

These were owned by the quotes session. Leave them unless a products write
genuinely has to call them (for example `revalidateTag` after a price
change).

- `apps/dashboard/src/app/(app)/quotes/**`
- `apps/dashboard/src/components/quote-*`
- `apps/dashboard/src/components/catalogue-picker.tsx`
- `apps/dashboard/src/components/new-quote-*`
- `apps/dashboard/src/lib/quote-*`, `catalogue.ts`, `catalogue-search.ts`
- Quote RPCs and migrations 30 to 38
- `packages/documents` quote PDF and priced-quote email
- `apps/dashboard/src/components/app-shell.tsx` and the charcoal band
- `apps/storefront`

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

## 5. Rules the products session still has to keep

- No em dashes
- Vitest plus RTL in jsdom. No Playwright
- No decorative controls. Inventory in `docs/QA-CHECKLIST.md`
- No `window.confirm` / `alert` / `prompt`. Soft delete uses `ConfirmDialog`
  and names the product. Copy is already in `docs/COMPONENTS.md`
- Shared widgets in `@beco/ui`. shadcn copy-paste is allowed there only
  (D88). Never a `components.json` in an app
- RLS and proxy both gate writes. `beco_sales` and `beco_editor` cannot
  edit products
- Soft delete: quotes that already include the product keep their line and
  their price
- Rename records the old slug for a 301 (`product_slugs` trigger exists)
- Every write should `revalidateTag` the storefront product and category
