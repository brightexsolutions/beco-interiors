# Component Inventory

Everything shared lives in `@beco/ui`. **If a pattern appears twice, it belongs here.**
Duplicated components drift, and drifted components are how a design system quietly dies.

`packages/ui/src/components/button.tsx` is the reference. Follow its shape: `cva` for variants,
`cn` for merging, tokens for every value, no shadcn default surviving.

Status: **B** built, **S** stubbed, **P** planned.

## Foundation

| Component | Status | Notes |
|---|---|---|
| `Button` | **B** | Reference component. Primary uses `warm-red-deep`, never pure warm red, which fails AA with white text |
| `ConfirmDialog` | **S** | **Replaces `window.confirm` entirely.** See below |
| `Dialog` / `Sheet` | P | Radix. Sheet on mobile, dialog on desktop |
| `toast()` | P | **Replaces `window.alert`.** Announced to screen readers |
| `Field` | P | Label, hint, error, and the input, wired together. Errors announced, not just coloured |
| `Input` `Textarea` `Select` | P | Radix Select. 44px minimum, 16px text so iOS does not zoom on focus |
| `QuantityStepper` | P | **The 12 tap budget depends on this.** Big targets, no keyboard needed |

## Domain

These carry business rules, so they exist once and are tested once.

| Component | Status | Notes |
|---|---|---|
| `PriceDisplay` | P | **The most important component on the storefront.** Renders fixed price, POA, or a sale with a struck through `compare_at_price`. `price_display_mode` is separate from `availability` precisely so this can never be ambiguous, and ambiguity here costs sales |
| `AvailabilityBadge` | P | In Stock, Pre-Order, POA. Warm Red only for genuine attention |
| `ProductCard` | P | No border, no shadow. Fixed 4:5 frame, image scales on hover, red hairline draws under the name. A shadow lift is the generic move |
| `ProductGallery` | P | Ordered by image role: slab, on_stand, bookmatch, application. **Must read correctly on three images as well as six**, since five products have no on stand shot |
| `QuoteActions` | P | The three actions, ranked identically everywhere: Request a quote, WhatsApp, Call |
| `StickyActionBar` | P | Mobile. **Never sits under the on screen keyboard.** Verified on real iOS and Android |
| `AnnouncementBar` | P | Server rendered with reserved height. Dismissal is a **cookie, not localStorage**, so the server knows and the bar never flashes then vanishes |

## Dashboard

| Component | Status | Notes |
|---|---|---|
| `DataTable` | P | Desktop table. **Mobile treatment is per table, not one blanket rule**: quotes and orders become full cards because each row is a decision, stock and products keep a reduced column table with a detail sheet because those are scanning tables |
| `StatCard` | P | States a number, its comparison, and what it implies. A number with no comparison is decoration |
| `StatusPill` | P | Quote and order lifecycle states |
| `LiveUpdateBanner` | P | "3 new quotes, show". **Never inserts rows into a list under the user's finger.** See D46 |
| `LastUpdated` | P | "Updated 2 minutes ago, Refresh". Honest about staleness and gives control back |
| `AuditEntry` | P | Before and after, readable by a human |

## States

Required on anything that loads. **The partially populated state is not optional here**, since
this project lives in it for weeks.

| Component | Status | Notes |
|---|---|---|
| `EmptyState` | P | A designed page, never a broken one. Empty categories use this |
| `LoadingState` | P | Skeletons matching final layout, so nothing shifts |
| `ErrorState` | P | Says what happened and what to do next |

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
