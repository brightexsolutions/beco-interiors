# M4 handover: what is left

Rewritten 3 September 2026. This file is only what is NOT done, and why.
`docs/milestones/M4-TODO.md` is the full ticked list.

**State:** 203 Vitest tests across 28 files, 56 pgTAP tests across 6 files, 9 packages
typechecking, every built route 200. 30 published products, 24 priced, 21 described, 258
images, 15 ranges under 6 groups.

**Read this first if you are starting cold:** a database reset is TWO steps.
`pnpm db:reset` rebuilds the catalogue complete, because catalogue rows now live in migration
20 rather than in the seed, see D54. It does not bring back photographs: those are in R2 and
reach the database through `pnpm drive:import`, which takes about twenty minutes on a cold
cache. A reset alone leaves a catalogue with no pictures, and that is expected rather than
broken.

---

## 1. Raised by Brown, and now done

All seven are closed and verified. Kept here only so the next session does not re-derive them:
the shop opening, the filter bar, category and subcategory browsing, the empty right-hand
column on `/shop/[category]`, the gallery animation, and the WhatsApp product enquiry.

The seventh, "some single product pages still look wrong, `/product/delfone-12mm` was the
example", turned out not to be a layout problem at all. See section 3.

## 2. Pages and routes still missing

- [ ] Three blog articles, seeded through a migration, each targeting a named search term and
      linking into its category. On the D28 list, not cut. `/blog` is currently a 404 and
      `blog_posts` already exists with its published-needs-alt-text constraint
- [ ] Mega menu carrying real slab thumbnails. **Deferred rather than cut:** the range browse
      on `/shop` now carries the hierarchy with real photography, so a mega menu would be a
      second way to do what the shop already does. Worth revisiting once the header lockup is
      confirmed with Beco

## 3. Blocked on Beco, not on code

None of these are build tasks. They are the difference between a finished site and a nearly
finished one. Pulled fresh from `import_issues` on the most recent run rather than from memory,
3 September, because the previous version of this list undercounted the loose folder problem by
five categories.

- [ ] **The old beco.co.ke URL list, for the 301 redirect map.** Still the largest ranking risk
      in the project, and still not received
- [ ] **Six categories are stuck at zero products**, photographs sitting loose with no product
      subfolder underneath them: Door Locks, Furniture Legs, Kitchen Accessories, Hinges,
      Floating Shelf Accessories, and Office Accessories (27 photos). Each needs one folder per
      product, named exactly as it should appear on the site
- [ ] **`DELFONE 12MM` needs splitting into its real products.** Delfone is a SUPPLIER, not a
      stone. Nine products are named inside it as loose files: Bosnia Grey, Bulgaria Black,
      Calacatta Macchia, Martha Brown, Statuario, Taj Mahal, Verde Lepanto, Verde and Statuario
      again under a misspelling. **This is also why Statuario and Taj Mahal read as priced but
      unphotographed:** their photography has been sitting in this folder the whole time. The
      pipeline reports it on every run and refuses to publish a flagged folder, and migration 22
      unpublished the existing row, so nothing mislabelled is live. `docs/CONTENT-CONVENTIONS.md`
      section 1 shows Beco exactly what to do. See D53
- [ ] **`HEIXIN 12MM` has the same problem, nested one level too deep.** Seven products sit
      inside it as their own subfolders, correctly named, just one level below where the
      importer expects a product folder: Prada Green, Ink White, Hanting Jade, Apricot, Hermes
      Gold, Black Sandstone, Anakin. These just need moving up one level, not renaming
- [ ] **About 130 handle photographs are named with supplier codes, not shot type**, for
      example `537 160 BLACK` or `6832 64 BLACK`. Affects nearly the whole Handles range: Black
      Handles (36), Knobs (35), Gold Handles (33), Grey Handles (19), White and Leather Handles.
      Each needs renaming to `SLAB`, `SLAB ON STAND`, or `APP 1`, `APP 2`
- [ ] **A Drive folder called `FLUTED WALL PANELS` does not match anything in the taxonomy.**
      Worth confirming with Beco whether it is real and distinct from Acoustic, Bamboo or SPC
      panels before it is organised, because once it holds a product it will import as a new
      top level category with no group assigned. That needs a follow up migration on our side
      once Beco confirms what it is
- [ ] **The handles price list is a supplier cost sheet, not a retail list.**
      `BECO HANDLES 2 PRICELIST-1 (3).xlsx` has codes like `A7355-96（H52）`, Chinese colour
      names, pack quantities, and a second sheet of unit costs that look like USD. Which column
      is the KES retail price is not stated, and the codes do not match the photographed folder
      names. **Do not load it without Beco confirming**, or the site ships guessed prices
- [ ] `BECO Product Prices-1 (1).pdf` also unprocessed, same reason
- [ ] Cyprus Grey has a description but no product row and no photography
- [ ] **WPC or SPC.** The brand guideline says "WPC Wall Panels" throughout; Drive only has an
      SPC folder. Wood Plastic Composite and Stone Plastic Composite are different materials,
      so this is a factual product error either way it resolves
- [ ] **Is the "2 hour quote" claim real?** The prototype stated it in five places and stated
      24 hours in a sixth. The site currently states no response time promise at all, on
      purpose, until this is confirmed
- [ ] **No product carries a SKU**, 0 of 31. The product page's WhatsApp message is built to
      include one and that branch has therefore never rendered
- [ ] **Client names for the projects page.** The showcase itself is built: `/gallery` renders
      a "Delivered for" section from `clients` the moment a row is both published and permitted,
      same as the rest of the site gates on real data. Brown mentioned Art Caffe and Hass
      Consult from memory, but nothing is entered. NOT published: the `clients` table has a
      `has_permission` flag and a constraint enforcing it, because some corporates prohibit
      being named contractually. Logo, sector and a one line project description are all
      optional columns worth filling in once names are confirmed
- [ ] **Which gallery photo is residential and which is commercial.** Per Irene, Beco has done
      both. `ProductImage.project_type` and the gallery's own filter are built and tested
      (`projectTypeFacets` in `apps/storefront/src/lib/products.ts`), and the filter stays
      hidden until at least one photo carries a value, same gating principle as D27's category
      index. Nothing on any real photo is classified yet, and the import pipeline has no Drive
      naming convention to infer it from, so it has to be set by hand once Beco confirms each
      installation
- [ ] **Nobody is flagged public on `/team`.** The page is built, gated and correct, and it
      renders its empty state. It needs `is_public`, `public_title`, `public_phone` and a
      photograph per sales agent. Directors cannot be listed even by mistake, held by the
      `users_only_sales_are_public` constraint
- [ ] Social handles. `SOCIAL` in `apps/storefront/src/lib/site.ts` has five platforms drawn
      and all five URLs null, so they render as unclickable placeholders. One line each
- [ ] Confirm the header may use the logo mark alone with INTERIORS set beside it
- [ ] Brand guideline PDF pages 20 and 21 are device mockup images with no extractable text.
      Low priority: the design system already shipped without them, so this is a confirmation
      that nothing was missed, not a blocker

## 4. Technical debt and known limits

- [ ] **`RoomStack` is used on two pages and is not in `@beco/ui`**, so rule 5 is unmet. The
      M4 todo previously claimed a `CardDeck` had been extracted; walking the list against the
      code on 3 September found no such component. Extracting it means decoupling it from
      `next/image` and the products type the way `ProductCard` already is
- [ ] **Video transcoding is manual.** Beco's 52 clips are portrait QuickTime `.MOV` at 8 to
      80MB. One was converted by hand to 1.7MB of MP4. The step belongs in the import pipeline
      and needs **ffmpeg installed**
- [ ] **HEIC decoding is macOS only.** Sharp's prebuilt binary cannot read iPhone HEIC, so the
      pipeline shells out to `sips`. That does not exist on Linux, so **CI cannot process
      HEIC** until Sharp is built with libheif
- [ ] **Two slabs exceed the 1600px image budget** even at the quality floor, and 30 sources
      are below 1600px wide so their largest rendition is upscaled. All reported rather than
      silently shipped. Likely wants reshooting. See D46
- [ ] Scroll driven effects are Chromium only. Parallax, the pinned rail, the Bookmatch Open
      reveal, the hero orbit and the coverflow all use `animation-timeline`, absent in Safari
      and Firefox. **The hero orbit is the one that matters most**, because it is now the first
      thing a desktop visitor sees move, and on Safari it is a still column.
      Reveals, wipes, card flips and the hover gallery run everywhere because they go through
      `ScrollMotion`
- [ ] **No accessibility assertion library is wired in.** The `component` skill asks for
      `vitest-axe` and it is not installed, so accessibility is currently held by hand written
      assertions about labels, roles and focus
- [ ] SVG logo. No `pdftocairo`, `inkscape` or `rsvg` on this machine, so the header uses a PNG
- [ ] A reset costs a twenty minute re-import because `import_files` is wiped with the
      database, so every file looks new even though R2 already holds the derivatives

## 5. SEO not yet finished

- [ ] Validate every JSON-LD block in Google's Rich Results Test. Product emits a real price
      and `InStock`, so these pages are rich-result eligible and worth checking properly
- [ ] The 301 redirect map, blocked above
- [ ] Pre-migration baseline: current traffic, indexed page count and positions for the five
      target terms. **This stops existing the moment DNS moves**

`ItemList` is done. Index gating is now asked of the subtree and one helper backs both the
sitemap and the robots tag, so they cannot disagree. See D52.

## 6. Verification owed

Nothing in this section has been done, and the milestone cannot close without it.

- [ ] **Nothing has been checked by hand on a real phone.** No iOS, no Android.
      `docs/QA-CHECKLIST.md` now carries a full interaction inventory per screen with an honest
      status column, so this is a walk rather than a rediscovery
- [ ] Reduced motion has not been toggled and looked at
- [ ] **The rebuilt mobile hero has not been seen on a real phone.** It was changed in response
      to a screenshot, and the thing it is trying to fix is a judgement about how the opening
      screen feels, which a curl cannot answer
- [ ] Lighthouse has never been run against these pages. Budgets are LCP under 2.0s, CLS under
      0.05, home under 1.0MB, product under 1.2MB
- [ ] Codex's review pass has not run
- [ ] **A quote has never been submitted from the actual browser form.** The server action is
      covered by integration tests against the real database, and the form is now covered for
      rendering and for the `name` attributes the action reads, but the two have never been
      joined by a person
- [ ] Neither error page has been triggered, so `reset()` on the 500 is unproven

## 7. Decisions taken 3 September

Recorded in `docs/DECISIONS.md`: **D52** the taxonomy browses two levels deep, **D53** a folder
holding several products is reported and never split, **D54** catalogue rows live in a
migration rather than the seed, **D55** the mobile hero is image led rather than the desktop
hero reflowed, **D56** the hero slabs ride an orbit rather than a scroll.

**D50 is still the one to remember**, from the previous session. Beco's prices INCLUDE VAT. On
a 65,000 slab the VAT inside the price is 8,965.52, not 10,400 on top. The M5 quote document
must back it out, and adding it would overstate every quote by 16%.
