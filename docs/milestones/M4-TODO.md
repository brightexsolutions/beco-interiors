# M4: Storefront

Per CLAUDE.md rule 8. Ticked only when **checked**.

## Pages

- [ ] `/` home. Pinned split hero per D30, category rail, signature section
- [ ] `/shop` and `/shop/[category]`, filters, automatic noindex when empty per D27
- [ ] `/product/[slug]`, gallery by role, specs, the three conversion actions
- [ ] `/quote`, the builder and submission
- [ ] `/team`, sales agents only. **Directors are never flagged public**
- [ ] `/about`, `/contact`, `/gallery`
- [ ] Custom 404 and 500 routing back into the catalogue

## From Irene, 31 Aug

- [ ] **Sales agents shown, directors not.** A buyer verifying they are talking to a genuine
      Beco salesperson is fraud prevention, not vanity. `users` gains public facing fields and
      an explicit opt in flag
- [ ] **Corporate clients and brands delivered for.** Strongest trust content available, better
      than testimonials, because "supplied for these firms" is what closes a specifier.
      **Renders nothing until real data exists**, rather than shipping a placeholder logo wall
- [ ] Showroom photos and video, once uploaded
- [ ] Her sales process document lands before M5, and may change the quote lifecycle

## Two cautions to raise with Beco before the clients section goes live

- [ ] **Permission to name clients publicly.** Some corporates prohibit it contractually
- [ ] A logo wall of brands they supplied **must not imply endorsement**. Framing is "projects
      we have supplied", with named clients only where written permission exists

## SEO and conversion, built in rather than added after

- [ ] Metadata on every route, canonical, Open Graph
- [ ] JSON-LD: Product, LocalBusiness, BreadcrumbList, ItemList
- [ ] Sitemap from the database, empty categories excluded
- [ ] Filtered URLs canonicalise to the base, `noindex`, per D29
- [ ] Three conversion actions ranked identically everywhere per D26
- [ ] `analytics_events` on the full funnel including `call_click`

## Verify

- [ ] Lighthouse budgets met with motion live
- [ ] A quote submits end to end and appears in the database
- [ ] An empty category renders a designed page and carries `noindex`
- [ ] Pure White, with three images, still reads correctly
