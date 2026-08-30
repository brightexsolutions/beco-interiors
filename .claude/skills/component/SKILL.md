---
name: component
description: House pattern for a UI component, including its test, accessibility baseline, and proof that its controls work. Use whenever creating or substantially changing a component.
---

# Component

## Shape

Server component by default. A client component only where interaction genuinely requires it,
kept as small an island as possible. The product grid renders on the server; the filter panel
hydrates.

Tokens from `packages/ui` only, per the `design-system` skill.

## Every component ships with

1. A test in Vitest plus React Testing Library, jsdom, **no browser**
2. Real states: empty, loading, error, and the partially populated state this project lives in
3. An accessibility check with `vitest-axe` on the rendered output
4. Its controls added to the screen's interaction inventory in `docs/QA-CHECKLIST.md`

## No decorative controls

**Every interactive element must be proven to perform the operation it advertises.** Never ship
`onClick={() => {}}`, `href="#"`, or a control disabled with no reason given. The lint rule
catches these, but the rule is the backstop, not the standard.

## Accessibility baseline

- Keyboard reachable, visible focus state, sensible tab order
- Labels tied to inputs, errors announced
- Contrast verified, not assumed
- Touch targets 44px
- Meaningful alt text from product data, never a filename
- Works under `prefers-reduced-motion`

## Mobile

Not the desktop component reflowed. One idea per section, headlines under six words, body under
three sentences, detail behind progressive disclosure. Action buttons never sit under the on
screen keyboard.
