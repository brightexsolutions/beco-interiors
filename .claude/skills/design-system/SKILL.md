---
name: design-system
description: Apply Beco design tokens and layout rules to any UI work. Use whenever building or changing a component, page, or style on any surface, so nothing invents its own colour, spacing, or type size.
---

# Design system

Tokens live in `packages/ui`. **Never hardcode a colour, spacing value, or font size in a
component.** If a token does not exist for what you need, add it to the token file and justify
it in the pull request, rather than reaching for a hex code.

## Palette

Charcoal Black and High-Vis White carry everything. Warm Red appears **three or four times per
page and never more**. The shell is near monochrome so the stone photography is the only colour
on the page.

In the dashboard, Warm Red is reserved strictly for attention states: a new quote, low stock,
an overdue item. Never decoration.

The prototype's warm cream, `#C8281E`, linen and gold are retired. Do not reintroduce them.

## Type

- Titillium Web for UI and body. Cormorant Garamond for display. Self hosted subset woff2
- **Never below 16px anywhere, dashboard included.** 17px body on desktop
- 14px small print floor, used rarely, never for something a user must read to act
- Line height 1.6 body, 1.1 to 1.2 display
- Measure capped at 68ch

## Spacing

8px base, everything a multiple. Section padding 120 desktop, 88 tablet, 64 mobile. Touch
targets 44px minimum, 8px apart.

## Radix and shadcn

**Dashboard only.** The storefront never starts from shadcn, never imports a
shadcn-origin widget, and never runs the CLI. It stays bespoke editorial
layout. Shared primitives (`Button`, `Field`, `PriceDisplay`) are still
`@beco/ui`; they are not a licence to drop Radix menus onto www.beco.co.ke.

On the dashboard we use **Radix primitives via shadcn's copy paste approach**
for hard accessibility widgets: dropdown, combobox, popover, tabs, and similar.
Those need focus trapping, keyboard navigation, ARIA relationships and escape
handling, and Radix solves them properly.

**shadcn is a starting point you overwrite, not a look you adopt.** New copies
land in `@beco/ui`, never in `apps/dashboard` and never in `apps/storefront`.
Do not run the shadcn CLI against either app.

Section 11.1 of the brief forbids "the default admin template look", and unstyled
shadcn *is* that look. It is recognisable at a glance from its radius, its muted
greys and its button treatment, which is why so many dashboards look identical.

**The rule: if a component looks like default shadcn, it is not finished.** No
shadcn default colour, radius, shadow or spacing survives into a shipped
component. Restyle every one against the tokens below.

Some widgets stay off Radix on purpose so they remain testable in jsdom or
honest on a phone: `ConfirmDialog` and `Dialog` are plain elements; `Select` is
native (`optgroup`, no rebuilt menu). Do not rip those out to "be more shadcn".
`@beco/ui` may already list Radix packages that nothing imports yet. Add an
import when a new dashboard widget needs it, do not install a second copy in an
app.

`packages/ui/src/components/button.tsx` is the reference. Follow its shape: `cva`
for variants, `cn` for merging, tokens for every value.

The storefront is bespoke editorial layout. A component library helps it
least, and the signature scroll section is entirely custom. Do not import
dashboard shadcn widgets there.

## Tailwind

Tailwind 4 reads the `@theme` block in `tokens.css`, so `bg-charcoal` and
`var(--color-charcoal)` are the same value and the tokens cannot live in two places.

`packages/ui/src/tokens/palette.ts` holds the palette in TypeScript, and a test asserts
`tokens.css` contains every one of those values, so the stylesheet and the contrast checker
cannot drift apart.

## Checks before a component is done

- [ ] No hardcoded colours, sizes, or spacing
- [ ] Contrast verified by the token package script, not eyeballed
- [ ] Warm Red on white checked at the size it actually appears
- [ ] Nothing below 16px
- [ ] Measure under 68ch
- [ ] Works under `prefers-reduced-motion`

## Never build

Centered hero with a gradient blob. Three column feature cards with an icon in a circle. A
footer of grey link columns and a copyright. Unmotivated gradients. A dashboard with a dark
sidebar and four sparkline tiles over a dense table. A chart added because a dashboard is
expected to have one.
