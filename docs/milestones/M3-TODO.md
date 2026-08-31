# M3: Design system

Per CLAUDE.md rule 8. Ticked only when **checked**.

## Already done, carried from M0 and M1

- [x] Brand guideline read, findings in `docs/BRAND-GUIDELINE-NOTES.md`
- [x] Palette locked: three colours, no secondary, prototype gold retired
- [x] `tokens.css` wired to Tailwind 4 `@theme`, single source of truth
- [x] Contrast verified 7/7, which caught white on Warm Red at 4.38:1
- [x] `Button` reference component
- [x] `palette.ts` drift test, so CSS and the checker cannot disagree

## This milestone

### Fonts

- [x] Titillium Web self hosted, 400 and 600, Latin subset, 24KB
- [x] Cormorant Garamond self hosted, 400 and 500, Latin subset, 45KB
- [x] `@font-face` with `font-display: swap` and unicode-range. **69KB for the whole type system**
- [ ] **No Google Fonts request in the network panel.** The prototype loads three families
      render blocking; that is exactly what we are removing
- [ ] Verify `font-src 'self'` in the CSP still holds, which is only possible because of this

### Logo

- [ ] SVG derived from the vector source in `BRAND IDENTITY`. A PNG in the nav is needless
      weight and quality loss
- [ ] Three variants per the guideline: Display for hero, Standard for navigation, Micro with
      extra contrast for small sizes
- [ ] Clear space of 50% of logo height respected in the components

### Components, per `docs/COMPONENTS.md`

- [x] `PriceDisplay`, 6 tests. Falls back to POA if a price is missing, so a half filled
      spreadsheet row can never render "KES null". Refuses to fake a sale when
      `compare_at_price` is not actually higher
- [x] `AvailabilityBadge`. Warm Red only on POA, the state that changes what a buyer does
- [ ] `ProductCard`. No border, no shadow. Fixed 4:5 frame, image scales on hover, red hairline
      under the name
- [ ] `ProductGallery`. Ordered by role. **Must read correctly on three images as well as six**
- [ ] `EmptyState`, `LoadingState`, `ErrorState`
- [ ] `Field`, `Input`, `QuantityStepper`

### Gallery

- [ ] A page rendering every component in every state, holdable next to
      `prototype/beco-design-system.html`

## Verify

- [ ] Contrast script passes for every pair actually used
- [ ] No font size below 16px, enforced by lint
- [ ] Measure never exceeds 68ch
- [ ] Every touch target at least 44px
- [ ] `prefers-reduced-motion` stops all motion
- [ ] Component tests in jsdom, no browser
