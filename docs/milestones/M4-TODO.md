# M4: Storefront

> **Starting a new session? Read `docs/milestones/M4-HANDOVER.md` first.**
> It is the short list of what is NOT done and why, including what is blocked
> on Beco rather than on code.

Per CLAUDE.md rule 8. **Ticked only when checked against reality, not when written.**

Status key: `[x]` verified · `[~]` built but not yet verified · `[ ]` not started

Verification for this milestone was done against a running dev server on
`localhost:3000` and against the local Supabase database, on 1 September 2026.

---

## Pages

- [x] `/` home. Pinned split hero per D30, stat band, range grid, application showcase,
      numbered process list, category browse. **Verified:** 200, LocalBusiness JSON-LD parses,
      17 images, h1 present
- [x] `/shop`. Search, category and finish facets, and price sort, with the URL as the source
      of truth so the grid stays server rendered and every filtered view is shareable.
      **Verified:** 31 cards bare, 2 for `?q=calc`, 6 for `?category=handles`, 4 for
      `?finish=Polished`, and price-desc orders 95,000 then 85,000 then 75,000
- [x] `/shop/[category]`. **Verified:** 200 on `12mm-sintered-stones`, breadcrumb JSON-LD parses
- [x] `/product/[slug]`. **Verified:** 200 on `amber-jade`, Product and BreadcrumbList JSON-LD
      both parse, 6 gallery images, all four image URLs return 200 with real bytes
- [x] `/quote`, the builder and submission. **Verified:** 200, renders the empty state
- [x] `/team`, sales agents only. **Directors are never flagged public**, held by the
      `users_only_sales_are_public` constraint rather than by the query. **Verified:** 200,
      renders the empty state because nobody is flagged public yet, and carries `noindex`
      under the same gate as an empty category. It flips on its own when Beco publishes an
      agent, and the sitemap entry appears with it
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
- [x] Custom 500. Two of them: `error.tsx` inside the layout, which keeps the header and
      offers a real `reset()` retry plus WhatsApp and the business line, and
      `global-error.tsx` for when the root layout itself throws, which brings its own html,
      body and tokens and is deliberately plain because everything it depends on is another
      thing that can be broken when it is needed

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
- [ ] Mega menu with real slab thumbnails. **Deferred**, not cut: the range browse on /shop
      now carries the hierarchy with real photography, so the mega menu is a second way to do
      what the shop already does. Worth building after the header lockup is confirmed
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
- [x] D29 filter canonicalisation. Filters exist now, and every filtered view canonicalises to
      `/shop` and carries `noindex`. **Verified:** `?category=handles` is noindex with
      canonical `/shop`, while bare `/shop` has no noindex at all
- [x] `ItemList` on category grids. **Verified:** emitted on `/shop/12mm-sintered-stones`
      and on the group pages, with `numberOfItems` matching the rendered grid
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
- [~] **The deck was NOT extracted into `@beco/ui`.** Corrected on 3 September by walking the
      list against the code rather than the notes: there is no `CardDeck` anywhere. What is
      shared is the CSS, `.beco-stack-card` in `motion.css`. `RoomStack` lives in
      `apps/storefront/src/components/` and is used on BOTH the home page and About, so rule 5
      applies and is currently unmet. Extracting it means decoupling it from `next/image` and
      the products type the way `ProductCard` already is, which is a real refactor on the two
      pages that matter most, so it is recorded rather than rushed at the end of a session
- [x] Product gallery holds one card's worth of space whatever it contains. A strip has to
      reserve room for every image, so a three image gallery and a six image gallery look like
      different components, and a fifth of the catalogue has only three. **Corrected on 3
      September:** it is a crossfade in a fixed frame, not the card deck this line previously
      claimed. The outcome is the one that was wanted; the mechanism was written down wrong
- [x] Rail cards became specimens: charcoal plate, name, number in the set, shadow, and a four
      step vertical rhythm. They were bare images in a flat row, which read as a contact sheet
- [x] Completed interiors section between the count and the range, built from the 71 real
      installation photographs across 25 products. Answers "what does it look like in a room"
      before the page asks anyone to browse a grid
- [x] `Field`, `Input`, `Select` and `Textarea` extracted into `@beco/ui`. The filter bar
      rebuild made it a third copy, so rule 5 applied twice over. **10 tests**, and **5 more**
      on the quote form proving the labels still reach their controls and the `name`
      attributes the server action reads survived the refactor
- [x] 16px floor lint rule, `pnpm check:type-floor`, in CI. **Writing it corrected a wrong
      assumption:** the floor is not held by policing `text-xs` at call sites, it is held by
      REDEFINING Tailwind's scale in `tokens.css`, where `--text-xs` is 14px rather than 12px
      and `--text-sm` is 16px rather than 14px. The first version of the rule flagged seven
      false positives before that was checked. So the guard watches the tokens, a token going
      missing, arbitrary `text-[13px]` values and raw `font-size`. **Verified both ways:**
      passes clean on 104 files, and fails with the right message when `--text-sm` is lowered
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

## Raised by Brown, done on 3 September

- [x] **The shop's top section reads as designed now.** It was an eyebrow, a heading and a lede
      on white, which is a document rather than a shop front. Same construction as `/contact`:
      a charcoal band with a real slab behind it at 30%, the display headline, and three facts
      stated rather than counted up. **Verified:** 200, h1 present, hero image renders
- [x] **The filter bar was rebuilt.** It was two rows of loose text facets that worked and
      looked like a debug view. One aligned control row on a charcoal rule now, with the range
      as a GROUPED select so fifteen categories fit in one control and the hierarchy is visible
      while choosing rather than only after, and what is active stated back as removable chips
      so a reader landing on a shared filtered URL can see why they are looking at six products
      instead of thirty. **Verified:** bare 30, `?range=hardware` 6, `?category=handles` 6,
      `?finish=Polished` 4, and every filtered view still noindex with canonical `/shop`
- [x] **Category and subcategory browsing.** `categories.parent_id` is used at last: five
      groups above the fifteen Drive folders, with Lighting staying top level by design. The
      shop leads with a Browse by range section carrying real photography per group and its
      child ranges as links, and `/shop/<group>` is a real page showing the ranges beneath it
      and everything in them. **Verified:** `/shop/sintered-stone` 24, `/shop/hardware` 6,
      `/shop/wall-panels` 0 and noindex, breadcrumbs carry the group level. **11 tests** on the
      tree and the index gate, **9 pgTAP tests** on the depth trigger. See D52
- [x] **`/shop/[category]` no longer has an empty right-hand column.** The description ran down
      the left at a capped measure with nothing opposite it. A photograph and a facts list hold
      the right column now, and on a range with no photography the facts hold it alone
- [x] **The gallery has its own entrance.** Each item assembles rather than appearing: the
      frame and its hairline edge are drawn first and stay put, the photograph wipes up into
      that frame from behind its own bottom edge, and the caption plate rises out from under it
      a beat later. The wipe sits on a wrapper, not on the image, because the image already
      carries the depth parallax and two animations on one transform fight rather than compose.
      All of it inside `prefers-reduced-motion: no-preference`, `.beco-clip` included
- [x] **WhatsApp product enquiry re-checked after the layout fix.** **Verified:** the control
      opens `wa.me/254722333730` prefilled with the product name, confirmed on two products.
      The SKU half of the message is untested against real data because no product carries a
      SKU yet, 0 of 31, so that branch has never rendered
- [x] **`/product/delfone-12mm` looked wrong for a reason.** Not a layout problem at all: see
      the Delfone finding below

- [x] **The mobile opening screen was black text on white.** Raised by Brown from a real
      phone: no material, no motion, nothing above the fold but a paragraph. The stone is the
      background below lg now, the type sits over it in white, and the specimen cards follow.
      Fixing it also removed a control that could never have worked: the slab indicator tracks
      the desktop panel column, which is `display: none` on mobile, so it sat permanently on 01
      naming the wrong slab. See D55. **Verified:** markup renders, one 800px derivative shared
      between the background and the first card. **Still needs the real device walk to judge**

- [x] **The hero slabs ride an orbit.** Raised by Brown: the effects were basic and the site
      should feel like a designer made it. The cards travelled straight up a column, which is
      what a browser gives you for free. They now swing in from below on the far side of an
      axis standing off the right edge, turn to face the reader at the middle, and turn away as
      they leave, with a deliberate dwell at focus so the range does not strobe. See D56.
      **Verified:** stage and four orbit panels render, keyframes ship, guards intact.
      **Not yet seen moving on a real machine**, and the still fallback on Safari is a real
      device question

- [x] **Submitting a quote landed the reader in the footer.** The confirmation is a fraction
      of the height of the form and list it replaces, so the page collapsed under them and the
      browser kept the old scroll offset. On a list of any length that means being given a
      reference number you never see. It is brought into view and takes focus now, so it is
      announced rather than silently swapped in. **2 tests**, on the flow that matters most
- [x] **The photograph strip ran off the side of the product page.** Built for the stones at
      three to six images, then the hardware arrived at 33 to 36. Two densities now: the fan up
      to eight, a contained scrollable snap row above it. **6 tests.** See D58
- [x] **The range rail was pinned and read as the page seizing.** Replaced with a track that
      drifts on its own, out and back, pausing on hover and on focus, with the hovered card
      lifted and the rest dropped to 42%. Removes a Chromium only dependency rather than adding
      one. See D57

- [x] **A whole section that is just the film**, on `/gallery`, framed to the footage's own
      portrait shape rather than stretched wide. No stock clip stands in for a second one. See
      D63
- [x] **Gallery cards cycle through the same stone's other photographs on hover**, itself first
      so nothing jumps at the start, capped at four. Fixed a live selector that would have gone
      dead silently for hover-enabled cards, and a real bug in the extracted interleave helper
      that dropped falsy array elements. **9 tests.** See D64

- [x] **The sticky filter bar made mobile worse.** Pinning the whole four field bar under the
      header meant it, the fixed action bar, and the keyboard together left almost nothing of
      the grid visible. Scoped to `lg:sticky`, desktop only. See D65

## Found on 3 September, not planned

- [x] **`pnpm db:reset` was broken, and the database was not reproducible.** Two faults, both
      invisible because nobody had rebuilt from scratch. `seed.sql` referenced a hardcoded
      category id that migration 13 had already claimed under a generated uuid, so every
      product insert failed its foreign key and the seed aborted outright. And migrations run
      BEFORE the seed, so migration 15, carrying every real price and description, updated
      products that did not exist yet and applied to nothing. A fresh clone got twenty four
      nameless POA rows. Catalogue rows moved into migration 20 with their commercial data
      attached. **Verified:** a fresh reset now gives 24 products, 24 priced, 21 described,
      where it previously gave 24, 0 and 0. See D54

- [x] **"Delfone 12mm" was seven products in a trenchcoat.** Delfone is a SUPPLIER. The folder
      holds Bosnia Grey, Bulgaria Black, Calacatta Macchia, Martha Brown, Statuario, Taj Mahal
      and Verde Lepanto as loose files named after the stone, so the importer made one product
      out of seven: nineteen photographs of black, white, green and brown stone in one gallery,
      every one captioned with the wrong material. This is why Statuario and Taj Mahal read as
      priced but unphotographed, their photography was in here. The pipeline now detects and
      reports it, refuses to publish a flagged folder, and migration 22 unpublishes the
      existing row. **Verified:** the detector fires on exactly one folder across the whole
      Drive and names all nine subjects, `/product/delfone-12mm` now 404s. **10 tests**.
      See D53. **Blocked on Beco** for the folder reorganisation

- [x] **The importer silently fell back to FIXTURE mode with no credentials.** `tsx` loads no
      env, so `pnpm drive:import --dry-run`, which `docs/SETUP.md` gives as the way to verify
      Drive access, passed against fixtures on a machine that had never been near Drive. It
      loads the root `.env.local` now and says out loud when it is falling back. `dotenv` was
      also declared as a real dependency rather than resolved by hoisting accident, which is
      the same bug `server-only` had

- [x] **Two `submit_quote` functions were live at once.** `create or replace function` cannot
      change a signature, so migration 18 added a second one rather than replacing the first,
      and both stayed granted to anon: two public entrances to the quote system, one of which
      discards the installation and samples the customer asked for. It also made any short call
      ambiguous with 42725. Dropped in migration 21, with a test asserting exactly one exists

- [x] **A pgTAP test had been failing since migration 12.** `02_anon_rls` still asserted the
      direct insert policy that migration 12 deliberately dropped. Rewritten to prove both
      halves: anon cannot insert a quote directly, and anon CAN go through `submit_quote`.
      `pnpm db:test` is green again, 56 tests

- [x] **The catalogue queries had drifted.** `/shop/[category]` selected neither `specs` nor
      the category join, so the same ProductCard showed a finish and its range on `/shop` and
      neither on a category page. One column list now serves every catalogue query

## Definition of done, per CLAUDE.md rule 8

- [ ] Every todo above verified
- [ ] Interaction inventory complete in `docs/QA-CHECKLIST.md` for every storefront screen
- [ ] `docs/QA-CHECKLIST.md` walked on a real phone
- [ ] Lighthouse meets every budget with the choreography live
- [ ] Codex review pass run, findings resolved or explicitly deferred
- [ ] Documentation written
