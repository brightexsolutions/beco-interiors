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

We use **Radix primitives via shadcn's copy paste approach** for behaviour: dialog, dropdown,
select, combobox, popover, tabs, toast, and the dashboard data table. Those are the components
where accessibility is genuinely hard, meaning focus trapping, keyboard navigation, ARIA
relationships and escape handling, and Radix solves them properly.

**shadcn is a starting point you overwrite, not a look you adopt.**

Section 11.1 of the brief forbids "the default admin template look", and unstyled shadcn *is*
that look. It is recognisable at a glance from its radius, its muted greys and its button
treatment, which is why so many dashboards look identical.

**The rule: if a component looks like default shadcn, it is not finished.** No shadcn default
colour, radius, shadow or spacing survives into a shipped component. Restyle every one against
the tokens below.

`packages/ui/src/components/button.tsx` is the reference. Follow its shape: `cva` for variants,
`cn` for merging, tokens for every value.

The storefront uses far less of this than the dashboard. It is bespoke editorial layout, where
a component library helps least, and the signature scroll section is entirely custom.

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
