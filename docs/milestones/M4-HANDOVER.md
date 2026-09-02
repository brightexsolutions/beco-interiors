# M4 handover: what is left

Written 2 September 2026, at the end of a long build session, so a fresh
session can pick up without re-deriving anything.

**State:** 167 tests passing, 9 packages typechecking, every built route
returns 200. 31 products, 24 priced, 21 described, 15 categories, 0 quotes
submitted in anger yet.

Read `docs/milestones/M4-TODO.md` for the full ticked list. This file is only
what is NOT done, and why.

---

## 1. Raised by Brown and not yet done

These came out of a live review and are the most likely thing to be asked
about first.

- [ ] **The shop's top section still reads as basic.** Everything above the
      filter bar is an eyebrow, a heading and a lede on white. It wants a
      designed opening the way `/contact` now has one
- [ ] **The filter bar is functional but plain.** Search box, a select, and two
      rows of text facets. It works and it is correct, but it does not look
      considered
- [ ] **Category and subcategory browsing.** There is no hierarchy in the UI.
      `categories.parent_id` exists in the schema and is unused, so the 15 flat
      categories cannot be grouped into Stone / Panels / Flooring / Hardware /
      Accessories the way a specifier would expect to browse them
- [ ] **`/shop/[category]` has a large empty right-hand column.** The category
      description runs down the left at a capped measure and nothing balances it
- [ ] **Animation for items appearing in the gallery section.** The
      `/gallery` grid uses the standard reveal; Brown asked for something
      stronger there specifically
- [ ] **WhatsApp product enquiry.** The control exists on the product page and
      carries the product name and SKU. It was never re-checked after the
      layout fix that stopped the info column being squeezed, so confirm it
      reads correctly before calling it done
- [ ] **Some single product pages still look wrong.** `/product/delfone-12mm`
      was the example given. The info column now has a minimum width, which
      fixes the wrapping, but the page was not re-reviewed afterwards

## 2. Pages and routes still missing

- [ ] `/team`, currently **404**. Sales agents only. **Directors are never
      flagged public.** `users.is_public` and the `users_only_sales_are_public`
      constraint are already in the schema
- [ ] Custom 500 page. 404 exists and is designed
- [ ] Three blog articles, seeded through a migration, each targeting a named
      search term and linking into its category. On the D28 list, not cut
- [ ] Mega menu carrying real slab thumbnails, per the design direction

## 3. Blocked on Beco, not on code

None of these are build tasks. They are the difference between a finished site
and a nearly finished one.

- [ ] **Office accessories cannot import.** All 27 photographs sit LOOSE in the
      category folder with no product subfolders, so there is nothing to name a
      product after. The pipeline reports rather than guesses, which is
      correct. Noel needs a folder per product. This is exactly what
      `docs/CONTENT-CONVENTIONS.md` was written for
- [ ] **The handles price list is a supplier cost sheet, not a retail list.**
      `BECO HANDLES 2 PRICELIST-1 (3).xlsx` has codes like `A7355-96（H52）`,
      Chinese colour names, pack quantities, and a second sheet of unit costs
      that look like USD. Which column is the KES retail price is not stated,
      and the codes do not match the photographed folder names. **Do not load
      it without Beco confirming**, or the site ships guessed prices
- [ ] `BECO Product Prices-1 (1).pdf` also unprocessed
- [ ] Statuario, Statuario Gold and Taj Mahal are priced but have no
      description. Cyprus Grey has a description but no product row and no
      photography
- [ ] **Client names for the projects page.** Brown mentioned Art Caffe and
      Hass Consult from memory. NOT published: the `clients` table has a
      `has_permission` flag and a constraint enforcing it, because some
      corporates prohibit being named contractually. Needs written permission
- [ ] Social handles. `SOCIAL` in `apps/storefront/src/lib/site.ts` has five
      platforms drawn and all five URLs null, so they render as unclickable
      placeholders. One line each once the handles arrive
- [ ] The old beco.co.ke URL list, for the 301 redirect map. **The largest
      ranking risk in the project** and still not received
- [ ] Confirm the header may use the logo MARK alone with INTERIORS set beside
      it. The supplied lockup is stacked and its descriptor would be about four
      pixels tall at header height

## 4. Technical debt and known limits

- [ ] **Video transcoding is manual.** Beco's 52 clips are portrait QuickTime
      `.MOV` at 8 to 80MB. One was converted by hand with macOS `avconvert` to
      1.7MB of MP4 for `/video/showroom.mp4`. The step belongs in the import
      pipeline and needs **ffmpeg installed**
- [ ] **HEIC decoding is macOS only.** Sharp's prebuilt binary cannot read
      iPhone HEIC, so the pipeline shells out to `sips`. That does not exist on
      Linux, so **CI cannot process HEIC** until Sharp is built with libheif.
      See `tools/drive-import/src/decode.ts`
- [ ] **Two slabs exceed the 1600px image budget** even at the quality floor.
      Reported as import issues rather than silently shipped. Likely wants those
      two sources reshooting. See D46
- [ ] Scroll driven effects are Chromium only. Parallax, the pinned rail, the
      Bookmatch Open reveal and the coverflow all use `animation-timeline`,
      absent in Safari and Firefox. Reveals, wipes, card flips and the hover
      gallery run everywhere because they go through `ScrollMotion`
- [ ] `Field` and `Input` still live inside the quote form rather than
      `@beco/ui`. They are used twice now, so rule 5 applies
- [ ] The 16px type floor lint rule is still not written
- [ ] SVG logo. No `pdftocairo`, `inkscape` or `rsvg` on this machine, so the
      header uses a PNG

## 5. SEO not yet finished

- [ ] Validate every JSON-LD block in Google's Rich Results Test. Product now
      emits a real price and `InStock`, so these pages are rich-result eligible
      and worth checking properly
- [ ] `ItemList` on category grids
- [ ] The 301 redirect map, blocked above
- [ ] Pre-migration baseline: current traffic, indexed page count and positions
      for the five target terms. **This stops existing the moment DNS moves**

## 6. Verification owed

Nothing in this section has been done, and the milestone cannot close without
it.

- [ ] **Nothing has been checked by hand on a real phone.** No iOS, no Android.
      `docs/QA-CHECKLIST.md` has not been walked
- [ ] Reduced motion has not been toggled and looked at
- [ ] Lighthouse has never been run against these pages. The budgets are LCP
      under 2.0s, CLS under 0.05, home under 1.0MB, product under 1.2MB
- [ ] The interaction inventory in `docs/QA-CHECKLIST.md` is not filled in for
      any storefront screen, which D35 requires before the milestone closes
- [ ] Codex's review pass has not run
- [ ] A quote has never been submitted from the actual browser form. The server
      action is covered by nine integration tests against the real database,
      but the form itself has not been used by a person

## 7. Decisions taken this session

Recorded in `docs/DECISIONS.md`, listed here so they are not missed: D46 image
budgets, D47 whole taxonomy seeded including Lighting, D48 unlinked social
profiles are drawn not linked, D49 the announcement bar is not dismissible,
D50 prices include VAT so quotes back it out, D51 the showroom section is built
for portrait video.

**D50 is the one to remember.** A3 assumed VAT was added to a net subtotal. It
is not: Beco's prices include it. On a 65,000 slab the VAT inside the price is
8,965.52, not 10,400 on top. The M5 quote document must back it out, and adding
it would overstate every quote by 16%.
