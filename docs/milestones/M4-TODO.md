# M4: Storefront

Per CLAUDE.md rule 8. **Ticked only when checked against reality, not when written.**

Status key: `[x]` verified · `[~]` built but not yet verified · `[ ]` not started

Verification for this milestone was done against a running dev server on
`localhost:3000` and against the local Supabase database, on 1 September 2026.

---

## Pages

- [x] `/` home. Pinned split hero per D30, stat band, range grid, application showcase,
      numbered process list, category browse. **Verified:** 200, LocalBusiness JSON-LD parses,
      17 images, h1 present
- [x] `/shop`. **Verified:** 200, renders all 27 products, category nav present
- [x] `/shop/[category]`. **Verified:** 200 on `12mm-sintered-stones`, breadcrumb JSON-LD parses
- [x] `/product/[slug]`. **Verified:** 200 on `amber-jade`, Product and BreadcrumbList JSON-LD
      both parse, 6 gallery images, all four image URLs return 200 with real bytes
- [x] `/quote`, the builder and submission. **Verified:** 200, renders the empty state
- [ ] `/team`, sales agents only. **Directors are never flagged public**
- [x] `/about`. **Verified:** 200. Claims no history Beco does not have: the prototype said
      "10+ Years in Nairobi" while the client's own guideline says "a new entrant into the
      market newly launched". The page leads on stock on the ground instead
- [x] `/contact`. **Verified:** 200. NAP matches the footer and the JSON-LD exactly. No
      response time promise, because the prototype claimed two hours in five places and
      twenty four in a sixth and nobody has confirmed which is real
- [x] **The full taxonomy seeded**, fifteen categories rather than the two that happened to
      have photography. Each empty one gets a designed page and stays noindex and out of the
      sitemap until it holds products, per D27. See D47
- [x] `/gallery`, the project gallery. All 71 real installation photographs, interleaved
      across products so no single stone takes the first screen. Delfone alone has ten
- [x] Custom 404 routing back into the catalogue. **Verified:** returns 404 and renders
- [ ] Custom 500

## Brand assets

- [x] Logo mark and stacked lockup derived from the brand pack PNG, not the CMYK PDF
- [x] Header carries the real mark, not a typeset approximation
- [x] Footer carries the full white lockup
- [x] `icon.png` and `apple-icon.png`, so no framework default favicon is ever served.
      **Verified:** both 200, and the head references them
- [ ] SVG logo derived from the vector source. No `pdftocairo`, `inkscape` or `rsvg` on this
      machine, so this needs a tool installed or the SVG requesting from the designer
- [ ] Confirm with Beco that using the mark alone in the header, with INTERIORS set beside it
      rather than beneath, is acceptable. The supplied lockup is stacked, and at a 60px header
      height its descriptor would be about four pixels tall

## Chrome

- [x] `SiteHeader`, sticky, nav, business line per D39, quote counter. **Verified** rendering
- [x] `SiteFooter` as a genuine closing section, not link columns. NAP block for local search
- [x] `MobileActionBar`, quote primary, WhatsApp secondary, call tertiary per D26
- [x] Announcement bar per D36. Server rendered so its height is part of first paint, and
      dismissal is a COOKIE rather than localStorage, so the server already knows on a later
      visit and there is no shift after paint. Keyed on the announcement id, so a new one
      reappears. Scheduling is enforced by the RLS policy rather than by the query, so a live
      window is the database's guarantee. **Not dismissible**, per D49: it retires on its own,
      so a close control only let a visitor silence something still current. **Verified:** bar
      renders, no close control, and the call to action navigates
- [x] Brightex credit in the footer, linking to www.brightexsolutions.co.ke
- [x] About carries a dropdown: About Beco, Projects, The showroom. Opens on hover for a
      pointer and on click or Enter for everything else, escape returns focus to the trigger,
      arrows walk the items, click outside dismisses. Every destination exists
- [ ] Mega menu with real slab thumbnails
- [x] **Mobile navigation.** The nav was `hidden md:block`, so on a phone there was no way to
      reach Shop, Projects, About or Contact at all, and the only route home was knowing the
      logo is a link. Panel lists Home explicitly, traps focus, escape returns focus to the
      trigger, locks the page behind it and closes on navigation. **7 tests**

## The quote flow

- [x] `quote-list.ts`, localStorage, prototype's `beco_quote_cart_v1` key. **11 tests**
- [x] `AddToQuote`, quantity plus add. **4 tests**, asserting the list actually changed
- [x] `QuoteCounter` in the header
- [x] `submitQuote` server action, zod validated, products resolved server side
- [x] **Submission verified end to end** by integration test against the local database: the
      row exists, the items exist, the reference is minted, the quote arrives unowned, and a
      crafted request cannot supply its own description or price. **7 tests**
- [ ] Confirmation email through Resend
- [ ] Rate limiting on the endpoint (Cloudflare rule, needs M1 DNS)

## SEO, per D25 and the seo-checklist skill

- [x] Metadata API on every route built so far, with title template
- [x] Canonical on `/shop`, `/shop/[category]`, `/product/[slug]`, `/quote`
- [x] `meta_title` and `meta_description` overrides honoured on products
- [x] JSON-LD: LocalBusiness, Product with Offer, BreadcrumbList. **Verified by parsing**
- [x] D27 automatic index gating: `robots: noindex` when `product_count === 0`
- [ ] Validate every block in Google's Rich Results Test
- [x] `sitemap.xml` from the database, `robots.txt`. **Verified:** 33 URLs, only categories
      that hold products, `/quote` excluded from both
- [ ] D29 filter canonicalisation. **No filters exist yet**, so this is not yet applicable
- [ ] `ItemList` on category grids
- [ ] The 301 redirect map. **Blocked:** the old URL list has not arrived
- [ ] Three blog articles seeded through a migration

## Design system additions

- [x] `Reveal`, fade plus 16px rise, once, collapses under reduced motion
- [x] `CountUp`, renders the real number server side and only animates up to it
- [x] `buttonClasses` exported, so a button-styled link stops being hand copied.
      **Six duplicates removed**
- [x] `Button` forwards a ref
- [x] `ConfirmDialog` **rewritten from the M3 scaffold into a working dialog**. The scaffold
      rendered unconditionally and its Cancel button was wired to nothing, which was itself a
      decorative control under rule 3. **9 tests** covering escape, backdrop, focus placement
      and the focus trap
- [x] `WordReveal`, the hero headline word by word. Pure CSS and a server component, so the
      most important sentence on the site does not wait for hydration to become visible
- [x] `motion.css`: CSS scroll driven parallax, scale and crop, and rise. No scroll handler,
      so none of it costs INP
- [x] `ProductCard` gains a `frame` variant, so a lead tile is not cropped to 4:5
- [x] `CardDeck` in `@beco/ui`, extracted from the room stack so the same physical language
      is available anywhere. Auto dealing on the home page, reader driven on the product page
- [x] Product gallery rebuilt on the deck. A strip has to reserve room for every image, so a
      three image gallery and a six image gallery look like different components, and a fifth
      of the catalogue has only three. A deck is one card's worth of space whatever it holds
- [x] Rail cards became specimens: charcoal plate, name, number in the set, shadow, and a four
      step vertical rhythm. They were bare images in a flat row, which read as a contact sheet
- [x] Completed interiors section between the count and the range, built from the 71 real
      installation photographs across 25 products. Answers "what does it look like in a room"
      before the page asks anyone to browse a grid
- [ ] `Field` and `Input` extracted from the quote form into `@beco/ui`
- [ ] 16px floor lint rule
- [ ] SVG logo derived from the vector PDF

## Motion, per D31 and D32

- [x] Pinned split hero on native `position: sticky`, no scroll hijacking, image bleeding to
      the viewport edge while the type column stays on the 1380px grid
- [x] Word by word headline reveal, once, on load, nowhere else
- [x] Parallax on the hero slabs, capped at 8% travel
- [x] Scale and crop on the application showcase
- [x] Pin dropped entirely on mobile, replaced by a snap scroll sequence
- [x] Reveal with 60ms stagger across grids
- [x] Count up on the stat band
- [x] Category rail, pinned with horizontal translate. Twelve stones cross in one screen,
      on sticky plus a scroll driven transform, so the scrollbar still behaves and a fast
      flick reaches the footer. Falls back to a hand scrollable snap row
- [x] Motion dialled up on request, 1 Sep: reveal travel 28px to 52px, heading wipes from
      the baseline, photographs settle out of a 1.16 crop, grid images drift against their
      frames, scale and crop range widened
- [x] Parallax at depth, per D31, on the completed interiors section. Three rates across an
      offset grid, so the group sits at three distances rather than on one plane. This is the
      section that earns the effect rather than the hero borrowing it
- [ ] Cut out hardware parallax. **Content dependency**, nothing is background removed
- [ ] Verify by hand: reduced motion, and no pinning on a real phone

## Real product data, 1 September 2026

Irene supplied both missing pieces, which closes A9 and the largest content risk on the build.

- [x] **Prices for all 24 stones**, KES 60,000 to 95,000 per slab, with slab size
      3200 x 1600 x 12mm, unit and availability. The catalogue is no longer POA: products
      carry a real price, `in_stock`, and the Product schema now emits a price with
      `InStock`, which makes these pages eligible for rich results
- [x] **Descriptions for 21 of them**, with finish, body composition and face type. Face type
      now comes from Beco's own document rather than being inferred from whether a BOOK MATCH
      photograph happened to exist
- [ ] Statuario, Statuario Gold and Taj Mahal are priced but have no description yet
- [ ] Cyprus Grey has a description but is not in the sheet and has no photography
- [ ] Two more price lists to process: `BECO HANDLES 2 PRICELIST-1 (3).xlsx` and
      `BECO Product Prices-1 (1).pdf`
- [x] Video in view is BUILT: autoplays muted at 50% visibility, pauses the moment it leaves,
      poster always set, no autoplay under reduced motion. `media-src` added to the CSP
- [ ] **Beco's footage is not web ready.** Ten or more `.MOV` files landed in Drive on 31
      August at 42 to 78MB each. QuickTime containers play unevenly across browsers and a
      45MB file on a Nairobi mobile connection is unusable, so they need transcoding to MP4
      and WebM at roughly 2 to 5MB per loop with a poster frame extracted. **ffmpeg is not
      installed on this machine**, so that step cannot run here yet
- [x] **HEIC is decodable now.** Sharp's prebuilt binary cannot read iPhone HEIC and was
      skipping 124 photographs, which was all of Beco's hardware range. Converted through
      macOS `sips` first, detected by MAGIC BYTES rather than by filename: extension matching
      failed silently three runs in a row because the path carried through the pipeline is not
      always the leaf file. Handles went from 2 products to 6. **Linux CI still needs a Sharp
      build with libheif**
- [ ] **Office accessories cannot import yet.** All 27 photographs sit loose in the category
      folder with no product subfolders, so there is nothing to name a product after. The
      pipeline reports rather than guesses, which is correct, but it needs Noel to create a
      folder per product. This is what `docs/CONTENT-CONVENTIONS.md` exists for
- [ ] **The handles price list is a supplier cost sheet, not a retail list.** Codes like
      A7355-96(H52), Chinese colour names, pack quantities, and a second sheet of unit costs
      that look like USD. Which column is the KES retail price is not stated, and the codes do
      not match the photographed folder names. Loading it would put guessed prices on a live
      site, so it needs Beco to confirm before anything is imported

## Found during this milestone, not planned

- [x] **Rail cards told a lie.** Every card read "Sintered stone, 12mm" because the line was
      hardcoded, so a brass handle was labelled as stone. On a site aimed at specifiers who
      check, that is a wrong spec rather than a typo. Products now carry their real category
      and the hero card had the same hardcoded claim removed
- [x] **The hero's LCP image was being animated on entry**, which the motion rules forbid
      because animating the largest contentful paint is a direct way to delay it. The first
      card no longer flips in; it gets a slow ambient drift that starts 1.6s after paint

These were discovered while building and are recorded rather than remembered.

- [x] **Two category rows for one Drive folder.** The seed wrote slug
      `sintered-stones-12mm`, the importer derived `12mm-sintered-stones`, and `source_path`
      was being set to the slug rather than the folder. The empty duplicate would have shipped
      as a real page. Migration 11 merges them, makes `source_path` the identity with a unique
      constraint, and repairs provenance from `import_files`. **Verified:** one category, 25
      products, `source_path = '12MM SINTERED STONES'`
- [x] **The importer overwrote commercial fields on every run.** `price_display_mode`,
      `availability`, `unit` and `is_published` were in a blind upsert, so the first nightly
      import after Beco priced a product would have reset it to POA and republished anything
      they had hidden. Now it inserts defaults on first sight and thereafter updates only
      name, category, images and provenance
- [x] **Seven packages declared a `typecheck` script with no `tsconfig.json`**, so `tsc` printed
      its help text and exited non zero. Those seven had never been typechecked. All now have
      one, all nine pass, and `tools/setup/assert-typecheck.mjs` fails CI if it recurs
- [x] **`server-only` was imported but never declared as a dependency**, so the guard keeping
      the service role key out of client bundles resolved only by hoisting accident
- [x] **Image budgets were warned about, never enforced.** Now encoded to a byte budget with a
      quality ladder down to a floor. See D46 below
- [x] **jest-dom matchers were never loaded** in `vitest.setup.ts`, and the oxc JSX transform
      was misconfigured for `apps/`, so no component test in an app could have run
- [x] **Tailwind never scanned `packages/ui`.** Its source detection starts from the app
      directory, so every class used only inside the design system was dropped from the
      stylesheet. It failed loudly in one place and invisibly everywhere else: the primary
      "Request a quote" button carried `bg-warm-red-deep text-high-vis-white` and rendered
      white text on white, so the main call to action was present, correctly classed and
      impossible to see. Fixed with an explicit `@source`, guarded by a test
- [x] **The public quote form could never have worked.** Anonymous can insert a quote but
      cannot select one, and PostgREST adds RETURNING whenever the caller asks for the new
      row, so asking for the reference number failed the whole insert. Replaced with a single
      security definer function, `submit_quote`, which is atomic and resolves products from
      the catalogue so no request can put its own description or price on a line
- [x] **Two `@media` blocks with identical conditions get merged, and the first one's
      contents were dropped.** Cost the headline animation until the blocks were collapsed
- [x] **The logo's PDF is CMYK.** It rasterises to `#d9232a` through sips, with or without a
      forced sRGB profile, while the guideline and `tokens.css` both say `#ed1c24`. The
      supplied PNG is exactly `#ed1c24`, so the PNG is the source of truth for derived assets
      and the PDF is not used
- [ ] **Two slabs cannot meet the 1600px budget** even at the quality floor. Reported as import
      issues. Needs a look before launch, see D46

## Definition of done, per CLAUDE.md rule 8

- [ ] Every todo above verified
- [ ] Interaction inventory complete in `docs/QA-CHECKLIST.md` for every storefront screen
- [ ] `docs/QA-CHECKLIST.md` walked on a real phone
- [ ] Lighthouse meets every budget with the choreography live
- [ ] Codex review pass run, findings resolved or explicitly deferred
- [ ] Documentation written
