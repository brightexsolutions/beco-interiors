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
| `ConfirmDialog` | **B** | **Replaces `window.confirm` entirely.** Rewritten from the M3 scaffold, which rendered unconditionally and had a Cancel button wired to nothing. **9 tests** covering escape, backdrop, focus placement and the trap |
| `Dialog` / `Sheet` | P | Radix. Sheet on mobile, dialog on desktop |
| `toast()` | P | **Replaces `window.alert`.** Announced to screen readers |
| `Field` | **B** | Label, hint, error. The CONTROL is passed in, so one wrapper serves an input, a select, a textarea or a radio group without a variant for each. Errors carry `role="alert"`, so they are announced rather than only coloured. Written twice before this, in the quote form and the shop filter bar |
| `Input` `Textarea` `Select` | **B** | 44px minimum, `text-base` so iOS does not zoom on focus. `Select` is NATIVE with `appearance-none` and a drawn chevron, not Radix: it needs `optgroup` to carry the two level taxonomy, and a native menu is better on a phone than a rebuilt one. All three forward refs. **10 tests** |
| `QuantityStepper` | P | **The 12 tap budget depends on this.** Big targets, no keyboard needed |

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
| `DataTable` | P | Desktop table. **Mobile treatment is per table, not one blanket rule**: quotes and orders become full cards because each row is a decision, stock and products keep a reduced column table with a detail sheet because those are scanning tables |
| `StatCard` | P | States a number, its comparison, and what it implies. A number with no comparison is decoration |
| `StatusPill` | P | Quote and order lifecycle states |
| `LiveUpdateBanner` | P | "3 new quotes, show". **Never inserts rows into a list under the user's finger.** See D46 |
| `LastUpdated` | P | "Updated 2 minutes ago, Refresh". Honest about staleness and gives control back |
| `AuditEntry` | P | Before and after, readable by a human |
| `SignInForm` | **B** | `apps/dashboard/src/app/login`. Password sign in against Supabase Auth, one message for every failure so a wrong password and an unknown email cannot be told apart. Rate limited, D81. First real dashboard surface, built for D80, not the M5 build |
| `LaunchControls` | **B** | `apps/dashboard/src/app/launch`. Sets `site_launch_at` and throws `site_launch_live` through `ConfirmDialog`, per rule 4. Every server action re-checks `requireAdmin` because a server action is a public endpoint whatever gated the render |

## States

Required on anything that loads. **The partially populated state is not optional here**, since
this project lives in it for weeks.

| Component | Status | Notes |
|---|---|---|
| `EmptyState` | P | A designed page, never a broken one. Empty categories use this |
| `LoadingState` | **B** | Skeletons matching final layout, so nothing shifts. `animate-pulse motion-reduce:animate-none`: the shape without the breathing for a reader who asked for no motion |
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
