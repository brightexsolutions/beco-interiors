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
