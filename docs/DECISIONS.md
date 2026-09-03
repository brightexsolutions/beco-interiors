# Decision Log

Running record. Each entry says what was decided, why, and what would reverse it. Full context
for D1 to D39 is in `files/BUILD-PLAN.md`.

Format: what, why, what would reverse it.

## D1 Fixed price path ends in an order record
No checkout and no payment UI, since payments are out of scope. Cart, then a short confirm
form, then an `orders` row with status pending plus notification. Payment arranged offline.
*Reverses if:* online payments come into scope.

## D2 The brand system governs the palette outright
The prototype was drawn before anyone had seen the guideline, so its warm cream, `#C8281E` red,
linen and gold are retired rather than blended. Charcoal Black, High-Vis White, Warm Red at
guideline values. What carries forward from the prototype is structure, not colour.
*Reverses if:* the client rejects the guideline palette on sight, which would be odd since it
is their own.

## D3 Titillium Web and Cormorant Garamond. Formula1 is never deployed
The supplied font pack contains only Formula1 Display, downloaded from blogfonts.com, which is
not a licensed distribution of Formula One's proprietary corporate typeface. Serving it from a
commercial client site is a real trademark exposure and Brightex would be the party serving it.
Titillium Web is the guideline's own other face and is free under the SIL Open Font License.
Formula1 remains only where already outlined as vector inside the logo artwork.
*Reverses if:* Beco produces evidence of a commercial licence. One token file changes.

## D23 No Playwright and no browser automation
Component interaction is Vitest plus React Testing Library in jsdom. UI journeys are verified
by hand against `docs/QA-CHECKLIST.md` on a real device. The cost is that nothing automated
walks a journey across page boundaries; that is absorbed by server action integration tests
covering the whole data path, component tests covering interaction within a page, and making
the human pass written and repeatable.
*Reverses if:* the manual checklist proves unreliable in practice.

## D35 No decorative controls
Every interactive element is proven to perform its operation, recorded per screen in an
interaction inventory, enforced by a lint rule on empty handlers and `href="#"`. A button that
looks right and does nothing passes every visual review, which is why it survives.
*Reverses if:* never.

## D43 Signature scroll section: Bookmatch Open, then Slab to Surface

Benchmarked against elegantfittings.co.ke, a **direct competitor** in the same market, whose
scroll section walks the viewer into a house.

**Corrected 31 August 2026 after inspecting it in DevTools.** An earlier read of the server
HTML found no canvas and concluded it was layered cross fading. That was wrong. There is a
`<canvas>`, created client side, and the assets are `hero-frames/frame_0001.webp` served at
1200w through 3840w. It is **frame sequence scrubbing**, the Apple product page technique:
dozens of numbered frames drawn to a canvas with the index driven by scroll progress.

**Their imagery is AI generated, not photographed.** The renders and the Dekton product naming
make that clear, so the earlier claim that their concept needs a photoshoot Beco cannot afford
was also wrong. They did not shoot it either.

Deliberately not copied, now for three reasons.

**Cost.** Frame sequence scrubbing means dozens of full width images. Even at 80KB each, forty
frames is 3.2MB before anything else on the page loads, and the canvas cannot paint until
enough frames are buffered. It is incompatible with an LCP under 2.0s on a Nairobi mobile
connection, and our performance budget is not decoration.

**Credibility.** Beco has real photography of real installations. A competitor showing
generated rooms that do not exist is an opening, not a standard to match. "Real Kenyan
projects" is a positioning advantage for a supplier whose whole claim is stock on the ground in
Nairobi.

**Differentiation.** A recognisable version of a competitor's signature moment reads as
following them, to exactly the audience that has seen both sites.

Beco's version is built from the `slab`, `on_stand`, `bookmatch` and `application` image roles
the import pipeline already resolves, which makes it different by construction rather than by
disguise, and means it scales to all 24 stones and every future category with no new design
work.

The bookmatch parting along its own mirror seam could only be a stone company's moment. Seven
stones have that shot today, so it runs once as the opening beat, with the repeating structure
carrying the rest.

*Reverses if:* the bookmatch parting reads as gimmicky on a real device, in which case the
section falls back to Slab to Surface alone, which stands on its own.

## D31 revised, 31 August 2026: pinning is kept on mobile

Originally all pinning was dropped on mobile. That was too absolute. Sticky based pinning is
not what makes mobile scrolling bad; scroll jacking is, and there is none here. Since mobile is
most of the traffic, the original rule would have built the signature moment for the minority.

Now: pinning is kept, with a capped scroll distance and three scenes instead of six. The native
scrollbar always behaves normally and a fast flick still reaches the footer. Reduced motion
still collapses everything to a stack.

*Reverses if:* it feels wrong on a real device during M4. The stacked fallback is built either
way, because reduced motion needs it.

Remaining decisions D4 to D22, D24 to D34 and D36 to D39 are recorded in
`files/BUILD-PLAN.md` and are migrated here as each becomes load bearing in the code.

## D46, 1 September 2026: image budgets are set per rendition, and encoded to

The plan carried two image budgets, a 60KB product card and a 150KB hero, and the pipeline
only ever **warned** when it missed them. Measured against the real catalogue, it missed them
constantly and nobody was reading the warnings.

Two changes.

**The encoder now targets a byte budget rather than a fixed quality.** Weight is driven by
entropy, not by width: at one flat quality Beverly Gold encoded to 72KB and Bvlgari to 613KB at
the same target width. So each rendition starts at the quality its width deserves and steps
down a ladder until it fits, stopping at a quality floor of 45 whether or not it got there. An
easy image keeps its quality; a heavily veined one pays for its detail. This costs a handful of
extra encodes per image, which is affordable precisely because it happens once at import and
never per request.

**The 1600px budget is set from measurement rather than from the plan.** A 44MB scan of heavily
veined sintered stone at 1600px and 150KB is roughly 0.06 bits per pixel, and it bands. It is
not achievable, and a budget that is permanently in breach is a budget that gets ignored. So
the three widths are budgeted by what they are actually for:

| Width | Role | Budget |
|---|---|---|
| 400 | Product card | 60KB, unchanged. Every stone now meets it |
| 800 | The LCP element on a phone, which is the device the LCP budget is measured on | 150KB, the original hero number, unchanged |
| 1600 | Desktop retina and gallery detail. Never the measured LCP element, and everything but the first is lazy loaded | 450KB |

Two slabs still exceed 450KB at 1600px even at the quality floor. They are recorded as import
issues rather than silently shipped, and they need a look before launch: the likely answer is
that those two sources want reshooting or downscaling, not that the budget is wrong.

*Reverses if:* Lighthouse shows the 1600px rendition is in fact the LCP element on the measured
profile, in which case the hero's largest served width gets capped instead of the budget raised.

## Open tension to resolve on a real device: the hero pin on mobile

D30 drops the hero pin entirely on mobile in favour of type then a swipe sequence, which is
what is built. D31 was later revised to **keep** pinning on mobile with a capped scroll
distance, on the grounds that mobile is most of the traffic and sticky is not what makes mobile
scrolling bad.

Those two do not currently agree for the hero specifically. The swipe sequence is built and
works, and D31's own revision says it reverses on how it feels on a real device during M4, so
this is settled by looking at it on a phone rather than by argument. Recorded so it is a known
open question and not an oversight.

## D47, 1 September 2026: the whole taxonomy is seeded, not just what is photographed

Only two categories existed, because a category was created by the import pipeline the first
time it found a product folder with images in it. The site therefore presented Beco as a
company that sells sintered stone and handles, when Drive has fourteen product folders and the
brand's own strapline names four pillars.

All fifteen are now seeded. Thirteen hold nothing yet, and that is fine, because the build
already handles it: each gets a designed "coming soon" page instead of a 404, and per D27 each
stays `noindex` and out of the sitemap until it actually holds published products, at which
point it flips on its own. Verified: `/shop/lighting` returns 200, renders the empty state and
carries `noindex`, while the sitemap lists only `12mm-sintered-stones` and `handles`.

`source_path` carries the Drive folder VERBATIM, including its misspelling of "ACCOUSTIC",
because that column is the identity the importer matches on. The display name is spelled
correctly, since "Accoustic Wall Panels" should not ship on a public page.

**Lighting is included even though it has no Drive folder**, which is a departure from D4's
rule that Drive folders are the taxonomy. It is named on every page of the brand guideline, in
the signage artwork and in the mission text, so a site with no lighting contradicts the
client's own identity. Carrying it as an empty category also means that the moment a LIGHTING
folder appears the pipeline fills this row rather than creating a second one.

*Reverses if:* Beco confirms the range has genuinely changed since April 2025 and lighting is
no longer sold, in which case the row is deleted and the strapline usage is revisited with
them.

## D48, 1 September 2026: unlinked social profiles are drawn, not linked

Beco's social handles have never been supplied. The approved prototype carried Instagram and
Facebook buttons and every one was `href="#"`, with one labelled "profile coming soon".

A dead link is a control that advertises an operation and does not perform it, which rule 3
forbids and a lint rule fails the build on. But an empty footer where social icons are expected
reads as unfinished.

So a profile with a URL renders as a link, and a profile without one renders as a `<span>`:
drawn, dimmed, labelled "profile coming soon", and not clickable. The row looks complete while
Beco confirms the handles, and there is still nothing on the page that looks clickable and is
not. Filling in `SOCIAL` in `apps/storefront/src/lib/site.ts` is the whole change.

## D49, 1 September 2026: the announcement bar is not dismissible

D36 specified a bar dismissible per visitor and remembered client side. It ships without a
close control.

The bar is already date scheduled, so it appears and retires on its own and cannot go stale.
The only thing a close button added was letting a visitor silence an announcement that is still
current, which is the opposite of what it is for. Beco would rather it stayed visible for its
whole window.

This also removes the cookie the dismissal needed, and with it a small amount of machinery: the
bar is now a server component with no client island at all, and its only interactive element is
the call to action, which navigates.

*Reverses if:* a long running announcement starts drawing complaints from repeat visitors, in
which case the dismissal returns as a cookie rather than as localStorage, for the CLS reason
recorded on the original implementation.

## D50, 1 September 2026: prices include VAT, so quotes back it out

Beco confirmed their prices are VAT inclusive. A3 assumed the opposite, that quote documents
would show VAT at 16% as a line added to a net subtotal, which is the usual trade arrangement.

The consequence is arithmetic, and it is the kind that is expensive to get wrong. On a 65,000
slab the VAT inside the price is 8,965.52, not 10,400 on top. Adding it would overstate every
quote by 16%, on a document that goes out on Beco's letterhead.

`vat_rate` and `prices_include_vat` live in `settings`, not in code, because the quote
document, the dashboard and the PDF all need the same answer and a rate change must not be a
deploy. The storefront now says "incl. VAT" beside every price, because a buyer comparing
against a supplier who quotes ex-VAT would otherwise read Beco as 16% cheaper than it is and
be surprised by the invoice.

## D51, 1 September 2026: the showroom section is built for portrait video

All 52 clips in Beco's SITE VIDEOS folder are portrait phone footage. None are landscape.

So the section is a tall frame beside the copy rather than the full bleed band it started as.
Cropping 9:16 into 21:9 throws away most of the picture, and the material is the subject.

The footage is Beco's own, transcoded from an 8 to 80MB QuickTime .MOV down to 1.7MB of MP4,
which fits the page budget on a Nairobi mobile connection. Stock film was the alternative and
it was the wrong one: a clip that reads as Beco's work without being it is a fabricated record,
on the page a buyer uses to decide whether to drive there.

The clip chosen is a finished vanity rather than one of the many showing an installation in
progress, with exposed carcasses and packaging still in the drawers. Those are honest but they
read as a building site.

*Reverses if:* Beco shoots landscape footage, in which case the band returns. The transcode
step is manual today and belongs in the import pipeline, which needs ffmpeg.

## D52, 3 September 2026: the taxonomy browses two levels deep

`categories.parent_id` has existed since migration 4 and was never used, so the shop offered
fifteen flat facets in a single row. That asks a reader to already know that "Bamboo Veneer
Wall Panels" is the thing they want. Nobody arrives thinking that. They arrive wanting panels.

Five groups now sit above the Drive folders: Sintered Stone, Wall Panels, Flooring, Hardware
and Accessories. Lighting stays top level with no children, because it is a pillar in the brand
guideline and a single Drive folder, and wrapping it in a group of one would be structure for
its own sake. The UI renders a childless top level category as itself, so there is no second
code path for it.

The groups are an EDITORIAL layer, not a Drive layer. There is no folder called "Hardware", so
a group carries `source_path = null`, which is what keeps the importer from colliding with it:
it upserts on `source_path`, and null is not a folder it will ever plan.

`/shop/<group>` and `/shop/<category>` are one route that branches, so every existing link,
breadcrumb and sitemap entry keeps the same URL shape. A group page shows the ranges beneath it
and everything in them.

Depth is fixed at two by a trigger rather than by convention, because the storefront's browse
tree assumes it and a third level would render as a group with neither products nor children.

D27's index gate is now asked of the SUBTREE. A group holds no products of its own, so counting
its own row would have kept "Sintered Stone" out of the index while the twenty five slabs
beneath it were indexed individually. The same rule in reverse: a group whose ranges are all
still being photographed is exactly as thin as an empty leaf, whatever buying guidance it
carries, so it stays out until one of them lands. One helper answers this for both the sitemap
and the robots tag, so the two cannot disagree.

*Reverses if:* the range grows a genuine third level, at which point the trigger and the tree
builder both change together.

## D53, 3 September 2026: a folder holding several products is reported, never split

`12MM SINTERED STONES/DELFONE 12MM` is a supplier folder. It holds Bosnia Grey, Bulgaria Black,
Calacatta Macchia, Martha Brown, Statuario, Taj Mahal and Verde Lepanto as loose files named
after the stone, so the importer, which trusts a folder name to be a product name, made one
product out of seven.

Nothing errored. What shipped was a page called "Delfone 12mm" with nineteen photographs of
black, white, green and brown stone in one gallery, every one captioned with the wrong
material, and the same wrong name on every gallery card those photographs produced. Six real
products never reached the catalogue, and two that did, Statuario and Taj Mahal, had their
photography sitting in here instead, which is why they read as priced but unphotographed.

The pipeline now detects it: among the files whose role resolved, strip the role words, the
digits and the folder's own words, and see what is left. In a correct folder nothing is left,
because the files are called SLAB, APP 1 and BOOK MATCH. More than one distinct subject means
the folder is naming its contents.

It is REPORTED, not split. "TAJ MAHAL POLISHED SLAB" could be a polished slab of Taj Mahal or a
product called Taj Mahal Polished, and guessing wrong puts a wrong specification in front of
the one reader who checks. This is the same principle as never guessing an image role.

The product is still created, so its provenance and photographs are recorded, but the importer
refuses to PUBLISH it. That refusal lives in the pipeline rather than in a migration on
purpose: a migration runs before the importer has created the row, so on a fresh environment an
unpublish would apply to nothing and the bad product would arrive live. Only the thing that
raises the flag can hold it.

*Reverses if:* Beco reorganises the folder, at which point the import creates the seven
products properly and the flag stops firing on its own.

## D54, 3 September 2026: catalogue rows live in a migration, not in the seed

`supabase db reset` did not reproduce this project, and had not for some time.

Two faults, both invisible because nobody had rebuilt from scratch. `seed.sql` referenced a
hardcoded category id that migration 13 had already claimed under a generated uuid, so every
product insert failed its foreign key and the seed aborted. And migrations run BEFORE the seed,
so migration 15, which carries every real price, description and spec, was updating products
that did not exist yet and silently applied to nothing.

The state everyone had been developing against existed only because it had been built up
incrementally over sessions. A fresh clone got twenty four nameless POA rows.

Catalogue rows are therefore not fixtures and no longer live in `seed.sql`. They are inserted
complete, with their commercial data attached, in a migration. The seed keeps what a seed is
for: settings, a live announcement, and fictional customers.

Migration 15 is left exactly as it was rather than corrected in place. On any database where
products already existed it did its job, and rewriting an applied migration to fix a later
discovery is how two environments stop agreeing. It is superseded, not repaired.

Images are the exception and stay with the importer, because they live in R2 and a seed cannot
honestly carry two hundred and fifty eight image records. A reset is therefore followed by
`pnpm drive:import`, which is now written down in the runbook rather than assumed.

*Reverses if:* the dashboard's product editor becomes the source of truth at M5, at which point
this migration becomes historical too.

## D55, 3 September 2026: the mobile hero is image led, not the desktop hero reflowed

D30 said type first on mobile, then a swipeable sequence. Looked at on a real phone, that
produced an opening screen of black text on white with no material on it at all: every slab sat
below the fold, so the first thing a visitor saw of a materials company was a paragraph.

Two things were making it worse than the layout intended. The top padding was 96px, which is
desktop breathing room on a 390px screen. And the slab indicator, the counter and progress
rules, was being rendered on mobile where it can never work: it tracks the desktop panel
column, which is `display: none` below lg, and a hidden element never intersects. It sat
permanently on 01, naming the first slab whichever card you had swiped to, while pushing the
photographs further down. An indicator that advertises tracking and does not track is a
decorative control under rule 3, so it is desktop only now.

Below lg the stone is the background. The first slab fills the opening screen behind a charcoal
ground at 40%, the type sits over it in white and settles to the bottom of the frame, and the
swipeable specimen cards follow underneath on white. That is the same construction as the
openings on /contact and /shop, so the three read as one site, and it keeps the brand rule that
the shell is near monochrome and the stone is the only colour on the page.

The desktop hero is unchanged: white, pinned type column, specimen cards passing on the right.
Mobile is not the desktop component reflowed, and this is the clearest case of it on the site.

`svh` rather than `vh` on the opening height, so the screen does not jump by the height of the
address bar on the first scroll.

The background is pinned to the 800px derivative rather than left to choose 1600px at 3x. It
sits behind type at 40% opacity, where the extra detail buys nothing and would put the hero
over its 150KB budget on a Nairobi mobile connection. The mobile card row asks for the same
derivative, so the first card is a cache hit rather than a second download.

**The honest cost:** both treatments are in the DOM and only CSS hides one, so each breakpoint
preloads one image it will not use, about 40KB on mobile and about 150KB on desktop. Rendering
one or the other would need a breakpoint decision on the server, which cannot be made from a
request. Worth measuring when Lighthouse runs, against the 1.0MB home page budget.

*Reverses if:* Lighthouse shows the wasted preload costing more than the opening screen gains,
in which case the desktop card column loses its preload rather than the mobile hero losing its
photograph.
