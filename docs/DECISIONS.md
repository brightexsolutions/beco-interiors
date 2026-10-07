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

## D56, 3 September 2026: the hero slabs ride an orbit, not a scroll

The cards travelled straight up the right hand column, which is a list that happens to contain
photographs. The brief was for the site to feel like a designer made it, and a column of images
moving vertically is the default a browser gives you for free.

They now move on a circle whose axis stands off the right edge of the screen. A slab swings in
from below on the far side of that axis, turns to face the reader as it reaches the middle, and
turns away again as it leaves. Coverflow, driven by scroll POSITION rather than by a timer, so
it is the reader moving the range past themselves rather than a carousel playing at them.

The geometry is not arbitrary. A point orbiting a vertical axis at distance R sits at
x = R - R·cos(phi), z = R·sin(phi), and faces the reader rotated by phi. At the near point,
phi = 0, it is leftmost, closest and square on, which is why the focused slab keeps exactly the
position it had before: the change is what happens either side of focus, not at it.

One deliberate cheat: both ends recede, where a true circle would swing one of them in FRONT of
the reader. A slab looming over the type column on its way out is a distraction, and things
that leave should get smaller.

**The dwell is the designed part.** Between 38% and 62% of the range the card holds full
opacity and near neutral position. Without it a slab is fully lit at a single scroll position
and the range reads as a strobe. With it each one holds the middle long enough to be looked at,
and the fade either side is what makes the slabs below read as waiting their turn rather than
as decoration.

The static propped lean is off in this column. Two 3D transforms on nested elements do not read
as one object, they read as a card wobbling inside a frame. The mobile row keeps the lean,
because there is no orbit there.

The LCP rule is satisfied by geometry rather than by an exception. The first panel sits centred
in the viewport at scroll zero, which is the middle of its own range, so the first slab paints
square on and fully opaque. Nothing about it waits, and no card is excluded from the effect.

No blur anywhere. Depth is carried by scale, opacity and real Z, all of which stay on the
compositor, so this costs nothing in INP. Behind `@supports (animation-timeline: view())` and
`prefers-reduced-motion: no-preference`, so Safari and Firefox get a still, complete column and
a reduced motion reader gets no movement at all.

*Reverses if:* the still fallback turns out to read as broken rather than as calm on the
browsers without `animation-timeline`, which is most of iOS. That is a real device question and
it is on the QA checklist.

## D57, 3 September 2026: the range rail runs itself, and the pin is gone

The rail was pinned: a 190vh section, a sticky frame, and a scroll driven transform sliding the
track sideways. Technically well behaved, and it read as a bug. A reader who does not already
know the trick sees the page seize, and the progress bar that was added to say how long it
lasts was a label on the problem rather than a fix for it.

The pin is gone. The section is a normal height, the page never stops, and the track drifts on
its own, so the rail is alive when it arrives rather than something that has to be operated. It
also works in Safari and Firefox now, where the scroll driven version was a dead frame, which
removes one of the browser limitations on the M4 list rather than adding to it.

It travels out and back rather than looping. A seamless marquee needs the cards rendered twice,
which puts every product link in the document twice, and a specifier tabbing through would meet
all twelve stones and then meet them again. Out and back reaches every card with each one in
the page once. The easing is what makes the reversal read as considered rather than as a snap:
the track slows into each turn and out of it.

**It pauses on hover and on focus within.** That single rule is what separates a catalogue from
an advertisement: a row that keeps moving while you reach for a card is hostile. Hovering also
drops every other card to 42%, and the lift on the hovered one is deliberately small, so
attention lands on the stone rather than on the movement.

Below lg nothing drifts. The row is scrolled by hand there, and translating it fought the
reader's own finger, which is the same reason the original pinned version was desktop only.

*Reverses if:* an always running animation turns out to cost more on a low end machine than the
pin cost in comprehension. It is one compositor transform, so this is unlikely, and it is worth
checking when Lighthouse runs.

## D58, 3 September 2026: the photograph strip has two densities

The product gallery's fanned strip was built for the stones, which carry three to six
photographs each. HEIC decoding then brought in the hardware range: Black Handles has 36
photographs, Knobs 35, Gold Handles 33.

Thirty three overlapping cards in a flex row is about 1600px of strip with no scroller and no
width constraint, so it ran off the side of the page, past the frame and past the viewport.

Two densities, one idea. Up to eight photographs keep the fan, which is the signature
treatment: cards resting on the picture at slight angles. Above that the strip becomes a
scrollable snap row of square cards, because choosing between thirty six tiny overlapping
rectangles is not a choice anyone can make, however good it looks. Either way the strip is now
clipped to the frame's width and scrolls inside itself.

The scroller carries its own vertical padding, because `overflow-x` forces `overflow-y` to
match, and the cards rotate and lift: without room above and below, their tops and their
shadows were sliced off.

The dense variant states the count and says the strip scrolls, so nobody has to discover thirty
more photographs by accident.

## D59, 3 September 2026: the range rail's advance moved from CSS to a small script

D57 made the rail drift on its own via a CSS `@keyframes` transform. Then arrow controls were
asked for, and a `@keyframes` animation mid flight has nowhere for a button click to attach: a
CSS transform is not a scroll position, so `scrollBy` has nothing to act on.

`RailTrack`, a small client component, now drives the advance itself in a `requestAnimationFrame`
loop over the row's real `scrollLeft`, ping ponging between the two ends at close to the pace the
CSS version ran at. Two arrow buttons sit over the row, hidden until it is hovered or holds
focus, each moving the row by roughly one screenful with `scrollBy({behavior: 'smooth'})` and
holding the auto advance for a couple of seconds afterward so a press is not immediately
undone by the row resuming underneath it.

Split out of `SlabRail` specifically so the section heading and the "Browse the range" link stay
server rendered: the interactive part is the row, not the section around it, and the component
skill's own rule is to keep a client island as small as the interaction genuinely requires.

Pausing on hover and on focus within is unchanged from D57. `prefers-reduced-motion: reduce`
turns the auto advance off entirely; the arrows keep working, because reduced motion asks for no
motion the reader did not choose, not a row that cannot be moved.

## D60, 3 September 2026: the /about pillars carry photography, matched through the group tree

The four pillar rows sat as text alone against a wide empty column, which read as unfinished the
moment you noticed the whitespace.

Each pillar now carries a photograph, chosen by walking `getCategoryTree()` for the pillar's
group and taking the first published product's application shot found under it or any of its
children. Lighting and Panels currently have no photography, so they get the same charcoal name
plate the shop's range tiles use rather than an invented stock image, which is the same
principle D53 and D58 both rest on: report what is real, never guess a specific claim.

Each row is now a link to its range's `/shop/<group>` page. The four pillars already named the
same four groups the taxonomy carries per D52, so this closes the gap between a description of
the business and actual navigation into it.

## D61, 3 September 2026: the rotating statement's photograph now changes with the word

The section cycled through NAIROBI, KITCHENS, BATHROOMS, OFFICES and SHOWROOMS over one single
static photograph, so every word in the sequence sat over the exact same picture, which read as
unfinished once noticed.

`RotatingStatement` now owns an optional set of photographs alongside its words and crossfades
between them on the same interval and the same index, so the two never fall out of step.

**What the photographs are NOT claimed to be:** a specific picture of the specific room named
above them. Nothing in the catalogue tags an installation shot by room type, kitchen, bathroom
or office, and inventing that label per photo is exactly the class of unverifiable claim this
project checks before publishing rather than assumes, the same principle behind D53's Delfone
finding and D58's honest counts. So the images are real Beco installations, one drawn per
product for variety and cycled if there are fewer of them than words, shown as a set rather than
captioned as depicting the word above them.

## D62, 3 September 2026: no stock video, and the shop filter sticks under the header

Two smaller calls worth recording together.

Asked for "a continuous video of the interior" with a stock clip fetched from the internet in
the meantime. Not done that way. D51 already rejected stock footage for the showroom section for
exactly this reason: a clip that reads as Beco's work without being it is a fabricated record on
a page a buyer uses to decide whether to drive there, and the brand's own positioning is that the
nearest competitor's rooms are AI generated while Beco's are real. Sourcing and verifying a
license for a random internet clip is also not something that can be done safely without a
person checking terms, on a page that will carry a client's name. The existing real Beco showroom
footage is the source for any expanded video section, not a stock substitute.

The shop's filter bar is `sticky top-20 z-40` now, tucked under the header rather than scrolling
away with the range tiles above it, because searching, filtering and sorting are exactly the
controls a reader reaches for once they are past the tiles and into the grid, which is precisely
when the bar used to disappear.

## D63, 3 September 2026: a whole section that is just the film, on the gallery page

Asked for a page carrying a section that is nothing but a continuous video. Built as
`AmbientVideoSection`, a reusable component, and placed at the top of `/gallery`: the one page
whose entire purpose is "here is what a finished room looks like", so a moving opening earns its
place there more than anywhere else on the site.

Framed to the footage's own shape rather than stretched to the viewport's. All of Beco's clips
are portrait phone video, per D51, and a full bleed band would crop most of the picture away.
The frame is height led instead, nearly the full viewport tall, width following from the 9:16
ratio, centred on a charcoal ground either side.

No second, borrowed clip stands in for a rotation. D51 already settled that question. When more
of the 52 clips in Drive are transcoded, this is where a short rotation between real Beco films
belongs.

## D64, 3 September 2026: the gallery cards cycle through their own other photographs

Asked for a hover slider on the project gallery, more of a stone's other installations, not a
different stone's photograph.

`getGalleryShots` now hands each shot a `siblings` array: the other application photographs of
the SAME product, itself first so the hover cycle never jumps away from the picture already on
screen, capped at four to match the product card's own hover gallery limit. `HoverGallery`,
built earlier and unused until now, is what actually cycles them.

The depth parallax selector, `.beco-depth-N > img`, was a direct child selector, and
`HoverGallery` nests its `img` two levels deeper inside its own per-frame wrapper. Widened to a
descendant selector so it keeps matching every existing direct-child case exactly as before and
additionally reaches the new nested one, rather than the parallax silently going dead on every
card that gained a hover slider.

`interleave`, extracted from `getGalleryShots` for testing, carried a latent bug: it dropped any
falsy array element, including `0`, because it used a truthy check rather than an existence
check. The current caller only ever passes objects, so it could not have shown up on the site,
but an exported utility is a promise to whatever calls it next, and the test written against it
caught the bug before a second caller could have inherited it.

## D65, 3 September 2026: the sticky filter bar is desktop only

D62 pinned the shop's filter bar under the header. On a phone it made things worse rather than
better: the four fields wrap onto two rows there, so the pinned bar, the fixed mobile action bar
at the bottom, and the on screen keyboard together left almost nothing of the actual grid
visible, sometimes a sliver of a single product image.

`lg:sticky` now, not `sticky`. Desktop keeps the fix, one compact row, cheap to pin. Mobile goes
back to the bar scrolling away the way it always did, which was never the reported problem there.

*Reverses if:* the mobile filter bar is redesigned into something short enough to pin, most
likely a single row behind a "Filters" toggle that opens a sheet rather than four fields stacked
inline.

## D66, 4 September 2026: a splash screen, engineered around the performance budget rather than against it

Asked for a splash screen: the mark and a tagline, animated, on arrival. Worth stating the
tension plainly rather than building past it silently. A splash screen is, by definition,
something between a reader and the page they came for, and this project's LCP budget is under
2.0s and its whole quote flow exists to be faster than writing an order on paper. Those two
things are in real conflict with the usual way a splash screen is built.

Three constraints keep this one from actually costing either.

**Client only.** `SiteSplash` renders nothing during server side rendering and mounts only after
the real page has already painted. It is confirmed to have zero footprint in the served HTML.
That matters specifically because it means the browser's LCP candidate is recorded from the
actual hero content that was already there, before this overlay exists at all. Nothing about the
real page waits for it, and nothing the reader is actually here for is delayed by a millisecond.

**Once per session, not once per page.** `sessionStorage`, checked and set on mount, not a
render on every navigation. A salesperson moving from the shop to a product to the quote form
during one visit must never see this a second time, or the site's own "faster than paper" promise
breaks on the very next click.

**Under a second and unskippable only because it is short.** No button, no click required,
because the moment a splash becomes something to get past it has stopped being a brand moment and
started being friction. It is on screen for 900ms and fully gone by 1300ms, comfortably inside
the LCP budget with margin to spare. `prefers-reduced-motion` skips it outright: nothing renders,
and it does not consume the session's one showing either, so a later visit with reduced motion off
still gets the real thing rather than silence forever.

`position: fixed`, removed from flow entirely once done, so it cannot shift the layout underneath
it arriving or leaving. CLS is unaffected either way.

*Reverses if:* Lighthouse, once it finally runs, shows any measurable cost from this. The
architecture is built to make that impossible, but D46 and D58 are both reminders that a
device number should confirm a decision like this, not just the reasoning behind it.

## D67, 4 September 2026: two conflicting opacity classes froze the rotating statement's photograph

Reported directly: the word cycled correctly, the photograph behind it did not. Real bug, found
in the code that shipped it. `RotatingStatement`'s image layers built their className as a base
string that hardcoded `opacity-70` unconditionally, then appended a ternary that added EITHER
`opacity-70` OR `opacity-0` depending on which layer was active. An inactive layer therefore
carried both `opacity-70` and `opacity-0` in its class list at once.

Tailwind resolves two utilities that set the same CSS property by their order in the COMPILED
STYLESHEET, not by where they sit in a given element's class string. So which one won was a tie
decided once, globally, for every layer, regardless of which photograph the index actually
pointed at, and the loser never changed with it. The word cycled correctly because its own
className construction had no such duplicate: only the ternary set its opacity, nothing else
did.

The two tests written for this at the time both still passed with the bug present, because both
used `toContain`, a substring check, on only ONE class per assertion. `toContain('opacity-70')`
on the active layer does not notice that the SAME element also contains `opacity-0`. Rewritten
to assert the negative as well as the positive, `toHaveClass` paired with `not.toHaveClass` on
both values, which is what actually proves a layer has exactly one opacity rather than two
competing for it. Confirmed by reverting the fix and watching the strengthened test fail before
restoring it.

The lesson generalises past this one component: a conditional class belongs entirely inside the
condition, never partly in a shared base string, whenever another branch of the same condition
sets the same property. A test asserting a class is present is a weaker claim than a test
asserting the conflicting one is absent, and only the second actually catches this shape of bug.

## D68, 4 September 2026: a slab can be ordered in halves, a handle cannot

Asked for directly: a slab is cut to order, and a client may want 1.5 of one. Confirmed by
Beco's own steer that a slab is sold WHOLE by default, and the half is the exception a specific
quote makes, not the norm.

The database was already ready for this. `quote_items.quantity` has been `numeric(12,2)` since
migration 5, and `line_total` was already `quantity * unit_price`, generated and correct for any
fraction. The only place actually enforcing whole numbers was `submit_quote`'s floor,
`greatest(1, ...)`, applied identically to every line regardless of what it was.

The floor is now a property of the product, read from `unit`, which the schema already carries
and the storefront already displays. A `per slab` line floors at half a slab and rounds to the
nearest half. Everything else keeps the exact previous behaviour: floors at one whole unit,
rounds to the nearest whole number, because a fractional handle or hinge means nothing and
letting one through would be a quote a salesperson cannot actually fulfil.

Enforced twice, deliberately. `webQuoteSubmissionSchema` gates the public form with
`.multipleOf(0.5)`, which is a UX improvement: a customer typing 1.37 is told so immediately
rather than finding out later. `submit_quote` enforces the real rule, whole-versus-half per
PRODUCT, because that distinction cannot be made from the request alone and because the
function is itself a public RPC surface a crafted call could reach directly, per rule 2: a
client check is for UX, the server is the authority.

The two storefront steppers, the product page and the quote list, now step by half a slab for a
`per slab` line and by one for everything else, reading the same `unit` field. A stepper that
still moved by whole numbers while the database silently rounded whatever arrived would have
been a UI lying about what a click does, which rule 3 exists to catch.

*Reverses if:* Beco specifies finer cuts than half a slab, at which point the increment moves
from a hardcoded 0.5 to a value carried on the product row, the same way `unit` already is.

**Recorded for M5, not built now, per Beco's own steer:** stock tracking, so the dashboard shows
what is left of a range as sales are made, and each sales agent's own view of quotes they are
preparing versus quotes an admin has assigned them, with the admin able to see both. Both are
staff and inventory management, which is M5 scope, and both depend on the order model that has
no UI yet. Kept here so the requirement is not re-derived from scratch when M5 starts, and
because it changes the M5 stock model directly: a slab's stock must be tracked in the same half
unit granularity its quotes are now written in, or a sale of 1.5 slabs cannot be deducted
correctly from what is left.

## D69, 4 September 2026: the gallery's video section carries licensed stock, on direct instruction

D51 and D62 both rejected stock footage, for the same reason: a clip that reads as Beco's work
without being it is a fabricated record on a page a buyer uses to decide whether to drive there.
An internal, disclosed reference page was built instead, so Beco could react to the proposed
cinematic TREATMENT (the drift, the vignette, the framing) without the site claiming a room that
was not theirs.

Reviewed, and reversed for this one section by direct instruction: use the clip that was found,
remove the disclosure, use it as real content. Recorded here rather than silently implemented,
because it is a genuine reversal of a written project position, not a stylistic call.

**What changed:** the gallery's `AmbientVideoSection` now plays a licensed Pexels clip,
`GALLERY_FILM` in `lib/site.ts`, full source and licence recorded there. The section is rebuilt
landscape and full width to match the footage's own shape, the opposite of the tall portrait
frame D51 established, because this section no longer carries Beco's portrait phone footage.

**What did not change:** `SHOWROOM_FILM`, the split section on home and contact, is still Beco's
own footage, untouched. D51's reasoning still holds everywhere that clip is used. This is a
carve out for one section, not a reversal of the whole policy, and the two constants are kept
deliberately separate in `lib/site.ts` so the difference cannot blur by accident later.

The clip itself: "Modern Luxury Interiors with Spacious Design" by Ethan Raven, Pexels video id
31617692, Pexels License, free for commercial use, no attribution legally required. Verified as
a real, resolvable file via the actual download redirect rather than a guessed URL, downloaded
from `videos.pexels.com/video-files/31617692/13470975_1920_1080_24fps.mp4`. Transcoded from
1920x1080 with audio, 7.6MB, down to 1280 wide, silent, 2.3MB, holding it to the same size
discipline `SHOWROOM_FILM` was already transcoded to. `ffmpeg`, previously not installed on this
machine and a standing item on the M4 backlog, was installed via Homebrew to do this, which also
clears that backlog item for Beco's own footage transcoding going forward.

*Reverses if:* Beco supplies real landscape footage, at which point `GALLERY_FILM` points at
that instead and nothing else in the component changes, since nothing but this one page depends
on the constant.

## D70, 4 September 2026: the hero's lede crossfades with the active slab

Asked for directly: as the slabs transition on the right, the copy on the left should also say
something different, not sit static the whole scroll.

The H1 does not change. `WordReveal`'s own stated rule is that it is used once, on this
headline, nowhere else on the site, and that holds regardless of what moves beside it:
"Surfaces that outlast the room." stays the one fixed thing the hero says while everything
around it moves.

The lede does. It is Beco's own first sentence for whichever stone is active, from the same
descriptions document migration 15 loaded, trimmed to one sentence because the site's own copy
rule is short copy and a hero lede is not the paragraph. A slab with no description yet, Cyprus
Grey and a few others, falls back to the original generic sentence rather than showing nothing.

Built on the exact technique `RotatingStatement` uses, stacked absolutely, one opacity source
per layer, height reserved by an invisible copy of the longest real lede in normal flow. Worth
being direct about why: this is the SAME crossfade shape that froze under D67's bug, a hardcoded
base opacity alongside a conditional one, so the fix's lesson is applied here from the start
rather than rediscovered. A test asserts exactly one opacity class per layer for this reason.

`CatalogueProduct` gained `short_description`, added to `PRODUCT_COLUMNS`, since the list query
that feeds the home page's hero previously stopped at `specs`. `specs['Recommended for']` was
considered and rejected as the source: it is the identical sentence on every stone in the
catalogue, so using it would not have varied at all.

## D71, 4 September 2026: the showroom video widened, the gallery's opening gap closed

Three small, direct fixes.

The showroom split section's video column, on both home and contact, was fixed at 20 to 22rem,
narrow enough to read as cramped beside its copy. Widened to 26 to 28rem on each. Still Beco's
own portrait footage, still the tall frame D51 calls for: this is a proportion change, not a
reversal.

The gallery page had a plain top padding, 64 to 96px, stacked immediately under the new video
section per D69, which already closes on its own caption padded to its own bottom edge. Two
paddings back to back read as a gap rather than a considered break. Split into a smaller top and
the original bottom, so the section that opens the page and the section that follows it no
longer double up on empty space between them.

The hero's scroll cue, asked to be more noticeable, got taller, a hair thicker, and Warm Red
instead of neutral, since "you can move this" is exactly the moment worth spending one of the
page's few red touches on. Counted deliberately rather than added freely: the palette rule caps
Warm Red at three or four uses per page, and this is one of them, not an exception to it.

## D72, 4 September 2026: two corrections on the gallery video, both reported directly

**The eyebrow was a false claim.** "Filmed in the showroom" was written when this section still
played Beco's own footage, and stayed after D69 put licensed stock behind it instead, at which
point it became untrue: the clip was not filmed in Beco's showroom at all. `eyebrow` is optional
on `AmbientVideoSection` now, and the gallery page passes none, rather than replacing one
unverifiable claim with a vaguer one.

**The section overflowed the viewport it was meant to fill.** Sized to `100svh`, which is correct
only for the first element on a page. This section sits under the announcement bar and the
sticky header, both of which take real space on first paint, so `100svh` of section plus that
chrome exceeded one screen, pushing the caption and the new scroll cue below the fold before
anyone had scrolled. `calc(100svh - 8rem)` now, accounting for the header's own 5rem plus the
announcement bar's rendered height. The scroll cue that prompted the fix, D71, would otherwise
never have been seen until after the scroll it exists to request.

## D73, 4 September 2026: a cutout treatment, `CutoutReveal`, added to `@beco/ui`

Asked for directly: a photograph with its background removed, resting beside copy that reveals
further detail, stats among it, as the reader scrolls, with the object itself continuing to
move rather than sitting still once it has arrived.

Built in `@beco/ui`, not the storefront app, per rule 5: the request named two places for it
from the start, the home page and whichever other page fits, so it was never going to be a one
page component. Takes its image as a `ReactNode`, the same convention `ProductCard` and
`HoverGallery` already use, so the package stays free of `next/image`.

The photograph carries no frame and no background plate, unlike every other image in the design
system. `ProductCard`, `HoverGallery` and the gallery grid all put a photograph inside a bounded,
filled box on purpose, because they are showing a rectangle of the world. A cutout is showing one
object, so a box behind it would put back the background that was just removed from it. The
shadow is `filter: drop-shadow`, not `box-shadow`, for the same reason: a box shadow draws a
rectangle under the image regardless of what is transparent in it, and only a drop shadow follows
the alpha channel.

Motion: a new class, `beco-cutout-drift`, not a reuse of the grid's own `beco-depth-N`.
`beco-depth-N` exists to hide a scaled photograph's overscanned edges behind a clipping frame, a
problem a cutout does not have, since its background is already transparent and there is nothing
outside its own box left to hide. Reusing it anyway would have made `CutoutReveal` depend on an
unrelated component's class keeping the same shape. Same numeric range as `beco-depth-2`, a
gentle drift, under its own name.

The copy and its stats use `Reveal`, the site's default entrance, staggered by 90ms per element,
so the eyebrow, the heading, the body and each stat arrive as a sequence. Stats are `CountUp`
values, the same component the home page's own stat band already uses, which means a stat here
can never show a number nobody can find in the database.

**Two real photographs, not stock.** A person or object with its background removed was the
brief, and a stock person cutout would have raised the same authenticity question a stock video
already had, D69. Two Beco handle photographs, gold and matte black, both already imported and
already real, background removed with ImageMagick's flood fill from five seed points and saved to
`public/cutouts/`. Neither is a product shot standing in for one; both are genuinely
background-removed versions of photographs already in the catalogue.

**Content is honest on both placements, which means the two are not symmetric.** The home page
teaser carries two real counts, six handle finishes on the floor and four hardware ranges in the
category, because a reader arriving from the home page has neither number yet. The Handles range
page itself, `/shop/handles`, repeats neither: its own header states the finish count a few
hundred pixels above where the cutout section sits, and a second stat there would have had to be
invented, since no handle product carries specs yet. That instance ships with `stats={[]}`, which
the component supports directly, rather than filling the slot with a number that does not exist.
Its copy argues for the showroom instead, that a finish reads differently under real light than
on a screen, the same honest reasoning the showroom sections elsewhere on the site already make.

`/shop/[category]/page.tsx` had one wrapping `<main>` for its entire content, padding and max
width included, which does not compose with a full bleed section dropped into the middle of it.
Split into two padded halves, top and bottom, with the cutout section as a sibling between them
rather than nested in either. With no cutout to insert, which is every category except Handles,
the two halves sit flush against each other and the page renders exactly as it did as one
wrapper, ordinary margin collapse rather than a new code path per category.

## D74, 4 September 2026: the About page's "new supplier" sentence, rewritten on direct feedback

"Beco Interiors is a new supplier in the East African market, and we would rather say so than
pretend otherwise" was flagged directly: the second half talks about the act of saying the
sentence rather than just saying it, which reads as defensive on a page whose whole job is to
state the same fact plainly and move on.

Rewritten to "Beco Interiors is new to the East African market", the fact stated once and left
alone. The fact itself is unchanged, and stays load bearing: it is still the guideline's own
"new entrant" framing over the prototype's "10+ years" claim, `docs/CONTENT-AUDIT.md`, and the
title above it, "New here. Stocked already.", still sets up exactly this sentence.

## D75, 4 September 2026: the showroom poster was the wrong frame, not the wrong clip

Reported directly, with two screenshots: the showroom section on both home and contact showed
a blank wall over a bare slab corner, on both pages at once. Both pages render the same
`ShowroomFilm`, reading the same `SHOWROOM_FILM` constant and the same `showroom-poster.jpg`,
so one bad poster explained both screenshots without two bugs.

Checked before assuming a wrong clip needed sourcing: `ffmpeg`, sampling `showroom.mp4` every
0.5 seconds across its 6.5 seconds, showed the clip pans from that same awkward wall corner at
its start to a fully composed vanity, black tapware against a veined stone backsplash, by
around the 6 second mark. The footage was already right. Only the poster, the frame shown
before autoplay starts and the ONLY frame a reduced motion reader or a `controls`-only click
ever sees, per `ShowroomFilm`'s own doc comment, had been extracted from near the start of the
pan rather than from where it settles.

Re-extracted at 6.0s from the same file already in `public/video/`, same 360x640, a similar
9.7KB. No new Drive lookup and no re-transcode: this was a five second `ffmpeg` fix once the
real cause was checked rather than assumed, not a resourcing gap.

**Checked and left alone:** Beco's SITE VIDEOS folder in Drive, all 52 raw clips, is genuinely
reachable, confirmed by listing it directly, in case the fix had turned out to need a different
source clip. It did not, this time. If a poster ever needs picking from a clip not already
transcoded into the repo, downloading and previewing raw phone video through the tools this
session has is impractically large for a chat turn, tens of megabytes each, so that would need
either a specific file named directly or a clip dropped locally to transcode from, the same way
`SHOWROOM_FILM` and `GALLERY_FILM` both already were.

## D76, 4 September 2026: `CutoutReveal` crossfades through more than one photograph

Asked for directly, pointed at the home page's new hardware section: one still handle was a
thin argument for "six finishes are already on the floor" when the section could show more than
one of them taking turns.

`image: ReactNode` became `images: ReactNode[]`. Built on the exact crossfade
`RotatingStatement` already uses, and for the same reason that one is a client component: opacity
carried by ONE source, the ternary, never also hardcoded into the base class string, which is the
bug that shipped there, D67. `images.length < 2` skips the interval entirely, so the Handles range
page's single black handle, which has no reason to cycle against anything, behaves exactly as a
static photograph always did, and reduced motion freezes on whichever image is first everywhere.

Crossfading more than one photograph in the same box means the box has to hold its own size
rather than take it from whichever image happens to be on screen, or switching would jump the
layout. The wrapper is `aspect-square` now, and every image a caller passes must be `fill` with
`object-contain`, never cropped: the objects are different real shapes, a handle far wider than
tall and a knob close to square, and cropping any of them to fill a frame would cut a real
product off rather than show it whole. The previous intrinsic width and height contract, correct
for a single photograph setting its own box, could not extend to more than one without either
constraint. The decorative ground line under the object, a hairline reprising the eyebrow's own
rule, was dropped in the same change: it read as attached to the object in a fixed-height photo,
and a set of differently proportioned objects letterboxed inside one square would each sit a
different visual distance above it, which looked like a mistake rather than a rest line.

**Two more real cutouts, not two more of the same.** Grey and white handles, both flagged
`uniformBackground: true` by the importer, the same signal that picked the first two, background
removed with the identical ImageMagick flood fill. Four finishes now cycle where the section
already claims six are on the floor: a representative sample of what exists, not a claim that
these four are the only four, which the stat beside them already states honestly as a count
rather than a list.

## D77, 4 September 2026: the crossfade got a scale, and a real cause found for the shared link

**The crossfade.** Reported directly as too basic. A flat opacity fade was true to the word
"crossfade" but not to the standing rule that this site should not read as default effects: an
incoming photograph now grows into place, `scale-90` to `scale-100`, rather than only fading,
`scale and crop` from the site's own six effect vocabulary rather than a plainer effect invented
for this one component. It lives on ITS OWN layer, wrapping the drift rather than sharing a div
with it: `beco-cutout-drift` is a CSS animation, the scale is a CSS transition, and a transition
loses outright to an animation reaching for the same `transform` on the same element, which would
have made the new scale invisible, silently overridden the instant the two shared a div. Two
nested layers avoid that outright rather than discovering it.

**The shared link.** Reported as not operating the same as localhost: the nav stayed transparent
past the point it should have turned solid, the About menu never opened on hover, and motion in
general looked frozen. All three are exactly what happens when React never hydrates: the SSR'd
HTML paints, so the page LOOKS right, but no `useEffect` ever ran, so no scroll listener attached,
no hover state could change, no `IntersectionObserver` ever fired. Confirmed directly: a JS chunk
fetched through the tunnel with the browser's real `Origin` and `Referer` headers came back `403
Unauthorized`, the exact request a real page load makes and the exact one `curl` without those
headers does not, which is why every earlier check of the tunnel from this session looked fine.

The cause is Next 16's own dev server cross-origin protection, `allowedDevOrigins`, on by default
and trusting only `localhost`. It has nothing to do with any component built this session,
including the splash screen's Strict Mode race fixed earlier under D66, which explained the
identical symptom the first time it was reported and was the real bug that day. This time the
components were never at fault: nothing client side can run without hydration regardless of what
it contains.

`next.config.ts` now sets `allowedDevOrigins: ['*.trycloudflare.com']`, dev only, so it is never
read once `next build` runs a real production server that has no such restriction to relax.
Required restarting the long running dev server: Next does not hot reload its own config file,
so the fix could not take effect on the process that had been running since this session opened.
Confirmed by repeating the exact failing request after the restart: `200`, not `403`.

## D78, 4 September 2026: the mobile action bar waits for the reader to scroll

Reported directly by screenshot: fixed over the very first screen of every page on mobile,
`MobileActionBar` covered the gallery's opening video, its scroll cue included, before anyone
had done anything at all. A bar for WhatsApp and the phone line earns its place once someone is
reading, not before they have seen what the page is.

Promoted to a client component and given the exact scroll threshold `SiteHeader` already uses
for its own scrolled state, `window.scrollY > 8`, rather than inventing a second number nobody
chose on purpose. `translate-y-full` to `translate-y-0`, not a mount or unmount: the bar stays in
the layout and only its position moves, transform only, so it costs nothing toward CLS and needs
no reduced motion fallback beyond turning the transition itself off. A live toggle, not a once
seen flag: scrolling back to the very top hides it again, since the screen it was covering is
back too.

`aria-hidden` and `tabIndex={-1}` while off screen, so a keyboard reader tabbing through the page
skips straight past two links nobody can see yet rather than landing on them blind. **4 new
tests.**

## D79, 4 September 2026: the hero goes back to a full bleed photograph, reversing D30 and D56

Reported directly, relayed from Irene during an evening session: the hero should feel closer to
the approved prototype, a full bleed photograph with the type over it, with the prototype's own
left side gradient reduced, and the photography should be room finishes selling what a stone
looks like installed rather than a material sample. A separate note in the same thread asked for
the hero images to auto advance without requiring a scroll, and for something on the right side
of the hero carrying the other stones with a real transition, addressed here and in the commit
that follows it.

**This is a real reversal, not a small styling pass, and it is made on Brown's explicit
instruction after being shown the conflict, not on guesswork.** `prototype/README.md` names the
exact pattern being brought back: "Centered text over a darkened full bleed photograph is the
pattern the brief explicitly rules out. Replaced by the pinned split scroll, D30." That reasoning
does not stop being true. It is overridden by a specific, informed decision made with it in view,
which is a different thing from it never having been raised.

What actually changed: the desktop hero's separate turning specimen cards, D56's orbit, are gone.
In their place, one full bleed photograph crossfades behind the pinned type, sourced from each
stone's real APPLICATION photograph rather than its slab shot, so the hero now sells a finished
room rather than a material close up. The gradient making the type legible uses the site's own
charcoal token, `#101820`, left heavy but nowhere near the prototype's 0.97 opacity peak on the
left edge, and carries none of the prototype's gold or red radial glow: gold is retired per D2,
and a second red accent in the hero would spend most of the page's own Warm Red budget before the
reader leaves it.

What did not change, married into the new structure rather than discarded: the real headline,
used once, per WordReveal's own rule. The lede crossfading with the active stone, Beco's own
first sentence per slab. The specimen indicator and its progress rail, restyled for white text
over a photograph rather than charcoal over a transparent column. Native `position: sticky`, no
scroll hijacking library, the same technique as before, just re-pointed at a photograph filling
the whole section rather than one column of it. Pin dropped entirely on mobile, which now also
crossfades its own single background photograph rather than showing one static image.

**The images now auto advance on a timer, 4.2s, the prototype's own cadence, independent of
scroll.** Previously the crossfade only moved as the reader scrolled the pinned column's own
invisible chapters, so a visitor who never scrolled the hero saw exactly one stone the entire
visit. The interval and the scroll driven `IntersectionObserver` write to the same `active`
state without conflicting: scrolling still jumps to whichever chapter is centred, the timer just
keeps it moving the rest of the time. Guarded by `prefers-reduced-motion` and never armed for a
single slab, the same pattern `RotatingStatement` and `StoneSlider` already use.

Two implementation notes worth keeping. First, a real near miss: the mobile crossfade was
initially written with a hardcoded base `opacity-50` alongside a conditional `opacity-0`, the
exact shape that caused D67's frozen photograph. `cn`'s own `tailwind-merge` actually resolves
that correctly, confirmed directly rather than assumed, with a new test on `cn` itself, but the
code was still rewritten to the same single ternary every other crossfade in this codebase uses,
since relying on a merge library to save an ambiguous pattern is worse than not writing the
ambiguous pattern. Second, the transparent-over-hero header carried hardcoded dark text and a
dark logo mark, correct when it sat over the old hero's mostly light background and nearly
invisible once the background became a full bleed dark photograph. `SiteHeader`, `NavLink`,
`NavDropdown` and `MobileMenu` all take a `light` prop now, true only when `overHero` and not yet
scrolled, which is only ever the case on `/`, where no nav item is the active page either, so the
active and light colour rules never have to be resolved against one another.

**Known cleanup, not done here:** `.beco-orbit` and `.beco-orbit-stage` in `motion.css`, D56's
turning card keyframes, are unused now that the desktop cards are gone. Left in place rather than
deleted in the same pass as a structural rewrite, recorded here so it is not silently forgotten.

## D80, 5 September 2026: the first anniversary countdown, and a real control to launch it

Requested directly, relayed from Irene: Beco turns one in October 2026 and wants that on the
announcement banner, and the site launch is being run as an event in the same month, so there
should be a countdown, a reveal and a celebration on the day, controlled from a URL with a
button that Brown can reach.

**State lives in `settings`, not a new table.** Two keys, `site_launch_at` (a nullable ISO
instant) and `site_launch_live` (a boolean). This is exactly the shape the key/value table
exists for, and it inherits `settings`' policies rather than opening a new RLS surface:
`settings_write_admin` already restricts writes to `beco_admin` and `brightex_admin`, and the
`settings_read_public` allowlist is extended so both keys are anon readable, which the
storefront needs because the countdown and the reveal are server rendered like everything else,
not fetched client side from an admin value. Migration 25, with the anon read and the
sales-cannot / admin-can write proven in `02_anon_rls` and `04_role_writes`.

**The reveal is a click, not a clock.** `site_launch_live` is only ever set by the dashboard's
own button. A first anniversary is a real moment with people in a room, and a value a cron job
flips at midnight is not that. The countdown counts to `site_launch_at`; the actual transform
waits for a person.

Two propagation limits, both deliberate and both matching how `AnnouncementBar` has always
behaved from this same slot. There is no realtime push: `settings` is not in the
`supabase_realtime` publication and stays out, per `docs/SCHEMA.md`, so a tab open when the
switch is thrown keeps its countdown until its next load. And every storefront page is
`revalidate = 3600`, so a page already in the ISR cache can take up to an hour to pick the
change up. Neither matters for a soft celebratory banner rather than a functional gate: the
practical guidance, in `docs/milestones/M4-HANDOVER.md`, is to throw the switch an hour before
the event. Building cross-app on-demand revalidation for one banner was not worth it.

**One banner, not two.** For that month the anniversary IS the announcement, so `LaunchBanner`
takes `AnnouncementBar`'s slot in the layout rather than stacking above it, keeping the vertical
space that feedback has already pushed back on twice elsewhere. Its wrapper is shaped exactly
like `AnnouncementBar`'s, same height and z-index, so D79's `data-announcement` hero-spacing
contract does not need to know which one is in the slot. The regular announcements mechanism is
untouched and still there for ordinary sales and notices.

**Motion: `reveal` and `count up`, per D31, not a seventh effect.** The countdown digits are
`count up` running the other direction, tabular figures so nothing reflows. The switch-over
plays `reveal` once, applied to a strip of chrome instead of a section entering on scroll: same
category, different trigger. Alongside it, confetti falls once from the bar over the header and
the top of the hero, roughly 2.5s, from a `fixed pointer-events-none` overlay that unmounts
itself: `animation-fill-mode: both` not `infinite`, so nothing loops in a reader's peripheral
vision the way a decorative animation would, and it is gated once more in JS on
`prefers-reduced-motion` on top of the CSS `@media` block. The reach past the bar is a
deliberate call after seeing it live, since clipped to a 47px strip it did not read as a
celebration at all. Warm Red is rationed to one piece in four; the rest are Charcoal and
High-Vis White. The whole flourish plays once per browser, tracked in `localStorage`, so a
returning visitor gets the settled banner with no replay.

**The control is a real authenticated page, not a secret link.** Rule 7 does not accept a
shared token in a URL as access control, so `apps/dashboard` gets its first real surface: a
password sign in against Supabase Auth, a `proxy.ts` fast-path redirect, and `/launch` gated by
`requireAdmin`, which reads the role from the `users` table. That is the route half of "role
checks in two places"; RLS on `settings` is the half that actually holds, and every server
action re-checks the caller because a server action is a public endpoint whatever gated the
render. This is NOT the start of M5's dashboard build, it is the one vertical slice this
feature needs: sign in, one page, one date field, one switch. The switch uses `ConfirmDialog`
with the verb on its button, per rule 4, because going live publicly is exactly the
irreversible-in-effect action that rule is for.

**Blocked on Beco:** the exact October date. The field is deliberately nullable and set from
the control page rather than hardcoded, so the date being unconfirmed is not a blocker on the
build, only on the countdown showing anything. Recorded in `docs/milestones/M4-HANDOVER.md`.

## D81, 8 September 2026: an app-level rate limiter, as a stopgap in front of the edge rule

Rule 7 requires rate limiting on public write endpoints. The M0 review, and `M4-TODO`, had it
as a Cloudflare rule, which cannot exist until the M1 DNS cutover. That left the two public
writes, `submit_quote` and now the dashboard sign in, with nothing in front of them.

`createRateLimiter` in `@beco/validation` is a stopgap and is commented as one. It is an exact
sliding-window log: every hit's timestamp is kept, anything older than the window is dropped on
the next check, and the survivors are the count. Store and clock are injected, so the unit
tests assert exact boundaries without sleeping and a shared store can be swapped in later
without touching the file.

**It lives in `@beco/validation`, not a new package.** That package is already "the server-side
guard on a request", both apps depend on it, and rule 5 is satisfied by one home. A new
`@beco/rate-limit` package would have been a package.json, a tsconfig, a workspace entry and
two dependency edges for one 60-line file.

**The store is in memory, so the limit is per instance and resets on deploy.** This is a real
limitation, not a bug, and it is exactly why the Cloudflare rule still has to happen: an
attacker spread across enough serverless instances is not stopped by this. What it does stop is
the common case, a single address hammering one instance, and it works today with no infra.
Ten requests a minute per address on both endpoints: far above a real customer pricing a list
or an admin mistyping a password, far below a script.

**The wiring tolerates no request scope.** `headers()` throws when called outside a request,
which in practice is only a direct call from an integration test. The helper catches that and
returns null, and a null key skips the limit, so `submit_quote`'s end-to-end tests keep
exercising the real path. Every real HTTP request has a scope, so production is always limited.

**Sign in already had Supabase Auth's own limiter behind it.** The app layer there is thin: it
turns a burst into one clear message instead of a run of GoTrue 429s, and keeps the two public
writes shaped the same way.

## D82, 9 September 2026: the storefront gets a modernisation pass, inside the guideline

Brown's call: the storefront should feel more current. Accepted, with three constraints so it
does not become an open-ended reskin.

**Sequencing.** Originally scoped for after M5. Brought forward the same day, on Brown's
follow-up call: the Beco team needs a temporary storefront link to review, so the revamp runs
now and the M5 dashboard build pauses at section A (nothing was committed on `m5-dashboard`
beyond the M5 plan, so M5 resumes cleanly from there later). The work happens on a
`storefront-revamp` branch. Each page's change is still recorded as an M4 revision, the same
way D70 to D79 were handled.

**The guideline still governs.** D2 is not reversed: Charcoal Black, High-Vis White and Warm
Red at their guideline values, Titillium Web and Cormorant Garamond, the near monochrome shell
so the stone is the only colour on the page. The palette and type are Beco's own brand
guideline, not a Brightex preference, so a pass that trades them away needs Beco at the table.
The "Never build" list in `CLAUDE.md` and the Lighthouse budgets remain hard limits: a
modernisation that costs the LCP or CLS budget is not shipped. "Modern" here means sharper
craft inside the existing system, not a new visual world.

**Tooling is machine-local.** Three third-party agent skill sets were installed to support this
work: `emilkowalski/skills` (motion and polish), `Leonxlnx/taste-skill` (anti-generic frontend
and design-reference image generation), and `impeccable` (a design-director skill with a
detector). They live under `.agents/` and `.claude/skills/` and are **gitignored**, per the
"third-party agent skills" block in `.gitignore`. They are not reviewed for a client repo, not
a milestone deliverable, and CI must not depend on them. `impeccable`'s auto-run Edit/Write
hook, which it installed into `.claude/settings.local.json` and which executes a downloaded
binary, was removed the same day: the skill can still be invoked deliberately, but it does not
sit in the edit loop.

*Reverses if:* Beco asks for a genuine rebrand, at which case this stops being a craft pass and
becomes its own milestone with Beco approval and a revised `docs/PLAN.md`. Or if the
modernisation passes cannot stay inside the performance budgets, in which case the offending
change is dropped rather than the budget raised.

### What the pass changed, 9 to 10 September

Recorded so the diff is legible and the review has a checklist. 26 files, all tests green
(482 Vitest, 82 pgTAP unchanged, 9 packages typecheck) on branch `storefront-revamp`.

**Foundation, `packages/ui`**

- **Real photography is in.** `pnpm drive:import` was run: 30 published products now carry real
  slab, bookmatch and room images. The catalogue is no longer a wall of charcoal name plates.
- **Type scale.** `--text-4xl` to `--text-7xl` became fluid `clamp()` values in `tokens.css`.
  This also fixed a real inversion: `--text-5xl` and above were undefined, so Tailwind's own
  `3rem` default made `text-4xl sm:text-5xl` shrink a heading at the `sm` breakpoint instead of
  growing it.
- **Craft floor** in `tokens.css`: `::selection`, the caret, a themed scrollbar, one
  `:focus-visible` ring, the list `::marker`, underline offset, a slight display tracking, and
  `tabular-nums` on `PriceDisplay`, all from the palette.
- **`ProductCard`** and **`RangeBrowse`**: an unphotographed item gets a charcoal specimen
  plate naming the stone, `aria-hidden` because the heading link is the real accessible name,
  rather than a blank grey box.
- **`motion.css`**: `beco-ambient` widened from `> img` to a descendant selector (D64-style),
  so the hero crossfade can nest a scale-settle wrapper without losing the drift; new
  `beco-bar-in` / `beco-bar-out` keyframes for the announcement roll.

**Home**

- **Hero** (`PinnedHero`): the crossfade carries a slow scale settle now, on a wrapper so it
  does not fight the ambient drift on the image (the D67 / D77 trap). De-crowded on feedback:
  the per-stone lede is trimmed to a short phrase, the headline is two lines, the indicator
  dropped the thickness and a row.
- **Stone sections** (hero, the "finished surface" grid, the pinned rail) filter to the
  sintered stone subset. The import brought handles into the published set and a handle was
  landing in a grid headed "See all N colours".
- **`SlabToSurface`** picks a landscape, ratio guarded room and covers the frame (see the EXIF
  note below). It is now ONE responsive pinned structure at every breakpoint: on a phone the
  parting frame grows to fill the height left after a compact caption (no lede, no secondary
  link) and the whole pinned scene is `100dvh` minus the header, so the mirror parting still
  runs on mobile without the frame bleeding into the next section.
- **Home `openingHoursSpecification` JSON-LD** split into a weekday and a Saturday spec, per
  the confirmed hours below.

**Chrome**

- **Announcement bar** is a rotating strip: every live announcement, then "Call the showroom",
  then "Email us:". Server rendered first item for no CLS, the outgoing line rolls up and out
  as the incoming one rises in, pauses on hover, still under `prefers-reduced-motion` (no
  rotation). `getLiveAnnouncements` returns the array; `buildAnnouncementItems`, in
  `lib/announcements.ts` so the RSC layout can call it, assembles the items server side.
- **Transparent header across the dark-hero pages.** `SiteHeader`'s `overHero` is now a
  `DARK_HERO_ROUTES` set, `{ '/', '/gallery', '/about', '/contact' }`, decided from
  `usePathname()` on the server so the bar never flashes. `/about` and `/contact` gained
  `beco-hero-bleed` + `beco-hero-content-top` so their opening sections sit behind the bar,
  which is transparent with light chrome until scroll and settles to solid white with a
  hairline, the same as home. `/shop` stays solid: its opening is a slim banner, not a hero.
- **Hours**, confirmed by Beco 10 September: Mon to Fri 8am to 4pm, Sat 8am to 2pm. In
  `SITE.hours`, `SITE.hoursByDay`, the home JSON-LD and the `/contact` page.
- **Social**: real Instagram (`becointeriorskenya`) and TikTok (`beco.interiors`) in `SOCIAL`;
  the three accounts Beco does not run are removed from the row rather than drawn as "coming
  soon" placeholders.

**About**

- **New opening**: a charcoal full-bleed room hero, bounded to `100svh` with a `min-h` /
  `max-h` so it never runs past a screen or collapses, content bottom-anchored, plus a
  statement-of-intent section. Both built from `docs/BECO-COMPANY-PROFILE.md`, Beco's own words
  supplied 10 September. The `PageHeader` / `StoneSlider` opening it replaced is gone.

**Shop**

- **`/shop` filter (`ShopControls`)**: better on both. Sticky under the header on every size
  now. Desktop is the one inline row as before. Mobile is a compact bar of search + a
  "Filters" button (red badge for active facets) that opens a panel with full-width range /
  finish / sort selects and a "Show N results" button. The controls are the same elements at
  both sizes, via `display: contents` from `lg` up. This revises D65.
- **`/shop/[category]`**: leads its right column with a bookmatched pair where the range has
  one. The column stretches to the full height of the long SEO description and the photograph
  grows to fill the space above the facts list, so there is no dead space beside the lower
  paragraphs.

**Quote flow**

- After "Add to quote", the button becomes "Add again" and a "Review quote (N)" link to
  `/quote` appears beside it, carrying the live count, so the single item path is add, review,
  send and the multi item path is add, keep browsing, review, without hunting for the header
  link.

### Known content issue found during the pass: EXIF orientation

Several room photographs rescued from the mis-organised `DELFONE 12MM` folder (Statuario,
Statuario Gold, Taj Mahal and neighbours) carry a broken EXIF orientation and render rotated
90 degrees, even though Sharp's `.rotate()` runs in the pipeline. The metadata read at
`tools/drive-import/src/images.ts` does not auto-orient, so `products.images[].width/height`
records the pre-rotation dimensions, which is why a ratio guard alone cannot catch them. Worked
around for now: `SlabToSurface` and the `/about` hero prefer stones photographed in their own
clean folders and apply a ratio band. **The real fix is in the import pipeline** (auto-orient
before reading metadata, or record `orientation` and correct the stored dimensions) and it is
recorded in `docs/PLAN.md` as deferred.

### Still open on this pass

- **Portrait video sections.** Beco approved the licensed landscape clip on `/gallery` (D69)
  and asked for the portrait `SHOWROOM_FILM` sections (home, `/contact`) to move to licensed
  landscape stock the same way. Not done: sourcing and licence-verifying a specific clip needs
  a session with web access, the same care D69 took. Recorded here and in `docs/PLAN.md`.
- **`/about` lower sections** (the pillars, the rotating statement, the showroom block) still
  carry their pre-pass design. The opening was the brief; the rest is a follow-up.

## D83, 10 September 2026: the dashboard authorization model, and the first-login RPCs

M5 section A extends the D80 launch slice to the whole dashboard. Three decisions were made in
the build and are recorded here so the next session does not re-derive them.

**The route/role map is data, in `apps/dashboard/src/lib/access.ts`.** The proxy and every
page read the same `ROUTE_RULES` table and the same `ROLE_LANDING` map, so "a salesperson
cannot open `/users`" is decided in one place a test can point at, not re-argued per screen.
The matrix: `beco_sales` gets `/quotes` and `/orders`; `beco_product_manager` gets `/products`
(labelled Catalogue; `/stock` redirects there); `beco_admin` and `brightex_admin` get those plus `/announcements`,
`/reports`, `/settings` and `/launch`; `/users` is `brightex_admin` only, per D6. A wrong role
is redirected to its own landing, not shown a 403, because it is a real signed-in user in the
wrong place. `beco_editor` has no operations screen in M5 (its work is the blog, which is
Studio, M7), so it lands on `/` and gets a plain "nothing assigned yet" page rather than being
bounced out.

**`last_login_at` and `must_change_password` move only through security-definer RPCs**
(`record_sign_in()`, `complete_first_login()`, migration 26), never a direct `users` write from
a near-client path. `users` carries the role, the active flag and the forced-change flag, and a
write path a crafted request can reach must not be able to move any of them. `record_sign_in()`
also writes the `login` `audit_log` row, because `audit_log` takes no direct insert. As part of
the same migration, `users_update_self_safe` was narrowed: a self-update may still change
`full_name`, but `role`, `is_active`, `email`, `must_change_password` and `last_login_at` are
each pinned to their stored value in the policy's `WITH CHECK`.

**Deactivation ends the session in the proxy, not just in RLS.** GoTrue does not know about
`users.is_active`, so a deactivated account keeps a valid token until it expires. When the
proxy resolves a live session to a null role it clears the `sb-*-auth-token` cookies on the
response and redirects to `/login?denied=1`, so the account is out on the next request rather
than lingering. The sign-in action makes the same check and signs an inactive account straight
back out, with the same message a wrong password produces.

**MFA enrolment is deferred to the M6 security pass**, per 0.6. Forced first-login password
change is in M5 and is the part that closes the "issued password in a chat thread forever"
hole; TOTP enrolment and an admin challenge are self-contained Supabase Auth work that blocks
no other M5 screen. Recorded in `docs/PLAN.md` Deferred.

*Reverses if:* the role set changes (the map is one file), or Beco wants MFA at launch rather
than in M6.

## D84, 10 September 2026: a one-off browser check of the dashboard UI, outside rule 2

Rule 2 and D23 bar Playwright and browser automation on this project: component interaction is
Vitest plus React Testing Library in jsdom, and UI journeys are walked by hand against
`docs/QA-CHECKLIST.md`. During the M5 section A build Brown asked twice, the second time after
the rule was put in front of him, to confirm the auth screens with Playwright.

Done as a **one-off visual confirmation only**: the Playwright MCP browser drove the running
dev server to screenshot `/login`, the forced-change screen and each role's landing, and to
click the show/hide password toggle. **Nothing was added to the repo or CI**: no Playwright
dependency, no `.spec` files, no new npm script. The automated test story is unchanged, and the
before-close QA walk on a real device still stands.

*Reverses if:* browser E2E is genuinely wanted in CI, which would be its own decision amending
rule 2 and D23 rather than a note under them.

## D85, 10 September 2026: the dashboard shell is an editorial top bar, not a dashboard chrome

Brown's steer during the section A build: the dashboard navigation should be clear, mobile-aware
with quick access to the key sections, and should not look like the usual admin dashboard. The
"Never build" list already rules out the dark sidebar with sparkline tiles; this records what
was built instead.

**Two thin bands, both white.** A wordmark plus account bar, then a section row beneath it. Top
nav, never a sidebar (CLAUDE.md). The section row is **text only**: no icons, no pills, no
boxed active state. The current section is charcoal and carries a 2px Warm Red underline; the
rest sit in neutral-500. Hierarchy comes from weight and colour, which is the same rule the
storefront's nav follows.

**Mobile is a horizontal scroll strip, not a hamburger.** Every section stays one swipe away,
the ones a role uses most sit first (`navItemsFor` orders them), and a right-edge fade cues
that there is more. A hamburger would have hidden the counter salesperson's own quotes behind a
tap on the screen where speed matters most.

**The wordmark is text, not the logo mark.** Beco's mark is Warm Red, and a red element on
every dashboard page contradicts "Warm Red for attention states only" (the design-system skill).
The only Warm Red in the chrome is the new-quote count on "Quotes".

**`navItemsFor(role)` reads the same `lib/access.ts` map the proxy uses**, so the nav can never
offer a link the route guard would then bounce.

Structurally: `AppShell` wraps the `apps/dashboard/src/app/(app)` route group;
`/login`, `/change-password` and `/launch` sit outside it and keep their own chrome. Sign out
is a server action (`app/actions.ts`), not a link.

*Reverses if:* the section list grows past what a single row can hold on desktop, at which
point the overflow behaviour is revisited rather than the pattern.

## D86, 10 September 2026: a quote that deviates from the catalogue needs one person's approval

Brown's steer, mid M5 section D: Beco wants one person tracking every salesperson's discounts
and custom line items before a quote goes out, rather than D7's fully open price override.

**Narrower than it could have been, on purpose.** The gate is not "every quote" and not "every
price override attempt": it is "a quote that has been priced AND deviates from the catalogue."
A quote raised and sold at list price, which is most of them, never waits, because that speed
is what the counter flow and the 12 tap budget exist for. Only a discount, a markup, or a
custom line with no catalogue reference trips it, and only once it is actually priced:
`unit_price = 0` is 0.3's "not priced yet" state, not a pricing decision, so it does not gate.

**The approver is a role, `is_admin()`, not a named person or a new permission flag.** Beco
currently has one `beco_admin` account, so "one central person" and "the admin role" are the
same thing today without inventing a bespoke single-user gate that breaks the day a second
admin exists or the one admin is on leave.

**Enforced at the database, in a `check` constraint on `quotes`, not only in RLS or the UI**:
`status` cannot reach `quoted`, `won` or `lost` while `requires_approval` and `approved_at is
null`. `requires_approval` itself is trigger maintained from the current `quote_items`, never a
column a client sets, and `quotes_update_own` (the `beco_sales` self-update policy) pins all
three approval columns the same way `users_update_self_safe` pins `role`, per D83.

**An edit after approval clears it.** The trigger that recomputes `requires_approval` also
clears `approved_by` and `approved_at` whenever the lines change, so an approval is a signature
on a specific set of prices, not a standing permission to keep discounting. A side effect worth
naming: editing a line on a quote that is already `quoted` and approved is refused outright,
because the trigger's own update would leave the row in the state the `check` constraint
exists to forbid. A finalized quote's pricing cannot be quietly reopened; it would need its
status moved back first, which nothing in this migration does.

Migration 27, `10_quote_pricing_approval.test.sql`, 11 pgTAP assertions.

*Reverses if:* Beco names a second approver, at which point `is_admin()` already covers it, or
wants per-person approval limits, which would need the permission flag this avoids for now.

## D87, 10 September 2026: closed a real RLS gap, quotes and orders were readable by any role

Found while building the quotes list, and fixed rather than built around.
`quotes_read_staff`, `quote_items_read_staff`, `orders_read_staff` and
`order_items_read_staff` all read `current_user_role() is not null`, which is true for every
active role. `docs/ARCHITECTURE.md` section 12's own role matrix has always said quotes and
orders are `-` for `beco_product_manager` and `beco_editor`; the policy just never matched it.
Nothing had a reason to read quotes or orders from either role, which is exactly why it went
unnoticed rather than why it was safe.

Migration 28 names the three roles that should read customer names, phone numbers and pricing:
`beco_sales`, `beco_admin`, `brightex_admin`. Writes were never affected, since
`quotes_update_own` and `quotes_write_admin` already named their roles explicitly; this closes
the read side only. `11_quotes_orders_read_gap.test.sql`, 12 pgTAP assertions, proving the
negative for both roles on all four tables and a regression check that sales and admin still
read both.

## D88, 17 September 2026: shadcn is the dashboard construction standard, not a look

The dashboard needs focus trapping, keyboard menus and ARIA relationships that
are expensive to get right by hand. shadcn's copy-paste of Radix is how those
widgets are built. The storefront stays bespoke editorial layout and never
imports them.

What this is not: installing shadcn in `apps/dashboard`, running the CLI
against an app, adopting New York radius and muted greys, or shipping lucide
icons in the chrome. Unstyled shadcn is the default admin template look that
section 11.1 of the brief forbids. If a component looks like default shadcn,
it is not finished.

Rules that follow:

- New copies land in `@beco/ui`. `packages/ui/components.json` is the only
  config. Never a `components.json` in either app.
- Restyle onto Beco tokens before it ships. `DropdownMenu` is the reference.
- `ConfirmDialog`, `Dialog`, `AccountMenu` and native `Select` stay off
  Radix so they remain testable in jsdom or honest on a phone.
- Tests stay Vitest plus RTL in jsdom (D23).

*Reverses if:* a later pass proves Radix cannot be asserted in jsdom for a
widget we need. That widget stays a plain implementation. The dashboard does
not drop the standard for the widgets that do work.

## D89, 17 September 2026: stock lives on the catalogue editor, not a second nav item

The product manager had two sections, Stock and Products, that edited the same
row. Quantity, threshold, price, specs and SEO now sit on `/products`, labelled
Catalogue. `/stock` redirects there so old links do not 404. Automatic
decrement from orders stays deferred: there is no reservation model yet.

*Reverses if:* Beco later wants a warehouse scanning table that is not the
catalogue editor, in which case `/stock` becomes a real screen again and the
redirect is removed.

## D90, 23 September 2026: the Drive importer stops owning commercial identity past first insert

D54 said the importer owns photographs and provenance, never commercial
fields, and named its own reversal condition: "if the dashboard's product
editor becomes the source of truth at M5." That has now happened, `/products`
shipped as the ongoing way to change a product, but `run.ts` was never
updated to match. It still wrote `name` and `category_id` on every run that
touched an existing product, so a dashboard rename or recategorisation
reverted to the Drive folder name the next time anything in that folder
changed, including just adding a photograph, which is exactly what re
running the import to pick up Beco's new photos was about to do.

Fixed by writing `name` and `category_id` on insert only. `images` and
`source_path` stay importer owned on every run, and that half of D54 still
holds, tightened by the same pass: the per file loop only ever pushed what it
downloaded THIS run into the images array, so a re run silently replaced the
whole stored gallery with just the new files, dropping any existing unchanged
photo. `mergeProductImages` now carries an unchanged file's own prior entry
forward, matched by a `driveFileId` recorded on each processed image.

*Reverses if:* a future pass wants Drive to be able to correct a product name
after the fact, which would need an explicit signal (a flag, a convention)
distinguishing a Drive-sourced rename from a dashboard one, not a blind
overwrite.

## D91, 23 September 2026: category and range management moves into the dashboard

The schema supported this since migration 19, `categories.parent_id`, the two
level depth trigger, `categories_write` RLS, and migration 19's own test file
literally says it "attacks the trigger from every direction the dashboard's
category editor could reach it." No editor was ever built. Renaming a range,
filing one under a different group, or adding a new one at all required a
developer writing a SQL migration, which is the exact bottleneck rule 8's
"no developer needs to be present" standard exists to remove, and this
session's build plan asked for it directly.

New `/categories` route, product manager and admins, same access as
Catalogue. This revises the M5 handover's "one Catalogue item" nav note:
a second, closely related item, Ranges, sits beside it. The taxonomy is a
materially different surface from a single product (a tree with depth rules,
not a record), and cramming it into the products sheet would have compromised
both screens rather than kept the nav minimal for its own sake.

Category slugs get the same history table products already had,
`category_slugs`, migration 49, so a rename 301s instead of losing whatever
the old URL had ranked for. Delete only works on an empty range or a
childless group, enforced server side, because neither foreign key restrains
it: `category_id` and `parent_id` both go quietly null on delete, correct
behaviour for other reasons, wrong for a delete button with no warning.

*Reverses if:* Beco never actually reorganises the taxonomy in practice and
the screen goes unused, in which case it is cheaper to fold range editing
back into the product sheet than to maintain a second screen nobody opens.

## D92, 23 September 2026: a second storefront pass, wider than D82

Brown's call, put in place explicitly overriding the narrower framing this
session first proposed back to him. D82 scoped the September modernisation
as a craft pass: sharper inside the existing system, not a new visual world.
Brown's verdict on the result is that it still does not read as premium
against the inspiration references he shared (Poliform, Aestic, Ambiente and
similar), and asked for room to genuinely diverge from the interaction rules
in `CLAUDE.md`, not just polish inside them. This decision is that room,
scoped rather than open ended.

**Stays locked, unchanged from D2 and D82.** Charcoal Black, High-Vis White
and Warm Red at their guideline values, Titillium Web and Cormorant
Garamond, the 8px base and the type floor. The Lighthouse budgets (LCP
under 2.0s, CLS under 0.05, INP under 200ms, the page weight and hero image
ceilings): these are not a Brightex house rule being relaxed for its own
sake, they are the same speed Brown asked this pass to protect in the same
conversation he asked for the deviation, so a change that costs the budget
is not shipped regardless of how it reads. No `window.confirm/alert/prompt`,
no Playwright, reduced motion still collapses every effect: none of that is
what "premium" was ever blocked on.

**Opens up.** The six named motion effects and "one significant effect per
section" stop being a ceiling: a page can carry a genuinely designed motion
system rather than a pick from a list, as long as reduced motion still
collapses it and nothing but transform and opacity drives it. The "craft
pass inside the existing system" framing is retired: this can be a new
structural and interaction language, not sharper versions of what shipped
in September. `framer-motion` is added as a real dependency rather than kept
off because the CSS transition approach already covered the six effects.
Shadcn stays the base `@beco/ui` is already built on (`components.json`,
Radix primitives, CVA were there before this decision), now used
deliberately rather than incidentally.

**Cinematic hero and header, everywhere the guideline previously confined
them.** The header's transparent-over-hero, solid-on-scroll behaviour and
its contrast-tested scrim stay (the 55% floor at the header's weakest point
is a real accessibility fix, not decoration, D79's own header note), but the
flat two-stop gradient can be softened into a longer cinematic falloff.
Hero treatment extends to `/shop` and `/product`, which D79's own routing
table deliberately excluded as "a slim banner, not a full hero": that
exclusion is reversed here. The home hero moves from sintered stone alone to
the full six ranges.

**Photography is static, not queried live, on Brown's explicit instruction
given mid session.** The original draft of this decision had the hero
reusing `imageForGroup`/`imagesForGroup` against the live `products` table,
the same way the range cards further down the page already do. Brown
stopped that: a hero, or any imagery on a page that is not itself a product
page, has to survive `pnpm db:reset` intact, so only product information and
product photography are allowed to go blank on a reset, never the site's own
design. This is not theoretical. Checked live against this machine's own
local database while writing this decision: every one of the 24 sintered
stone products currently has zero images, `role` on every image that DOES
exist elsewhere in the catalogue reads `unknown` rather than `application`
or `slab`, and `docs/SETUP.md` already documents why: `db:reset` rebuilds
the catalogue from its migration, R2 keeps the files, but the image records
that point at them only come back via `pnpm drive:import`, a twenty minute
run nobody does by reflex after every reset. A hero built against that query
is broken more often than it works on a fresh machine.

The fix already exists elsewhere on this site and is extended rather than
invented: `SITE_SHOTS`, `SHOWROOM_FILM` and `GALLERY_FILM` in
`apps/storefront/src/lib/site.ts` are all hardcoded manifests pointing at
files in `apps/storefront/public/`, committed to git, immune to a database
reset because nothing about them touches Postgres. The hero's new per-range
manifest, `HERO_RANGES`, follows the same shape. Sintered stone draws on
`SITE_SHOTS`'s own real Beco photography rather than new sourcing. Where no
static Beco shot exists yet for a range (lighting, wall panels, flooring,
hardware, accessories are the thin ones), free, commercially licensed stock
fills the gap exactly the way `GALLERY_FILM` already does for the gallery's
ambient video: a real, checked Pexels/Unsplash/Pixabay source, license
confirmed free for commercial use before download, credited in the source
comment for traceability, downloaded and committed to `public/hero/` rather
than hot linked, and replaced the moment Beco has real room photography for
that range. Optimised to the same weight budget as every other hero image.
Product photography itself is unaffected by any of this: `/shop`,
`/product` and every card still read the live `products` table as before,
because a reset leaving product data blank until the next import is the
correct, expected behaviour D91 and `docs/SETUP.md` already document, not a
bug this decision is trying to fix.

**Sequencing.** Runs on `storefront-cinematic-redesign`, forked from `dev`.
Broken into session sized milestones rather than one pass, on Brown's own
instruction to keep this out of a single chat session's context: Home first
(this session), then Shop, then Product, then Gallery, About and Contact
together since they already share the dark hero pattern, then the dashboard
modernisation as its own, separate milestone. Each page's change is still
recorded as an M4 revision, the same way D70 to D79 and D82 were. This
decision also folds in the storefront feedback queue `docs/PLAN.md` had
recorded as routed to a different chat session (home hero copy, pricing
prominence, the `/about` showroom video and background, real project
photography replacing supplier renders on `/gallery`, a floating WhatsApp
button, dual homeowner and professional pathways): it overlaps too heavily
with this pass to stay a separate, unclaimed thread.

**Dashboard.** Same top nav, but the screens move from a working skeleton to
a styled one: coloured, avatar bearing tables, charts where a screen
actually has a trend or a split worth showing, not charts added because a
dashboard is expected to have one. Its own milestone, scoped and recorded
separately once the storefront passes are done.

*Reverses if:* a specific change cannot be made to fit the Lighthouse
budgets even after image and delivery optimisation, in which case that one
change is dropped rather than the budget raised, matching D82's own
reversal clause. Or if Beco asks that the palette or type themselves change,
which still needs Beco at the table, unchanged from D82.

## D93, 24 September 2026: the shop's catalogue-by-category section, a duplicate range folder, and two new pages

Closes the one item D92's Session 2 table named but did not ship: `/shop`'s catalogue read as
one flat grid of everything, reported directly as wanting the ranges Beco actually deals in to
be legible on its own busiest page, sintered stone leading rather than buried in an
alphabetical wall.

**This was tried once already and reverted, on 14 September: worth stating plainly rather than
quietly redoing it.** That session's own commit message: "A rail per range was tried first and
reported back directly as repetitive right after the featured one, so there is a single curated
row now." What shipped instead was the single Featured rail plus a flat paginated grid, which is
what `/shop` carried until this decision. This decision reverses that specifically on fresh,
direct instruction given this session, arranging the catalogue by range again, sintered stone
leading. Two things are genuinely different from the version that read as repetitive, both worth
recording in case the objection returns: each rail now carries the range's WHOLE published stock
rather than the same up-to-three badged items Featured already showed a screen above, so the
content is not literally a repeat; and each rail ends in its own "View all" to a real page rather
than every rail feeding the same flat grid Featured already sits above. If it reads as repetitive
again once it is actually seen running, that is the same objection raised the first time and
should weigh the same way.

`SlabRail`'s own docstring, written when it was built for Home's single Featured row, already
anticipated exactly this use, unbuilt until now: "the shop page can run one of these per
category, 'Sintered stone' leading to its own range, without a second copy of the chrome
drifting from this one", `divider`, `viewAllHref` and `viewAllLabel` all already there for it.
`/shop`, browsing rather than filtering, now renders one `SlabRail` per `RANGE_GROUPS` entry, in
that order, each carrying every published product in the range's subtree so the rail's own arrow
controls genuinely move through the whole thing, and skips a range with nothing published rather
than rendering an empty rail, the same rule Featured already applied. `divider={false}`
throughout, per the component's own note that several of these stacked back to back read as one
continuous rhythm without it. A search or a facet still collapses this to the one flat, paginated
grid it already showed, unchanged: a reader who narrowed the catalogue on purpose asked for that
specific set, not Beco's editorial shape of it.

**"View all" needed somewhere to lead that did not dump everything at once.** It already led to
`/shop/<range>`, but that page rendered its full product list with `ProductGrid`, no pagination.
Swapped for `ProductGridPaginated`, the same paginated grid `/shop`'s own filtered view already
used, twelve at a time behind a "View N more" button, rather than either page inventing a second
pagination pattern.

**A real duplicate, not a styling gap.** Reported directly against the footer's products column,
seen still listing "Lights" once "Lighting" was already fixed the first time this session: a
stale point, not a wrong one. The footer reads categories live from `getCategoryTree()`, and
`revalidate = 3600` on the pages that warm that fetch cache meant a direct database fix during a
`next dev` session already running did not show until the dev server itself restarted and threw
its in memory cache away. Once restarted, the real fix held: the Drive importer's "Lights"
folder, a loose folder of photographs with no product subfolder per the same "one product per
folder" gap `docs/STATUS.md`'s "Waiting on Beco" list already tracks, had imported as its own
top level category rather than landing inside the actual "Lighting" range, so the footer, the
shop filter and the home range grid all carried both, one of them permanently empty and marked
"soon". The one real product in "Lights" was moved into "Lighting" and the now empty duplicate
category deleted, directly against the local database rather than through a migration: this is
catalogue content from the Drive import, not schema, and the same fix still has to happen to the
Drive folder itself, merging or renaming it into "Lighting", before the next `drive:import`
recreates exactly this duplicate. Recorded here rather than only fixed silently so a future
session does not spend an hour rediscovering it. The footer's "soon" marker on any zero stock
range is also gone, on direct request: said once in the "Also stocked, being photographed"
section `/shop` itself already carries, it does not need repeating in small grey type in every
footer visit too.

**The old Brightex credit is gone from the footer**, replaced by "Terms & conditions" and
"Privacy policy" links, on direct request. Both are genuinely new pages rather than stubs: short,
general and specifically NOT inventing a commitment nobody at Beco has agreed to, a returns
window or a liability clause chief among them. What each one states is already true elsewhere in
this codebase: 30 day quote validity and VAT shown as its own line per `files/BUILD-PLAN.md`'s
own A3, no payment taken through the site itself, the same fraud prevention note `/team` already
carries about matching a payment request to a real quote, and, for privacy, that the quote list
a reader builds lives in their own browser via `localStorage` until they choose to send it, and
that no advertising or tracking script is wired into the storefront today, checked by `grep`
rather than assumed. Both pages share one new `LegalSection` component rather than each hand
writing its own heading and prose block, and both read as a single centred reading column rather
than the site's usual asymmetric layout, on direct request: a page that is nothing but prose
reads as unbalanced dead space beside a short heading at the site's normal left edge.

**Four of the home page's process step captions were rewritten.** "The list survives a refresh,
and no account is required" and "Your name and phone number are the only things we genuinely
need" described the tool's own behaviour to the person using it rather than speaking to them
directly, reported directly as reading like system language rather than something Beco would
actually say to a customer at the counter.

*Reverses if:* the per range rails read as repetitive again once actually seen running, the same
objection that reverted the first attempt on 14 September, in which case `/shop` goes back to one
Featured rail over a flat paginated grid rather than trying a third variant unasked. Also
reverses if Beco's own Drive folder for "Lights" is renamed or merged differently than "Lighting"
absorbing it, in which case the database fix here is redone to match whatever the next import
actually produces.

**Addendum, same day: the first reversal clause fired.** Seen live against the running site
rather than only reasoned about, `/shop`'s per range rails were reported back as needing to
revert, the same call made about the near identical layout on 14 September. A second, sharper
reason surfaced alongside it: `RailTrack`'s cards, built for Home's editorial Featured row, carry
no price and no add to quote control at all, so browsing the actual catalogue that way was a
functional step back from `ProductGrid`'s own `ProductCard`, not only a repeated taste call.
`/shop` is back to exactly its pre D93 shape, one Featured rail over a flat, paginated grid, and
every product card there carries its price and `QuickAddToQuote` again, confirmed against the
rendered HTML rather than assumed. `/shop/[category]`'s own `ProductGridPaginated` swap was never
part of the complaint and stays. The catalogue-by-category section remains the one item open from
D92's Session 2 table, now tried and reverted twice: repetitive alone the first time, repetitive
and missing commerce actions the second. A third attempt needs to answer both, not just repeat
either previous shape.

## D94, 24 September 2026: the Featured rail's own two real bugs, and why the filter bar was not actually sticking

Three items, all reported directly against the Featured rail and the docked filter bar that D93
left in place once the per range rails themselves were reverted.

**"View all" on Featured went nowhere a reader could see, reported as not clickable.** It was not
a broken link in the DOM sense: `viewAllHref="/shop"` rendered a real anchor, but `/shop` is the
page it was already on, so clicking it produced no visible change, which is indistinguishable
from broken to the person clicking it and is exactly what rule 3 means by a control that looks
right and does nothing. Changed to `viewAllHref="#the-whole-catalogue"`, a real id now on the flat
grid section beneath it, with `viewAllLabel` reworded from "View all" to "See everything" since it
jumps to everything rather than to one range. `scroll-mt-48` on that section so the jump lands
below both sticky layers, the header and the filter bar, rather than tucking the heading under
them.

**The Featured rail itself was not actually showing the whole business**, reported directly
against a screenshot where several of the visible cards were "Fluted Wall Panels" and "Drawer
Rails", the same loose Drive folders D93's own addendum already named, rather than the six ranges
Beco actually organises around. The rail was built from the raw top level `groups` returned by
`getCategoryTree()`, eight rows today because two loose folders each import as their own top
level category, three items per row and a hard cap of twelve overall. With eight rows competing
for twelve slots, iteration order decided which real ranges got crowded out entirely: Hinges and
Office Accessories, both genuinely stocked, did not appear. Rebuilt from `RANGE_GROUPS`, the same
six range list `/`'s own "What we deal in" section and the hero already use, so Featured now
always carries up to three items from each of the six, sintered stone through accessories, with
no overall cap needed since six ranges at three each tops out at eighteen. Confirmed against the
rendered HTML: every range with any stock now appears at least once, flooring still absent
because it genuinely holds nothing published, the same content gap D93 already recorded rather
than a bug this fixes.

**The filter bar was never actually sticking, only appearing to for an instant.** Reported as
wanting it to "stick at that point for easier access" while scrolling, which is what `sticky
top-20` was already supposed to do and had been described as doing since D62. The real defect:
`position: sticky` holds an element in place only for as long as its own PARENT is still passing
through the viewport, and the bar's parent was a wrapper exactly as tall as the bar itself, a
sibling of the rest of `/shop` rather than an ancestor of it. The instant that thin parent's
bottom edge reached the sticky offset, the bar had nowhere left to stay pinned within and
resumed scrolling immediately, which reads as never having stuck at all. `ShopControls` now takes
`children`, rendered inside its own outer wrapper after the sticky layer rather than passed as a
page level sibling, so that wrapper is as tall as the whole browsing surface, Featured and the
full catalogue grid both, and the bar can stay pinned below the header for the whole of that
scroll. The sticky class itself moved from the innermost bordered card onto the middle gutter
layer, so the card's own internal padding is unaffected: only which element the containing block
math runs against changed, not how anything is meant to look. This is one CSS mechanism, so it
applies identically at every breakpoint, including the phone layout's "Filters" panel, without a
separate mobile fix. `shop-controls.test.tsx`'s existing behavioural coverage still passes
unchanged, since nothing about the bar's own interactions moved, only its position in the tree.

**Addendum, same day: that fix introduced a real stacking bug, caught immediately against the
running page, and the first attempt at fixing it was still wrong.** Reported directly, with a
screenshot: the filter bar's own bottom edge was rendering under the product cards once scrolling
began, the search field and the range dropdown both partly covered by an image scrolling up over
them. Cause: making `children` render INSIDE the bar's own outer wrapper, the fix above, also made
the bar and the scrolling content SIBLINGS inside that wrapper for the first time. Neither carried
its own `z-index` before, because they never used to share a stacking context: the bar had one
internal to `ShopControls`, the content sat entirely outside it as a page level sibling.

First fix tried was `z-10` on the sticky layer, confirmed live and by a passing test run, and
still reported back as broken, persisting at rest rather than only during scroll, this time
specifically the product card's own TITLE, PRICE and ADD button rendering over the bar rather than
its image. That specificity was the tell: `ProductCard` (`packages/ui/src/components/product-card.tsx`)
sets `relative z-10` on its title, its price row and its action slot individually, each for its
own reason internal to the card, and the card's own root wrapper is `relative` with no z-index of
its own, which does NOT isolate a stacking context. Position without a set z-index does not
create one. So those three z-10 elements were never actually contained inside "the card"; they
were always stacking directly against whatever the nearest ancestor stacking context is, which
used to be irrelevant because the bar and the grid were never siblings in one, and became relevant
the moment this decision made them so. A bar at `z-10` ties with card internals also at `z-10`,
and a tie resolves to document order, later wins, which is the grid. Fixed by moving the bar to
`z-30`, clear of every z-index actually in play inside `/shop`'s own content (`z-20` on
`RailTrack`'s arrow buttons is the next highest, checked by grepping every component `children`
can render rather than assumed) and still short of the header's own `z-50` above it.

*Reverses if:* a future range genuinely does not belong in `RANGE_GROUPS`, in which case Featured
is rebuilt against whatever list replaces it rather than reverting to the raw category tree this
decision moved away from.

## D95, 24 September 2026: a services section on Home and About, dated legal pages, and cutting the eyebrow device's own repetition

Reported directly, together: `/terms` and `/privacy` gave no indication of when they were last
reviewed, and, more broadly, "the random lines used across gives the impression of the site is
done by AI, we want to ensure no AI slop is left on the platform." Asked directly which lines,
the answer was all three: the repeated visual hairline-plus-uppercase-label opener ("the eyebrow"
in this codebase's own comments), repeated copy phrasing site wide, and the `/terms` and
`/privacy` copy specifically.

**Dated pages.** Both now carry a `LAST_UPDATED` constant set by hand under the page header, not
read from a clock: a "last updated" date that always says today is worse than none, because it is
trusted. Both also had their copy tightened, seven `LegalSection` blocks down to five on `/terms`
and six down to four on `/privacy`, folding near identical uniform blocks (stock availability into
quotations, damage into delivery, why into what) into the sections they actually belonged beside,
rather than one tidy paragraph of the same length under every heading, the generated-checklist
rhythm that was the actual complaint.

**The eyebrow census.** An Explore agent catalogued every occurrence across the storefront rather
than guessing where to fix it. Findings: Home is the worst offender, four sections in a row,
"What we deal in", "Why Beco", "Completed interiors" and "The range", separated only by a
background tint change in places, immediately followed by the Process section's own comment
explaining why IT has no eyebrow, one section too late to stop the run before it. About carries
two back to back triples. Gallery is the most visually dense page relative to its length. Shop
category pages and the product page already show the restraint being asked for and were left
alone as the models to extend rather than pages needing a fix.

Fixed on Home and About specifically, the two pages named directly, rather than attempting
Gallery in the same pass: `CompletedInteriors` gained an `eyebrow?: string | null` (was
`string`), `null` dropping the row entirely rather than every caller being forced to keep one,
and Home's own call now passes it. Home's "The range" and About's "Inside the showroom" and "The
team" sections had their eyebrow markup removed outright, each because the heading or the
surrounding content (a caption plate, a numbered list right above) already names the section
without it. Net effect on Home: the four-in-a-row is now two. On About: six of seven eyebrow
sections down to four, with two genuine white-space breaks (the new services section below, and
the existing statement-of-intent and rotating-statement sections) between the remaining ones
instead of stacking back to back.

**A services section, on both pages, on direct request: "i dont see... a section showing the
services beco offers... that need to stand out clear across the 2 key pages."** Grounded in
`docs/BECO-COMPANY-PROFILE.md`'s own "What we do" and "The client journey" rather than invented:
consultation and selection, a site assessment ahead of anything fabricated, fabrication and
installation (sintered stone and wall panels specifically, per the profile, not every range,
which `SERVICES` in the new `lib/services.ts` states correctly rather than overclaiming), and
delivery. Shared between both pages rather than each writing its own list, the same reasoning
`RANGE_GROUPS` and `RangePillarList` already rest on elsewhere in this codebase.

First built with `RangePillarList`, the numbered-row component already sitting unused in
`packages/ui` since About's own material pillars moved to photograph tiles in an earlier session,
reasoned as a natural fit for a fourth thing on the page needing "a numbered row, real content".
Reported back directly as the wrong design style. Rebuilt as a new `ServiceCardGrid`
(`apps/storefront/src/components/service-card-grid.tsx`) instead, reusing the soft raised card
`Why Beco` and About's own team section already establish on both pages, a short red rule
standing in for an icon, rather than inventing a third card language. Each card carries its own
"Book a consultation" action, on direct request, opening WhatsApp with that specific service
named in the prefilled message (`whatsappLink(item.title.toLowerCase())`) rather than one generic
enquiry button for the whole section, so the button states what it does and the message on the
other end proves it. Tested: `service-card-grid.test.tsx` asserts every card's link carries the
right href for its own service, opens in a new tab, and the grid has no accessibility violations.

**The showroom photograph, About's own rotating statement.** Reported directly against a
screenshot: the stock photo standing in for the word SHOWROOMS read as a home decor shelf, folded
textiles and a potted plant, nothing like an interior materials showroom. Beco's own showroom is
real and already photographed, `/video/showroom-poster.jpg`, a still from the real
`SHOWROOM_FILM` this same page already embeds further down, so reaching for a different stock
photo would have been a worse answer than the real one already on hand. Swapped directly; the old
`/rooms/showroom.webp`, confirmed unreferenced anywhere else first, is deleted rather than left
orphaned in `public/`.

`pnpm typecheck` clean, full `unit` (258) and `component` (547, four new) projects green.

*Reverses if:* Gallery's own density, named in the census but not touched this pass, turns out to
need the identical fix rather than a different one once someone actually looks at it running.

## D96, 24 September 2026: WhatsApp's own prefilled message, rewritten to say the intent rather than wrap it

`whatsappLink`'s template built every message the same way regardless of what the reader had
actually clicked: `Hi Beco, I would like to ask about ${context}.`, with `context` a bare topic
("speaking with Jane Doe", a product name, a service title) rather than a sentence. Asked
directly for the prefilled text to "read Hi Beco Interiors, [the intent of the message]", then
separately, once four new service buttons made the pattern's limits obvious, to make every one of
them "match the intent of that button clicked".

`whatsappLink(intent?: string)` now treats its argument as a full clause completing "Hi Beco
Interiors, ...", not a topic for a wrapper sentence to append. Every call site audited against its
own button, not just reworded to fit the new template: `/product/[slug]` states "I'm interested
in {product}"; `/team` states "I would like to speak with {name}"; the quote confirmation states
"here is my quote reference, {reference}", matching its own "Send the reference on WhatsApp"
button; `ServiceCardGrid`'s "Book a consultation" states "I would like to book a consultation on
{service}"; Home's own "Book a showroom visit" states exactly that. One real miss found in the
audit: `error.tsx`'s "Message us on WhatsApp", shown only when something has actually broken, was
still opening the same bare "I would like to enquire." as a floating chat widget with no context
at all. It now states "I ran into an error on the website and need help", the one message that
should read differently depending on where the button sits. Left generic on purpose, checked
individually rather than assumed: the contact page's own WhatsApp channel card ("send a
photograph, a drawing or a question", one of three deliberately general ways to reach Beco), the
mobile menu's "WhatsApp us" nav shortcut, the floating chat widget, and the footer's own WhatsApp
link. None of these sit next to a specific product, service or action, so a generic enquiry is the
honest message for what the button actually is.

`service-card-grid.test.tsx` updated to assert the new full-clause hrefs rather than the old bare
topic. `pnpm typecheck` clean, full `unit` (258) and `component` (547) projects green.

## D97, 24 September 2026: the header's own phone number, wrapping onto two lines around 1024 to 1280px

Reported directly against a screenshot at 1200px: the header's business line, `+254 722 333 730`,
broke onto two lines, crowding the Quote button beside it. The number's own text already had a
graceful fallback for tight widths, `hidden lg:inline` so only the phone icon shows below `lg`
(1024px), per its own comment: "icon plus number where there is room, icon alone where there is
not, so it never wraps." The judgement of where "there is room" actually starts was wrong, not
the design: five nav items, the logo, the number and the Quote button all compete for one row from
`lg` up, and 1024px was not genuinely enough of it. The number was also the only multi-word text
in that row without `whitespace-nowrap`, so it was the one thing that gave when the row was tight,
wrapping at its own spaces rather than the row visibly overflowing.

Raised the reveal breakpoint from `lg` to `xl` (1280px), and added `whitespace-nowrap` under it
regardless: the breakpoint is a judgement call about how much room the rest of the bar needs,
`nowrap` is a floor that holds even if that judgement is wrong a second time. Between `md` and
`xl` the business line is icon only, unchanged in principle, just correctly scoped now.

*Reverses if:* the header's own content changes enough (a shorter or longer nav, for instance)
that `xl` stops being the right threshold, in which case it is retuned against the running header
rather than assumed to still be correct.

## D98, 24 September 2026: two more narrow-width fits, header spacing and the bookmatch caption

Reported directly, testing between roughly 650 and 860px: the header's phone icon, Quote button
and hamburger trigger read as touching, and the "It opens along the seam" bookmatch section did
not sit well within its own box.

**Header.** The right hand group was `gap-1 sm:gap-3`, 4px between three 44px targets below
`sm` (640px), one of them a solid red button beside a plain icon trigger. Visually crowded even
though nothing was actually overlapping. Raised to `gap-2` (8px), one grid step under CLAUDE.md's
own 8px base, keeping `sm:gap-3` unchanged above 640px.

**`SlabToSurface`'s caption column.** Its `min-h-[12.5rem]` was sized for the compact phone
state: an eyebrow, a short heading, and the "scroll to open it" cue, nothing else. The lede
paragraph and the secondary "All bookmatched stone" link both switch on at the same `sm`
breakpoint (640px) via their own `hidden ... sm:block` / `sm:inline-flex`, but the box holding
them, absolutely positioned children filling their parent's exact height, was never given more
room to match. Between 640 and 1024px, the fuller caption needed more height than a box sized for
the compact one, and did not fit it cleanly. `sm:min-h-[19rem]` added, leaving the compact height
below `sm` and the desktop height at `lg` untouched. The image frame above it is `flex-1` with
nothing in normal flow (its own photographs are all `position: absolute`), so it has no content
driven minimum height and simply gives up the room the taller caption now takes, rather than the
column overflowing its own fixed-height, `overflow-hidden` stage.

`pnpm typecheck` clean, full `component` project green (547).

*Reverses if:* the caption's real content changes enough that `19rem` over or undershoots again,
in which case it is retuned against the running section rather than assumed correct a second
time.

## D99, 24 September 2026: the home hero's own gutter, stuck on the site's very first value

Reported directly against a screenshot: the hero's eyebrow, headline, lede and buttons sat
visibly left of the header's own logo above them, on a page where every other section lines up
with it exactly. Real cause, not a one-off: `PinnedHero` and `HeroStatic` each kept their own
copy of a `GRID_INSET` constant, `pl-8 sm:pl-10 lg:pl-[calc(max(0px,(100vw-1380px)/2)+3.5rem)]`,
which is the site's gutter formula shape but carrying its very first, pre-widening values, `3.5rem`
(56px) at `lg` and `pl-10` (40px) at `sm`, untouched through every one of the five later passes
that took the rest of the site to `px-24`/`px-40` (96px/160px), CLAUDE.md's own design rules
section records the exact sequence. Both hero components carried the same wrong number rather
than one drifting from the other, which is why it read as consistent, just consistently wrong,
and why it was not caught by comparing the two against each other.

Fixed at the source rather than in each file: `HERO_GRID_INSET`, a new shared constant in
`apps/storefront/src/lib/layout.ts`, corrected to match `px-24`/`px-40` exactly at each step.
Both `PinnedHero` and `HeroStatic` import
it instead of keeping their own copy, specifically so a future widening pass has one place to
change rather than two files that can silently disagree, or in this case, two files that can
silently agree on the same stale number, which is the same failure CLAUDE.md's own gutter note
already warns about for `packages/ui` callers, extended here to a second local duplicate the
warning did not yet name.

`pnpm typecheck` clean, full `component` project green (547).

*Reverses if:* a future hero redesign moves away from this inset-column-over-a-bleed-photograph
shape entirely, in which case `HERO_GRID_INSET` is retired with it rather than kept for a pattern
that no longer exists.

## D100, 24 September 2026: D91 reversed, ranges fold into the catalogue; sheets close on save

Reported directly by Brown, developer to developer: `/products` and `/categories` as two
separate screens was confusing even to build against, not just to look at. "How do I add a
range, then add a product under it, then edit it and add photos" is one task a product manager
actually does, and it was spread across two nav items and two URLs that shared nothing but an
eyebrow. D91's own text named this exact risk and gave itself an exit: *"Reverses if Beco never
actually reorganises the taxonomy in practice and the screen goes unused, in which case it is
cheaper to fold range editing back into the product sheet than to maintain a second screen
nobody opens."* The condition that actually fired is adjacent, not identical, the screen was
used, it was just the wrong shape, and Brown's fresh, direct instruction is taken as invoking
that exit rather than re-litigated against it.

**Not literally folded into the product sheet**, which D91 also warned against and which still
holds: a range is a materially different surface from a product; cramming its own name, slug,
parent, publish state and delete guard into the product editor would compromise both forms. What
changes is that they now live on the SAME PAGE, `/products`, related the way they actually are:
`CatalogueRanges`, a new component, renders as a compact chip panel above the existing product
filters and list, one chip per range plus its group, each carrying its product count and a
Draft mark. Clicking a chip sets `?category=` and narrows the product list below it, exactly the
"pick a range, see what's in it" flow Brown described; the chip's own pencil icon opens the same
range sheet `/categories` used to, now at `?range=` and `?newRange=1` rather than `?edit=`/`?new=`
specifically because those two keys are already spoken for by the product sheet on this same
route, and the two sheets must never read the same param. `fetchProducts` gained a `categoryIds`
filter (plural: clicking a GROUP with children, Sintered Stone, has to match every range filed
under it, since a group with children is never itself an assignable category, only a childless
one like Lighting is); `categoryIdsInSelection` in `lib/categories.ts` does that expansion from
the already-fetched tree so the page needs no second query.

`/categories` still exists, as a bare `redirect('/products')`, the exact shape `/stock` already
uses for the same reason (`docs/QA-CHECKLIST.md` already documented that one): an old bookmark or
link gets forwarded rather than a 404, and the redirect page carries no access check of its own
because the destination enforces its own. `ROUTE_RULES` in `lib/access.ts` drops the now dead
`/categories` prefix entry to match, same as `/stock` never had one. `nav-items.ts` drops the
"Ranges" item outright: one nav entry, "Catalogue", where there were two. `CategoryTree` and
`NewCategoryFab`, the components `/categories` used alone, are deleted rather than kept unused,
`CategoryEditor` and `CategoryCreate` are reused as is, they were always the range's actual form,
only the page around them changes.

**Sheets left open after a successful save, a real bug, reported alongside the redesign
request.** `ProductEditor` and `CategoryEditor` each already closed on a successful DELETE
(`onDeleted`), but Save only ever produced a toast; the sheet sat there unchanged, which reads as
nothing having happened even though the write succeeded. Both now take an `onSaved` callback,
fired from a `useEffect` keyed on the action state's own `ok` string rather than on submit, so a
REJECTED save (a taken slug, a race on `updated_at`) correctly leaves the sheet open on its own
form and its own error instead of closing on a failure. Deliberately NOT extended to the CREATE
flow: `ProductCreate` and `CategoryCreate` already transition into edit mode on success rather
than closing, on purpose, "Draft created. Add photographs, then publish." is that flow's own
copy, and a brand new product typically still needs photographs before it is done. Brown's own
report named "creation or update," this reading, that creation's continue-to-edit-mode is not the
same complaint as update's do-nothing-visible, is a judgement call recorded here rather than
silently assumed, and is reversible on a word if it is the wrong one.

**A real regression, caught before it shipped, not after.** Dropping `/categories` from
`ROUTE_RULES` in `lib/access.ts` (matching `/stock`, which never had an entry) silently
disarmed `createCategory`, `updateCategory` and `deleteCategory` in `categories/actions.ts`:
each still called `requirePath('/categories')`, and `requirePath` treats a path matching no rule
as open to ANY signed-in role, per `access.ts`'s own documented behaviour. Postgres RLS
(`29_category_admin.test.sql`, migration 49) was never touched and would still have refused a
`beco_sales` or `beco_editor` write, rule 7's whole reason for requiring the check in two
places, but the ROUTE check, the one that stops the wrong role even reaching the database, had
gone quiet. Fixed by gating all three actions on `/products` instead, the route that actually
carries the same role set now, with a comment at the top of `actions.ts` recording why a file
under `app/(app)/categories` gates against a different path, so a future prune of `ROUTE_RULES`
does not repeat this. Caught by checking every source reference to `/categories`, not just the
ones this decision expected to find, before calling the pass finished.

`pnpm typecheck` clean across all 9 packages. `catalogue-ranges.test.tsx` new, 9 tests.
`category-editor.test.tsx` and `product-editor.test.tsx` each gained two `onSaved` tests, success
and rejection. `categories.test.ts` new, unit coverage on `categoryIdsInSelection` alone (no
database needed, it is pure). `products.integration.test.ts` gained a `categoryIds` case against
real Postgres, self contained (its own product, created and torn down inside the one test) after
a first version borrowed the suite's shared product and failed for a real reason, that product
had already been soft deleted by an earlier test in the same file. Full `dashboard` (548, up from
530), `unit` and `component` projects green together (1355 total).

*Reverses if:* the chip-panel-above-the-list shape reads as cluttered once actually used on a
catalogue with all six ranges and their full child count, rather than the two-range fixture this
was built and tested against, in which case the ranges panel becomes a collapsed disclosure
instead of an always-open block, not a return to a separate screen.

**Addendum, same day: the risk this clause named fired within the hour, against a real
screenshot of the full taxonomy, and was fixed without pulling the reversal lever.** Two real
defects, not a matter of taste: every group and every range shared one `flex-wrap` row with no
box or divider around a group's own cluster, so a line break could land between a group and its
own ranges and the whole panel read as one flat, undifferentiated list, "the range section is
not still designed to play the part, they feel over the place" in Brown's own words. And a
group's chip showed its own `productCount`, which per `groupCategoryOptions`'s own comment is
always 0 for a group with children, since only the children are ever assignable, so "Sintered
Stone 0" sat directly beside "12mm Sintered Stones 25", reading as an empty range that in fact
held 26 products. Fixed structurally rather than by hiding the problem: each group is now a full
width row of its own, `divide-y` between them, so a browser's line break can never again cross a
group boundary; the group's own name renders as a heading-weight text control, its ranges as
bordered chips a size down, so the two categories of control are never visually interchangeable;
and a group's displayed count is the sum of its own ranges when it has any, which is also the
exact set `?category=` on that group's name actually filters to, so the number on screen and the
behaviour behind it can no longer disagree. `catalogue-ranges.test.tsx` gained two tests for
these specifically: the summed count against a group whose own `productCount` is 0, and a two
group render asserting each group's ranges stay inside its own row rather than the neighbour's.
11 tests total, up from 9. The disclosure fallback this clause offered was not needed; record
that it was considered and a structural fix was preferred, in case a future session reaches for
the disclosure again without re-deriving why a plainer fix was chosen first.

Also this addendum: "Old URL redirects" as the Page URL hint, on both the product and range
editors, was reported directly as developer language a product manager should not have to parse.
Changed to "Old links still work" in both `product-editor.tsx` and `category-editor.tsx`. No
test asserted the old copy, and no other doc referenced it verbatim, so this needed no other
follow-up.

**Second addendum, still the same day, on Brown's own live screenshot of the full nine-group
taxonomy.** The cluster fix above closed the "over the place" complaint but, exactly as its own
closing note admitted was still unconfirmed, most groups carried one or two ranges and each still
claimed a whole cluster's worth of width on its own line, so the panel remained tall enough to
push the product list, the actual reason the screen exists, most of a scroll down. Brown's own
direction this round was concrete rather than another verbal description of what looked wrong:
every range and group should be "pills... in a row that wraps" with "the edit icon... small and
inside the pill", and both kinds of pill "should have the same height and form of design." That
last line is the one that actually resolves the tension between the first two iterations: the
group-name-as-heading treatment existed specifically to keep a group from being mistaken for one
of its own ranges, and dropping it in favour of one uniform `RangePill` throughout only works
because ORDER, a group's pill immediately followed by its own ranges' pills, still carries that
relationship without a box or a font-weight to do it. A `catalogue-ranges.test.tsx` case asserts
exactly this: a group and range pill produce byte-identical `className`, and a separate case
asserts the ordering itself.

The edit pencil moved from a separate `h-11 w-11` button beside each chip into a narrower,
`w-8` segment sharing the pill's own border, a deliberate width tradeoff under CLAUDE.md's own
44px touch target floor, accepted here because it was Brown's own explicit instruction ("small"),
scoped to a SECONDARY action inside a control whose PRIMARY action, the filter click, still meets
the floor at full pill height and width. The panel also gained a real collapse, a disclosure
button on the "Ranges" heading itself (`aria-expanded`, `aria-controls`), superseding the
`max-h-72` scroll cap the previous round added for the same problem: a toggle the product manager
controls is a better fix than an internal scrollbar they did not ask for, so the cap is gone
rather than kept alongside it. `catalogue-ranges.test.tsx` is 13 tests now, up from 11; one test
from the cluster round (ranges staying inside their own bordered box) no longer applies now that
there is no box, and was replaced rather than deleted silently.

## D101, 24 September 2026: delivery and installation, captured for years, finally shown to the person pricing them

Brown's own report: a customer who ticks Installation or asks for Delivery on the storefront
quote form needs that indicated to whoever picks up the quote, and priced as its own line, on the
same document but separate from the materials. "Am not sure of the best approach for it" was the
actual ask, so this started as research, not a build: `quotes.fulfilment`, `delivery_address`,
`wants_installation` and `wants_samples` all already exist on the table (`00000000000005_quotes.sql`,
extended by `00000000000017_quote_services.sql`), all four are written by `submit_quote` on every
storefront submission, and that migration's own column comments already say the plan out loud:
"captured as intent, not as priced lines: the salesperson prices them." The plan was correct from
the start. What was missing was the other half of it.

Checked directly rather than assumed: `fetchQuote` in `lib/quote-detail.ts` selected `fulfilment`
and `delivery_address` but never rendered either anywhere on `/quotes/[reference]`, and did not
even select `wants_installation` or `wants_samples` at all. A salesperson opening a quote had no
way to know a customer had asked for either. The order detail page, by contrast, already renders
`order.fulfilment` and `order.deliveryAddress` as plain text in its own Customer block, an
existing precedent this could have followed exactly; it does not, on purpose, because Brown's own
framing was that this needs to be INDICATED, not merely present in a line of muted text a reader
has to notice on their own. A new "Requested" block on the quote detail page's Customer aside
uses `StatusPill` instead: Delivery and Installation both carry the `attention` tone, the
dashboard's own Warm Red, reserved per the design rules for a state that genuinely needs someone
to act, which this is, each one is a real pricing gap the quote cannot be marked Quoted with a
straight face until it is closed. Samples carries `muted`: worth knowing, not a pricing gap, so
it does not spend the same red. The delivery address renders beneath the pills when the customer
gave one.

Pricing it needs no new mechanism. `add_custom_quote_line` (`00000000000033_quote_mutations.sql`),
already the "Not in the catalogue" control on the quote detail screen's own Line items panel, is
a description-only line with an arbitrary price and quantity, no `product_id` at all, exactly
what "Delivery to Kilimani" or "Installation" as a real, separately priced line already needs. A
`quote_items.kind` column that would let the PDF group a delivery or installation line apart from
materials visually, rather than relying on how staff word the description, was considered and
deliberately not built: `packages/documents/src/pdf/quote-document.tsx` renders one flat line
table today, and adding a grouping column, a migration, an RLS test, and a template change,
before the plain version has even been used once, would be solving a problem nobody has reported
yet. If the flat rendering itself is later reported as reading like an ordinary product line
lost among the materials, that is the concrete case for building it.

`pnpm typecheck` clean. No new component test: `fetchQuote` itself has never carried one, its
callers (`pdf/route.ts` and this page) mock it directly, and `/quotes/[reference]`'s own
orchestration has always been walked manually rather than unit tested, the same pattern this
change follows rather than breaks. `docs/QA-CHECKLIST.md`'s own entry for this page marks the
new panel **NOT WALKED** rather than assumed, since it has not been checked against a real quote
with delivery and installation both set.

*Reverses if:* staff report the `attention` tone on Delivery and Installation as noise, in
which case both drop to `neutral` rather than being removed outright, since the underlying gap,
staff not knowing at all, is the one this decision actually closes.


## D102, 28 September 2026: the polish and hardening pass, operational alerts, and a stale edit that never returned

Brown asked for the storefront and dashboard to be made more usable, especially for a
salesperson working from a phone, for the edge cases to be found and fixed, and for key
operational failures to be logged and emailed to Brightex. The individual screen changes are in
`docs/QA-CHECKLIST.md` and `docs/TEST-COVERAGE.md`; this records the choices someone would
otherwise wonder about.

**Operational alerts go to Brightex, logged first, emailed second.** `reportOpsFailure`
(`apps/dashboard/src/lib/ops-alert.ts`) writes one structured `{"event":"ops_alert"}` line to
the server log, then emails a summary to `OPS_ALERT_EMAIL`, default
`info.brightexsolutions@gmail.com`, per Brown's instruction. It never throws, so a failed alert
cannot turn a handled failure into a crash. Throttled to one email per failure key per fifteen
minutes and thirty an hour, so an outage produces a handful of emails, not hundreds. Wired to
the places a failure would otherwise pass silently: PDF render, store and record, quote and
receipt email sends, storefront revalidation, a public quote submission that did not save, and
`onRequestError` in both apps. The storefront holds no Resend key (ownership split), so it
relays to the dashboard's `POST /api/ops-alert` with a shared bearer secret, rate limited and
schema validated. A lost website lead carries the customer's name and phone in the alert on
purpose: it is the only way that lead gets called back. That is personal data in an email to
Brightex, so step 4 of the `docs/HANDOVER.md` procedure now sets `OPS_ALERT_EMAIL` to the new
owner's address.

**Stale edit conflicts raise `PT409`, not `40001`.** Found by the HTTP integration suite, not
by a person: the stale line edit test hung. `40001` is serialization failure, PostgREST retries
it, and a stale timestamp is stale on every retry, so the request spun a backend at full CPU and
never returned. In production the salesperson would have seen a spinner that never ended at
exactly the moment two people edited one quote. Migration 56 rewrites all fourteen functions in
place from their current definitions rather than copying fourteen bodies by hand; pgTAP file 32
fails if any public function raises `40001` again. The dashboard's mappers match `PT409` and
the message text.

**Staff names through a function, not a wider policy.** Sales could not read a colleague's
`users` row, so every quote owned by someone else read "Unassigned". Widening
`users_read` would have exposed email, role and activity; `staff_names()` returns only display
names for the ids asked, to sales and admins. Migration 55.

**Business identity lives in `settings`, not a new table.** KRA PIN, VAT number, legal name,
address and email are five scalar values with one writer, which is what `settings` is for.
Migration 54.

**The dashboard shows the red square mark.** D85 kept the dashboard wordmark text only, to hold
Warm Red back. Brown asked directly for the logo on the red square, on the dashboard header, the
sign in screen and the emails. It is one small, fixed element per screen, which the three or
four uses of Warm Red per page can carry. Reverses that part of D85.

**Emails are one shell, not three templates.** `packages/documents/src/email/shell.ts` owns the
charcoal header band, the Warm Red rule, the reference box, buttons, contact row and showroom
footer; each email only supplies its words. Nothing below 14px, bulletproof table buttons,
buttons stack on a phone.

**Phone filters are pills, desktop filters stay selects.** `ChipGroup` in `@beco/ui` puts every
option one tap away with its count, which a native select hides behind a sheet; on desktop the
selects stay because the row has room and a keyboard user can type into them. The dashboard's
pill convention for status already existed, so this does not break the sharp corner rule, which
governs cards, frames, buttons and form controls.

**The keyboard never covers the field being typed into.** `KeyboardAwareFocus` watches the
visual viewport and scrolls a focused field into the part of the screen the on screen keyboard
leaves; `Dialog` pins itself to that same area. Mounted once in each root layout rather than per
form, so no form can forget it.

**A refused save keeps what was typed.** React 19 resets every uncontrolled field of a
`<form action={fn}>` once the action settles, success or not. On `/settings` that meant a
refused save, one mistyped KRA PIN, blanked every field on every tab, and the product,
category, announcement, blog, user, launch, sign in and custom line forms had the same
behaviour. Found while testing the Settings save bar, not reported. `useKeepValuesSubmit` in
`@beco/ui` hands the same FormData to the dispatcher from `onSubmit`, so nothing resets; the
custom quote line form resets itself after a successful add, the one place the old clearing was
wanted. Status buttons (claim, approve, status changes) keep `action`, since they carry no typed
text to lose.

**Settings shows what it prints.** The Payments and Business tabs carry a live preview of the
quote's From block and How to pay box, drawn by the same functions as the PDF, so an admin sees
the KRA PIN and the till number where a customer will. A `./layout` export on
`@beco/documents` lets a client component import those functions without pulling react-pdf or
Resend into the browser bundle.

*Reverses if:* the alert volume proves noisy in practice, in which case the throttle window
widens before any alert is removed; a silent failure is the problem this closes.

## D103, 3 October 2026: Lighting is retired, on Beco's own word

Beco's team told Brown they no longer sell lighting. D47 seeded a Lighting category with no
Drive folder behind it because the brand guideline named it as a pillar and its strapline
carried it on every page; D52 kept it top level with no children. Both were the right call
against the guideline. The guideline has now been overtaken by the business, and a site that
offers a range the showroom cannot supply costs more credibility than a strapline that differs
from the artwork.

Migration 57 unpublishes the Lighting category and soft deletes anything filed under it. The
row stays: `categories` has no `deleted_at`, the row is the importer's identity for its
`source_path`, and keeping it is what stops the "Lights" folder still sitting in Drive from
recreating the range. Anonymous readers only see published categories, so the shop, the footer
and the sitemap drop it without a code path. The importer now skips `LIGHTING` and `LIGHTS`
outright and reports the skip once per run, so nobody wonders where the photographs went.

On the storefront, `RANGE_GROUPS` loses its lighting entry and its licensed Pexels hero image is
deleted. The strapline reads "Sintered Stone · Panels · Hardware · Accessories": Hardware is a
range Beco holds on the floor, and four pillars keeps the splash sequence and the About page's
grid at the shape they were designed for. `docs/BRAND-GUIDELINE-NOTES.md` section on lighting
is kept as history with a note pointing here.

*Reverses if:* Beco starts stocking lighting again, in which case the category is republished
from the dashboard, the folder names leave `RETIRED_FOLDERS`, and the strapline is revisited.

## D104, 3 October 2026: the taxonomy browses three levels, and a photograph can be an item

Beco's team reported the catalogue as "all mixed up": sintered stone should read as a major
category with 12mm and 15mm under it and the stones under those, handles as a major category
with colours under it and each handle, with its code and price, under those. Checked against
the live Drive rather than assumed: `HANDLES/` now holds `BLACK HANDLES`, `GOLD HANDLES`,
`GREY HANDLES`, `WHITE HANDLES`, `KNOBS`, `LEATHER HANDLES` and a `HANDLE SIZES AND PRICES`
folder of spreadsheets, and inside each colour folder every photograph is named for the handle
it shows, `B762 BLACK`, `HT-8350 BLACK GOLD`. `12MM SINTERED STONES/` holds a `HEIXIN 12MM`
folder of stone folders beside the stones themselves. The two level cap from D52 made the
importer collapse each colour into one product with thirty photographs and skip Heixin's
stones as misnests. So the data was right and the model was one level short.

**Three levels.** Migration 58 raises the trigger's cap to three and measures the whole chain,
so moving a category with sub ranges under something else is refused when the result would be
four deep. The storefront tree, the sitemap, the index gate, the category page's breadcrumb and
the dashboard's ranges panel, selects and filters all walk the tree recursively now instead of
assuming two levels; every count is a subtree count, since a range can hold products beside its
sub ranges (12mm holds stones and Heixin). Handles moves to the top level beside Sintered Stone,
which is where Beco place it; Hardware keeps hinges, locks, legs and drawer rails.

**The importer reads what Beco actually do.** A folder is a product when it holds photographs
and a category when it holds only folders, which is what tells a sub range from a misnest. In a
folder where every file names its own item (no role word, no camera name, at least two distinct
subjects), each file becomes a product named exactly as the file is, its first photograph as its
own shot, a trailing "2" folding into the same item, and the folder becomes a sub range. This is
not a guess: the product name is what Beco typed. A stone folder of supplier codes names one
thing and stays one product; a folder of `IMG_` files stays one umbrella product. Price lists are
reported and never decoded: prices are entered where they are checked, in the dashboard.
Anything more than two folders below a range is reported and skipped. Each of these is a fixture.

**The admin does not need Drive.** Brown's own line: with or without the import, the admin must
be able to create major categories, sub categories and priced products at any level. New range
files under a major category or a range; the editor offers only homes that fit; the product
range select lists every level, a sub range named after its range; prices, codes, names and
photographs are the product editor's, which the importer never overwrites once a row exists
(D54). The handles price list will be keyed in there, not parsed.

*Reverses if:* Beco's folders settle into a shape the three levels cannot carry, in which case
the cap moves again and the recursion already handles it; or if item folders turn out to hold
several photographs per item under unrelated names, in which case the item rule tightens to
require a code prefix rather than loosening into guesswork.

**Amended 6 October 2026: an export filename is never a product name.** A gold handle was
published as "34D00DD2-442A-4748-BF08-86C2643EE870", its iPhone export filename. In an item
folder, a phone or export name (`IMG_1234`, `PXL_...`, `DSC...`, a UUID, a bare hex or a long
bare number) is left out of the item folder decision and becomes a readable placeholder: the
folder's finish, the range noun from `ITEM_NOUNS` and a short reference, "Gold Handle 34D0",
slug `gold-handle-34d0`, the way D122 names hinges. Every name Beco typed stays exactly as
typed: the import is Brightex's tool, and Beco rename items in the dashboard (Brown, 6 October).
An existing row is never renamed (D54); a fresh environment gets the placeholder on first import.

**Amended 7 October 2026: an item folder retires the umbrella it replaced.** Production still
published `black-handles` (36 photographs), `gold-handles` (33), `knobs` (29) and `grey-handles`
(19): single products the importer made of each whole folder before this decision, whose
`source_path` is the folder itself. The item rule imported each handle and knob as its own
product beside them, but only D122's finish and per photograph ranges retired the old umbrella.
Now `umbrellaRetirements` in `run.ts` lists every folder the plan turns into several products,
item folders included, and the run unpublishes the product whose `source_path` is that folder,
never deletes it, with an issue recorded naming it. A folder with one file (`LEATHER HANDLES`)
is not an item folder, stays one product and is left alone. The real Drive dry run on 7 October
lists Black Handles (29 items from 36 files), Gold Handles (27 from 33), Grey Handles (17 from
19) and Knobs (35 from 35), so the next import unpublishes those four. `WHITE HANDLES` holds
`CODE: 711 WHITE` and `CODE: 761 WHITE`, which name one subject once the folder's words and
the numbers are set aside, so it stays one product, as before.

## D105, 3 October 2026: the Drive import runs from the dashboard, through GitHub Actions

Brown's instruction: the import had only ever been run by the agent on his own machine, and it
has to be something Beco manage from the admin panel. The importer itself cannot live on Vercel:
it decodes 44MB HEIC files with Sharp for twenty minutes on a cold cache, it holds the Drive
service account, and it writes with the service role key, none of which belong in a request
handler. So the import runs where it already could, in GitHub Actions, and the dashboard becomes
the hand on the lever. `drive-import.yml` takes two inputs, mode and target; the Catalogue, Drive
import screen dispatches it through the GitHub API with a fine grained token scoped to Actions on
this one repository, lists the runs GitHub knows about, and shows what the importer itself
recorded in `import_runs` and `import_issues`, grouped by the Drive folder a person would open to
fix it. A production write asks first; a check run never does, it writes nothing. One start a
minute per person, and the workflow's own concurrency group serialises the rest.

Considered and set aside: a Supabase edge function (no Sharp), a long running Vercel function
(no twenty minutes), and the dashboard shelling out (no Vercel shell). GitHub Actions already
holds the repository, the secrets per environment and the approval gate, so the import inherits
all three. The screen also carries the folder shapes the importer reads, because the person who
needs that is the one looking at a skipped folder in the report and deciding what to rename.

*Reverses if:* GitHub's dispatch latency or the token's annual expiry proves to be a recurring
support cost, in which case the same screen fronts a small worker on Beco's own account instead
and nothing above the `dispatchImport` boundary changes.

## D106, 3 October 2026: the dashboard's design constraints are lifted, and what was built with the room

Brown's words: "I am giving you the permission to go off the design standards we had established
at the start so you can achieve polishing the designs." The admin had been described twice as
basic, skeleton-like, and in need of shadcn, charts, filters and search. The constraints that had
produced the plain look were deliberate at the time (D85's text-only top nav, the ban on charts
unless a figure demanded one, Warm Red rationed to three marks, sharp corners everywhere), and
they stay in force on the storefront. On the dashboard they are relaxed as follows.

**A sidebar.** Desktop gets a white sidebar with the sections grouped by job and a Warm Red tick on
the current one, a top bar that names the page, and the screen on a floating panel. The ban on a
dark sidebar dashboard holds: this one is white, and the charcoal is the active state, not the
wall. The phone keeps the D85 card and pill strip, since nothing else fits a 390px screen. The
docked breadcrumb becomes phone only.

**Charts, under a method.** Recharts, inside `@beco/ui`, built against the dataviz skill. The brand
is near monochrome, so the validator's hue checks cannot pass and were not forced: every chart is
the emphasis form, one hue in two shades, with identity carried by a legend, direct labels and a
hidden table rather than by colour alone, and Warm Red kept for a single attention stage. Each
chart answers a question the tiles could not: is the week by week flow healthy, where does
everything open stand, is money arriving as fast as it is billed. `activity_series()` and
`quote_pipeline()` are security invoker, so the chart a salesperson would see is the chart RLS
allows. Plots render after mount, since Recharts measures the client and a server guess at the
width logged a hydration mismatch.

**Tables and toolbars.** A `TableToolbar` above Quotes, Orders and the Catalogue puts search, the
filters and the live count in one row; `DataTable` gets small-caps sortable headers, a sticky
header, hover rows and right-aligned figures. `StatCard` lets its trend chip drop under a narrow
label instead of breaking the label letter by letter, which the two column phone grid exposed.

**Still in force.** The 16px floor, 44px targets, no browser dialogs, no icons in the nav, no
charts for decoration, and every interactive element proven to do what it says. Shadcn remains a
starting point to overwrite, per D88: nothing here ships in its default look.

*Reverses if:* staff on phones report the admin as heavier to use than before, in which case the
charts fold behind a disclosure on small screens before anything structural moves.

## D107, 3 October 2026: the old WordPress addresses are taken over, not left to 404

**Decision.** Every address the WordPress and WooCommerce site at www.beco.co.ke is likely to have
had answers with a 301 to the page that does its job here, from a static map in
`apps/storefront/src/lib/legacy-redirects.ts` served by `next.config.ts`. Paths that only existed
because the site was WordPress answer 410 Gone from `proxy.ts`. An unknown `/product/<slug>`
301s to the shop searched for the words in the slug, since WooCommerce used that path too. The
sitemap carries `lastModified` from product and post rows. `LocalBusiness` is one component on
the home, about and contact pages. The Search Console verification tag is read from
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, so it belongs to whoever sets the deployment variable,
which is Beco's account per `docs/OWNERSHIP.md`. `docs/SEO-MIGRATION.md` is the procedure Beco
follow to verify the domain, submit the sitemap and feed the exact old URLs back into the map.

**Why.** The developer who submitted the old site left no record of the account or the URLs, and
Google still lists them. Nothing in Google's process needs that account: a 301 moves a page's
standing wherever the new owner points it, and a fresh Domain property under Beco's own account
reads the new sitemap. Without the map, every old result is a 404 that Google retries for months
while the new pages start from nothing. The map covers the shapes WordPress gives every site;
the exact tail comes from Search Console's own 404 report once Beco can see it, which is why the
procedure document exists and why the map is plain data with a test rather than code.

**Rejected.** A redirects table in the database with a dashboard screen: a list that changes
twice and then never does not earn a screen, a cache and a test for the cache. Recovering the old
sitemap: the old site is gone and the host is not reachable from here. A 404 page with a search
box for unknown products: it keeps the visitor but passes nothing to Google.

*Reverses if:* Search Console's 404 report shows a shape the map cannot express statically, in
which case the table comes back as a migration with RLS and a test, not before.

## D108, 3 October 2026: the security pass, and what it changed

**Decision.** A review of both apps against rule 7, recorded in `docs/SECURITY.md` under the same
date. Seven findings fixed in one branch: the sign-in return path refused protocol-relative
redirects through a shared `safeReturnPath`; the storefront's revalidate secret compared in
constant time through `bearerMatches`, moved into `@beco/validation` on Web Crypto; that route's
tag and path lists capped; one photo upload guard for product photos and blog covers, before
sharp; RLS tests for the six tables that had none; anonymous analytics inserts bounded to the
documented events and 2KB (migration 60); the secret scanner's patterns in a tested module,
widened to GitHub tokens and the new Supabase key format. Accepted and written down: inline
scripts in the CSP, the in-memory limiter, no MFA, the open image route.

**Why.** None of the seven would have failed a visual review or a happy-path test, which is the
class of bug rule 7 exists for. The open redirect is the kind a phishing mail uses against staff:
a real sign-in page, a real session, then a hop to a copy. The others are bounds that were simply
never written because nothing had yet pushed on them.

**Rejected.** A nonce-based CSP now: it forces every storefront page dynamic and gives up ISR
for a hardening the self-hosted, first-party script set does not need yet. Dropping the
anonymous analytics insert policy outright: the lead counters and a future writer need it, and a
bounded policy is the same safety without a second migration later.

*Reverses if:* a third-party script ever has to run on the storefront, at which point the nonce
is built and the ISR cost paid.

## D109, 3 October 2026: the emails carry the figure, and the confirmation finally sends

**Decision.** Three changes to the transactional email, together. Each template opens on a
photograph of a finished Beco interior, a JPEG crop of the site's own photography served from the
storefront, on charcoal so a client that blocks images shows a calm band. The priced quote and the
receipt carry their lines and the figure that matters, the VAT inclusive total or the amount paid,
set large in the serif on a charcoal block, with the total also leading the preheader so the inbox
list on a phone shows it before the message is opened. And the web confirmation, whose template has
existed since M4 with no sender, now sends: the storefront asks the dashboard's new
`POST /api/quote-confirmation`, behind the existing relay secret, and the dashboard holds the Resend
key as it always has.

**Why.** An email that says "your quote is attached" and nothing else makes the customer open a
PDF on a phone to learn the one number they care about. The figure in the body, and in the
preheader, is the difference between a message that is read and one that is filed. The photograph
is the brand doing in email what the storefront does on every page: leading with the material. The
confirmation had been deferred to an edge function nobody had built, while the ops alert relay,
built since, was exactly the mechanism it needed; a customer who gave an address and heard nothing
was the one gap left in the web path.

**Rejected.** The storefront holding the Resend key: the ownership rule stands, a compromised
storefront leaks the anon key and nothing else. A database trigger calling Resend through
`pg_net`: a second place that sends email, with its own secret, its own failure path and no shared
template. WebP for the heroes: Outlook's engine does not render it. Every line in the email: eight,
then the PDF, since the email is a summary and the document is the record.

*Reverses if:* Resend's deliverability reports show image heavy messages landing in promotions
tabs for Gmail recipients, in which case the hero goes and the total block stays.

## D110, 3 October 2026: what a salesperson cannot do, and what only Brightex can

**Decision.** Three functions move up a level, each in both layers and with the control gone from
the screen for the role that cannot use it. Cancelling an order is an admin's call:
`set_order_status()` refuses `cancelled` from `beco_sales` before it looks at the order, the action
refuses it before the database is asked, and the button is not drawn. A catalogue import to
production is an admin's call: the product manager runs dry runs and imports on staging, the page
offers no production target, and the action refuses one. The Brightex allowlist in settings is
Brightex's alone: the field is not in a Beco admin's form and the save drops the key whatever the
form posted, so the second condition of the Studio gate (D42) cannot be edited by the role it
gates. `docs/SECURITY.md` carries the full function matrix; the rest of it was already so.

**Why.** Beco asked for it plainly: some functions are Brightex's, and a sales account must not
reach everything an admin reaches. The audit found the routes right and three functions inside
them looser than the business wanted. A cancellation reverses a sale the customer agreed to; a
production import rewrites the live catalogue from a folder; the allowlist is the one setting
that decides who Brightex is. None of the three belongs under the thumb of the account that does
them most often.

**Rejected.** Hiding the controls alone: rule 7 says hiding UI is not access control, so each
change lands in the action and, where the database decides, in the function. A separate
`beco_manager` role between sales and admin: nothing yet needs a fourth Beco role, and a role is
cheap to add later and expensive to retire.

*Reverses if:* Beco put a counter manager in charge of refunds, at which point cancellation
becomes a grant like audit read rather than a role.

## D111, 3 October 2026: the phone dashboard navigates from the bottom

**Decision.** On phones and tablets the dashboard's sections live in a fixed bar along the bottom
of the screen, replacing the D85 pill strip in the header card. The bar holds the three or four
screens a role lives in, from the same access map as the sidebar, with New quote raised in the
middle for anyone who raises quotes and the remaining sections, Change password and Sign out behind
More, a sheet on the shared `Dialog`. The header card keeps its place and now names the screen. The
shell publishes the bar's height as `--dock`, which the docked save bars and the floating action
pills add to their offsets, so nothing the thumb needs is ever under the bar. The desktop sidebar
is unchanged.

**Why.** Beco asked for an intuitive phone experience with a bottom nav, and the strip had the
weakness every scroll strip has: the sections past the fold did not exist until you swiped, and the
strip sat at the top of a tall phone, where a thumb does not reach. A bottom bar is where every app
staff already use puts its sections, it is reachable one handed, and it makes the role's shape
legible at a glance: a salesperson's phone shows Quotes, New quote, Orders and nothing else.

**Rejected.** A hamburger: it hides the sections a salesperson needs ten times an hour behind a
tap. Five text-only items: at 390px a word alone is not findable by thumb, so the bar carries one
icon per section, the one place in the dashboard that does. A round plus FAB for New quote: that is
the Material default the dashboard is not allowed to resemble, so it is a charcoal tile with a
label. Keeping the strip as well: two navigations on one phone screen is one too many.

*Reverses if:* staff report missing the sections behind More, in which case the bar grows to five
with the most-used section promoted per role, before anything structural moves.

## D112, 3 October 2026: the phone is measured, not eyeballed

**Decision.** Every dashboard screen is checked at 390px by a script that lists each element
whose right edge leaves the viewport, and the pass that fixed what it found changed the shape of
the phone screens: list cards give the customer a row of their own and put the figure with the
status beneath; chips wrap instead of scrolling with one cut at the edge, and a group of five or
more options is a select; the heading places actions after the lede at full width; the four
"New" controls are heading buttons rather than pills floating over the list; the home plate rows,
pipeline legend, report cards, ranked bars and settings tabs each stop truncating or crushing
their text. `docs/DASHBOARD-UI.md` lists the changes screen by screen.

**Why.** Beco looked at the phone and saw items overflowing and wrapping poorly, and they were
right: two screens were wider than the viewport and most of the rest had a row somewhere that
truncated a name to fit a number beside it. Each had passed a desktop review and a jsdom test,
neither of which lays anything out at 390px. The script is the check those two cannot make, and
it runs in a minute against the dev server.

**Rejected.** Scrolling strips with an edge fade: the fade says "more here" but still shows half
a chip, which reads as broken. Truncation with an ellipsis for names: a salesperson matching a
customer by name cannot act on "Demo custo...". Keeping the floating pills on phones: a second
floating layer over a bottom bar covered the filters and the first rows on every list.

*Reverses if:* the audit script becomes a CI step, at which point this record moves into
`docs/TEST-COVERAGE.md` as a layer rather than a decision.

## D113, 3 October 2026: the sidebar breakpoint is tablet width

**Decision.** Dashboard screens go to their wide layout, two columns or the full table, at
1280px, not at 1024px where the sidebar appears. Between those widths the content pane beside the
sidebar is about 776px, and every screen now lays itself out there the way it does on a tablet.
Tables hide their lowest value column below 1536px through `DataTable`'s `showFrom`, keep
references, owners and figures on one line, and carry the row action as an arrow. The phone
header names the page alone. New quote lives in the heading on desktop and in the bar on a phone.

**Why.** Beco asked for every page to be laid out well at every size and named poor wrapping and
overflow. A side by side capture at three widths showed the worst screens were not phones but
small laptops: the one breakpoint was doing two jobs, showing the sidebar and widening the
screen, and the second job had 248px less room than it assumed. Separating them is one rule
applied everywhere rather than a fix per screen.

**Rejected.** A collapsible sidebar at 1024px: it hides the navigation to make room for a
layout the content does not need at that width. Horizontal scroll on the tables: a table that
scrolls sideways hides its action column, which is the one column a reader needs.

*Reverses if:* staff work on 1024px laptops and report the single column detail pages as too
long, in which case the detail pages alone move back to two columns with a narrower side pane.

## D114, 3 October 2026: the catalogue browses one level at a time

**Decision.** The catalogue's range panel is a browser, not a strip. The first row shows the
major categories alone; opening one reveals its ranges on a second row, and opening a range with
sub ranges reveals a third. Every pill filters the product list to its whole subtree and carries
that count. Editing moves off the pills and onto the selection: a line under the rows names the
path and count and offers Edit and Add range for that node, with New category in the heading.
Add range opens the create sheet with the parent already chosen.

**Why.** Beco looked at the catalogue and found the categorisation confusing, and the earlier
strip earned that: it put every level on one row and asked the reader to infer the tree from
which pill followed which, then hung a pencil on each. The three level taxonomy (D104) is simple
when seen one level at a time, which is how a folder opens and how staff already think about
"Sintered Stone, then 12mm, then the stone". Showing the tree whole was the confusion.

**Rejected.** A tree view with expand arrows in a side pane: right on a desktop, a second column
the phone does not have. A select per level: three dropdowns hide the counts and the drafts, and
a tap per level is the same cost as a pill with none of the orientation. Keeping the pencil per
pill: nine pencils in a row is nine controls nobody wanted until they had chosen a range.

*Reverses if:* the catalogue grows past a dozen major categories, at which point the first row
itself needs a search and the browser becomes a tree.

## D115, 3 October 2026: the Drive import is Brightex's to run

**Decision.** `/products/import` admits `brightex_admin` only, as a route rule narrower than
`/products` (longest prefix wins), re-checked by the page and the action. The Drive import button
on the catalogue heading is drawn for that role alone, and the product manager's phone bar no
longer carries an Import tile. This tightens D110, which had left staging imports to the product
manager and production to any admin.

**Why.** Beco asked for it directly. The import rewrites ranges and products from a Drive folder
in one run, and a folder arranged wrongly rewrites them wrongly; the person who reads the report
and fixes the folder is Brightex, so the button belongs to Brightex. Staff add and edit products
and ranges by hand in the same screen, which was always theirs.

*Reverses if:* Beco take over the Drive folder's upkeep, at which point the rule widens to
`beco_admin` with the production confirm dialog as the gate.

## D116, 4 October 2026: photographs upload straight to R2, Vercel never carries the file

**Decision.** A photograph added from the dashboard (product shot, team photo, blog cover) is
PUT by the browser directly into the R2 bucket under a presigned URL, then the finishing action
is handed the staging key instead of the file. The URL is signed by a server action that holds
the same route gate as the finishing action, puts exactly one object under `uploads/` with a
random 32 hex name, and expires in five minutes. The finishing action re-checks the object's
size and type against what R2 holds, reads it, makes the derivatives and deletes the staging
copy whatever happens. A bucket lifecycle rule sweeps anything a browser abandoned.

**Why.** Vercel caps a function's request body at 4.5MB on every plan, and nothing in the Next
config lifts it. The code allowed 12MB, so a phone JPEG of 5MB would have been refused at the
edge with a generic error, before our size message could run. Most phone photographs are 3 to
6MB. Sending the bytes to Cloudflare directly removes the cap and also removes Vercel from the
slow part of the upload.

**What was considered.** Raising the client cap to 4MB and compressing in the browser: loses
detail on the one asset the storefront sells with, and still fails on the many phones that
produce a 4MB file. An S3 POST policy that signs the size: R2 does not support POST policies.
Signing Content-Length on the PUT: a browser will not let script set that header, so the size
is enforced where it can be, when the server takes the object.

**Fallback.** If the PUT fails, most likely because the bucket CORS rule is missing, a file
under 4MB goes the old way inside the form post and a larger one is refused with a message
that names the size. Nothing is silently lost.

**Reverses if:** the dashboard moves off Vercel to a host without a body cap. Then the direct
path is still faster and stays.

## D117, 4 October 2026: every action is seen to start, run and finish

**Decision.** Three signals, always: the control that started the work shows it running
(`Button pending`: disabled, spinner, `aria-busy`, present participle label), the result is
stated when it lands (toast via `useActionToast`, or the field error for a form whose error
belongs to one input, plus the sheet closing on success), and a reloading list says so
(`Busy` beside the filters, the table dimmed with `aria-busy`). The transition behind every
filter and sort lives in one hook, `useQueryNavigation`, which is where `isPending` comes
from. Status buttons that share one action track which one was pressed so only that one
spins. Pending labels drop the ellipsis; the spinner carries that meaning. Section in
`docs/DASHBOARD-UI.md`.

**Why.** Beco asked for it in those words: a user must know when something is happening and
when it has happened. The audit found the shape was there but uneven. Toasts covered every
action, but "running" was a word swap on some buttons, nothing at all on the quote and order
status buttons, the document email buttons and the photograph controls, and no list gave any
sign between a filter change and the new rows arriving, which on Nairobi 4G is one to three
seconds of apparently dead controls. Consistency is the point: one mark, one place it comes
from, so nobody hand rolls a different loading word next quarter.

**What was considered.** A global progress bar across the top of the page: Next has no
router level pending signal for `router.push`, only `useLinkStatus` for links, so it would
have needed a wrapper around every navigation anyway, and a bar at the top of the page is
far from the control that was pressed on a phone. Spinning every status button at once when
any is pressed: wrong, it says all three are happening.

**The defect this surfaced.** Driving the real dev server to capture the states found that a
product Save produced no toast and left the sheet open, although the action returned
`{ ok: 'Saved.' }`. `ProductResults` keyed the editor by `id` plus `updatedAt`. A server
action's response carries the re-rendered tree, so the fresh row arrived in the same commit as
the result, the key changed, React remounted the editor with its initial state, and the
effects that toast and close never saw `ok`. The same key was on the range editor and the
user editor, where every action bumps `updatedAt`, so every toast in that sheet was lost too.
The jsdom tests passed because a mocked action does not re-render the parent. All three are
keyed by `id` now, the editors already sync their fields from props, and each results test
holds the editor to one mount across an `updatedAt` change. This is the case for walking the
QA checklist against a running server rather than trusting the suite.

**Reverses if:** Next ships a router pending hook, when the top bar becomes a cheap addition
on top of this, not a replacement for it.

## D118, 4 October 2026: CI runs on pull requests and main, not on every dev push

**Decision.** `ci.yml` triggers on `pull_request`, on a push to `main`, and on
`workflow_dispatch`. A push to `dev` starts nothing. The Supabase CLI in CI is `latest`, not the
action's default 2.20.3. The preview deploy and import workflows are valid again. The pgTAP
activity test asserts deltas against a baseline, so it holds on the seeded database CI uses as
well as on the bare one the local runner uses.

**Why.** Beco was being emailed a failure for every push, and every one was red. Not one run
had passed since 12 September: the pinned CLI could not parse `config.toml`, so `supabase
start` died in both jobs before any test ran; since 3 October the browser dialog grep matched
a `javascript:alert(1)` string in a validation test; and two workflow files were rejected by
GitHub at push time (a flow mapping holding `${{ }}`, a `runner` context in a job level
`env`), each recorded as a failed run named after the file. The fixes are small. The trigger
change is the part Beco asked for in words: no runs, no emails, on the working branch. The
rule that nothing deploys unless CI passed stands, because the deploy path starts from a pull
request to `main` and that is still gated.

**The fifth cause, found by the first green-ish run.** With the four above fixed, the component
suite still timed out on one DropdownMenu test under CI load, the same test that had been
flaky locally. Profiling the gap after the test body showed Floating UI, under every Radix
popper, asking each ancestor whether it matches `:modal` and `:popover-open` on every position
pass, and jsdom's selector engine answering `:modal` by re-matching `:fullscreen` up the whole
tree, recursively: 11,720 `:modal` checks and 12.6 million `:fullscreen` checks for one open
menu, twenty seconds of CPU per test. `vitest.setup.ts` now answers those three top layer
pseudo classes with `false`, since none of those states exist in jsdom; the file went from
124 seconds to 1.3. A longer timeout would have hidden it.

**Outcome.** Run 37202363371 on `dev`, dispatched by hand after the fifth fix, passed both
jobs: the first green run since 12 September.

**Reverses if:** the team wants the record on `dev` again, one line in `ci.yml`.

## D119, 4 October 2026: the shop browses by range first, and the controls live inside a range

**Decision.** `/shop` is an index: the hero, then one photographic tile per range Beco deals
in (RANGE_GROUPS order, each a link to its page), a plain search form that lands on the flat
list, a line stating how many products across how many ranges, the featured rail, and the
"being photographed" list. The grid and its controls live on each range's own page,
`/shop/<range>`, under a strip: chips to the ranges beneath (on a group) or beside (on a child,
with "All" back to the parent), each chip a link to a real page; then finish chips, a search
box and a sort select that are query parameters on that page. `/shop/all` is the one flat list
of everything, with the top level ranges as its chips. An old `/shop?range=`, `?category=` or
`?q=` address redirects to where that view now lives. The docked filter card, its native
range select with three levels in one dropdown, the phone "Filters" panel and "Show N results"
button are gone with `ShopControls`.

**Why.** Brown chose this of three directions put forward with mockups on 4 October (A, a
category rail on `/shop`; B, sidebar facets with a phone bottom sheet; C, this). A material
supplier is shopped by range, not by scrolling a flat grid of everything, and the previous bar
hid the ranges inside a select while giving finish and sort the same visual weight. Making
every range chip a link rather than a parameter is also the search win: sub ranges become
pages that can rank, breadcrumbs and the back button walk the tree, and a filtered view still
canonicalises to its page with noindex per D29. The cost is one more tap from `/shop` to a
product, which the search form and the flat list both shortcut.

**What was considered.** Keeping the whole grid on `/shop` under the tiles: two ways to the
same products on one page, and the tiles would have read as decoration above the real thing.
Finish as its own pages: a finish is a spec that crosses ranges, thin as a page, so it stays a
parameter.

**Reverses if:** the catalogue grows past a few hundred products, when option B's sidebar
facets become the right answer inside a range, on top of this index.

## D120, 4 October 2026: the home hero shows our finished rooms, and we speak as we

**Status, 5 October.** The hero half of this decision is held off `dev` on Brown's instruction and
lives on branch `storefront/home-hero-cinematic-finished-rooms`, with D121. `dev` keeps `PinnedHero`. The first person
About copy, the other half, is in `dev`.

**Decision.** The home hero is `CinematicHero`: five of our own finished installations, full
screen and one at a time, a kitchen, a bathroom, a living room, a reception and a bar, each
captioned with the room and the material we supplied in it, the caption linking to that
material's range while it has stock. One line of type, "The room starts with the surface.",
and two actions, "View products" to `/shop` and "Plan a visit" to `/contact`. Each photograph
pushes in slowly for as long as it is on screen and crossfades to the next every 6.5s; room
buttons (no longer with a filling bar, D121) jump to any room, and a Pause control stops the sequence. The
rooms are a static manifest, `HERO_ROOMS`, cut twice from `public/site-photos/` into a 16:9
desktop frame and a 3:4 phone frame, every file under the 150KB hero budget. `PinnedHero`,
its range chips and `RotatingRoomWord` with its typing caret are retired. The About page and
the home About section speak in the first person: "we" stock, advise, measure, install and
deliver, rather than Beco being described from outside.

**Why.** Brown chose the third of three directions put forward with mockups on 4 October, and
asked for it cinematic, minimal in wording, with those two actions, and showing different
rooms as finished work rather than ranges or product shots. The previous hero veiled one
photograph so heavily the material barely read, paired a typed room word with photographs
that did not match it, and hung the ranges on unlabelled round thumbnails. A finished room
answers the buyer's real question, whether it works in a space like theirs, which a slab
cannot. The first person voice was asked for in the same message: the About copy described
Beco as a third party, which reads as a directory listing, not as the people you would be
dealing with.

**Motion, inside D31.** Transform and opacity only. The first photograph, the LCP element,
holds still for 1.6s before its push starts. The outgoing room keeps its push while it fades
so nothing snaps. No pinning, no scroll coupling. Under reduced motion nothing advances or
moves and Play is offered instead, and a hidden tab does not advance. Only the room on screen
and the next are mounted as images, so first paint fetches two photographs, the right frame
for the screen.

**What was considered.** The showroom film behind the hero, as the Direction 3 mockup showed:
15MB, and Brown asked for rooms rather than the showroom. A video of rooms would be the next
step if Beco shoots one; the component takes images today. Pexels photography for flooring,
hardware and accessories, as `HERO_RANGE_IMAGES` uses: not our finished work, which is the
whole point of this hero, so those ranges are not in it until Beco has real installations to
show.

**Reverses if:** Beco shoots landscape footage of finished rooms, when a film slot replaces the
photographs with the same caption and controls.


## D121, 4 October 2026: the hero carries no rules or bars

**Status, 5 October.** Held off `dev` with D120, on branch `storefront/home-hero-cinematic-finished-rooms`, together
with `pnpm hero:frames`.

**Decision.** The home hero draws no lines. The Warm Red rule before the eyebrow is gone, and
the room buttons lose their filling progress bars: on desktop each room is its number and name,
"01 Kitchen", bright when it is showing and grey otherwise; on a phone each is an 8px square in
a 44px target. `HeroStatic` drops its rule and its bottom hairline to match. The
`beco-hero-progress` keyframes are deleted from `motion.css`.

**Why.** Brown asked directly, after seeing D120 live, for no line separators on the hero. Over
a full bleed photograph the thin rules read as interface chrome laid across the room, and the
room names already say which slide is showing and that there are more.

**What was considered.** Keeping the bars as a timer and hiding them only on desktop: still a
line, on the screen size most people see first.

**Reverses if:** testing on a real device shows people do not realise the hero advances on its
own, when a timer that is not a rule, for example the number counting, is the next thing to try.

## D122, 5 October 2026: hinges import one product per photograph, sorted by finish

**Decision.** `HINGES` in Drive is about sixty phone photographs, `IMG_1163.HEIC` to
`IMG_1331.HEIC` and three random names, with nothing in any filename to say which hinge is
which. The importer used to make them one umbrella product, "Hinges", holding every photograph.
Each photograph is now its own product. The plan names it after its photo number, "Hinge
1193", slug `hinge-1193`, stable from run to run. As it imports, `readFinish` reads the finish
from the pixels and files it under a sub range: "Black Hinge 1193" under Hinges, then Black
Hinges, whose identity is `HINGES/BLACK HINGES`, the path Beco would give that folder in Drive.
Finishes are black, white, silver, gold, bronze and copper. A photograph with no clear finish
stays in Hinges itself as "Hinge 1193" rather than being guessed into a sub range. The old
"Hinges" product is unpublished, never deleted, with an issue recorded. `SPLIT_BY_FINISH` in
`plan.ts` names the ranges this applies to: Hinges, and since the same day, on Brown's go ahead,
Door Locks and Furniture Legs, both in the same state in Drive (about 11 and 55 phone
photographs, no subfolders). Products read "Gold Furniture Leg 4517" under Furniture Legs, then
Gold Furniture Legs.

**Why.** Brown's instruction, 5 October: each hinge is a separate item with its own code and
price, and quoting one bundled product with thirty photographs made it impossible to tell which
hinge was being priced. Where the codes are unclear, sort by colour, and the Beco team sets
each code, name and price in the dashboard. Names still win when they exist: a hinge folder
whose files name each item splits by name under D104, and never reaches the finish reader.

**How the finish is read.** The photograph is shrunk to 96px, the backdrop is the median of its
border ring, and every pixel more than 16 CIELAB units from the backdrop is the piece. Each piece
pixel votes by lightness and hue; neutral pixels split into black, silver and white, coloured
ones into gold, bronze and copper, and blue or green abstain. The winner needs 45% of the
piece's votes, and the piece must fill 3% of the frame, or there is no finish. A majority rather
than an average because a polished hinge averages to a muddy grey: its highlights read white
and its shadows black, and only a vote over the whole piece reads it as silver.

**The dashboard owns the result.** Name, category, code and price are set on the first import
only (D54). Proven against the local stack on synthetic photographs: a hinge renamed, coded,
priced, moved and given a new slug in the dashboard came through a second run untouched, and a
second run changed no row. That last part needed two fixes to `executePlan`. An unchanged file
whose product has no row yet is now processed (`needsProcessing`): the hinge photographs were
already imported into the umbrella product, so without it none would ever become its own
product, and a database reset left unchanged products missing. And an existing product is
found by its Drive path when its slug no longer matches, so a slug edited in the dashboard does
not read as a missing product and import twice.

**What it costs.** Two photographs of the same hinge become two products, since nothing says
they match. The team deletes the repeat. Every hinge photograph is HEIC, which only macOS
decoded when this was written; D123 lets the dashboard's button decode it too.

**Reverses if:** Beco renames the photographs after their codes, when D104's item rule takes
over and this path is never reached; or the finish reading proves wrong often enough on the real
photographs that sorting by hand is quicker, when Hinges comes out of `SPLIT_BY_FINISH` and its
products all land in Hinges unsorted.

**Amended 6 October 2026: dark metal is judged against the backdrop.** Brown found matte black
and dark gunmetal hinges filed as Silver Hinges: IMG_1187, IMG_1307 and IMG_1308, all shot on a
white sheet. The camera exposes for the sheet and a satin face mirrors it, so those pieces sat at
L 34 to 52, above the black cut at 30, and their pixels voted silver. Now, before the vote, a
piece that is at least 80% neutral and whose median neutral lightness is under 0.545 of the
backdrop's reads black. Measured over all 124 cached Hinges, Door Locks and Furniture Legs
photographs: the black hinges sit at 0.38 to 0.52 of the backdrop, every silver hinge at 0.57 or
more. Thirteen readings changed, all silver to black: the three hinges, a black leg on white
(IMG_4482), and nine gunmetal or black nickel locks and legs, filed under black because Brown
asked for gunmetal to read black. No gold, bronze, copper or none reading changed. Real photographs,
downscaled to a few KB, are committed as fixtures for black, silver on white, silver on grey and
gold. Still wrong and not addressed: mirror polished gold legs that reflect a grey room read
silver or none (IMG_4474, 4479, 4514, 4516 and others); a mid grey brushed hinge finish
(IMG_1165, 1166, 1178 to 1181, 1317 to 1319, 1322, 1323) stays silver, being lighter than the
cut, and would need a finish of its own if Beco calls it gunmetal.

**Amended 6 October 2026: 15mm stones split per photograph, unsorted.** Brown found "15mm
Sintered Stones" imported as one product whose photographs show different stones: the Drive
folder holds five loose phone photographs, `IMG_4197` to `IMG_4202`, and no product folders.
`SPLIT_PER_PHOTO` in `plan.ts`, beside `SPLIT_BY_FINISH`, names ranges split the same way but
with no finish reading, since a colour sub range means nothing for stone. Each photograph is
now "15mm Sintered Stone 4197", slug `15mm-sintered-stone-4197`, filed directly in 15mm
Sintered Stones. The umbrella product is unpublished, never deleted, by the same step that
retires the hinge umbrella, and the issue asks Beco to name each stone in the dashboard
catalogue, where Beco manage their catalogue; the Drive import is Brightex's development tool.
If a photograph is renamed in Drive after its stone, D104's item rule names the product after
it and this path is not reached; a test holds that hand over. Name and category are set on first import only (D54).

**Amended 7 October 2026: every range of phone photographs splits, and a copy imports once.**
Brown found Bamboo Veneer Wall Panels live as one product with 31 photographs of different
panels. Read from the real Drive, not assumed: six ranges were in the 15mm stones' state, every
file a phone name and no subfolders, Bamboo Veneer Wall Panels (35 files), Kitchen Accessories
(51), Office Accessories (27), Floating Shelf Accessories (25), Drawer rails (20) and Fluted Wall
Panels (9). Rather than a seventh to twelfth entry in `SPLIT_PER_PHOTO`, `isPerPhotoRange` now
splits a range unlisted when at least two photographs sit loose in it and every photograph
anywhere under it is a phone or export name (`isExportName`). It only ever applies to a range:
a range is a group of items, while a product folder can be one stone shot from several angles,
so a product folder is never split by it, and a stone range always carries role named files.
The noun comes from the range's name, `singularNoun`: "Bamboo Veneer Wall Panel 4580", slug
`bamboo-veneer-wall-panel-4580`, "Kitchen Accessory 1011", "Drawer Rail 4160", filed directly in
the range. `SPLIT_PER_PHOTO` stays to force a range that also holds named files and to set a
noun. A range with a named file in it and no item folder stays one umbrella, as before.

Finishes are not read for these. Drawer rails and floating shelf accessories are hardware, but
finish sorting has been added a range at a time on Brown's go ahead (Hinges, then Door Locks and
Furniture Legs), the reader still misreads mirror gold as silver, and drawer rails are near
uniformly zinc, so a finish sub range would add a level holding one colour. Unsorted in the range
is the safe default; adding either to `SPLIT_BY_FINISH` later moves only products not yet
created, since an existing product's category is the dashboard's (D54).

Kitchen Accessories holds every Drawer rails photograph again, byte identical (the same md5)
under its own Drive id, uploaded on 22 September, a day before Beco made the Drawer rails folder,
eleven of them two or three times. One photograph is now one product: among split folders, a
photograph seen more than once is kept in the folder holding the fewest photographs, the
narrower range Beco sorted it into, then by path, and within a folder the copy with the lowest
Drive id, which is stable whatever order Drive lists files in. The other copies are left out and
reported once per folder. Kitchen Accessories becomes 19 products, its 32 copies kept as the 20
Drawer Rail products. Stone folders are never deduplicated. A folder of phone photographs nested
inside a splitting range (`KITCHEN ACCESSORIES/DRAWER RAILS`) is a sub range split the same way,
with the slug a top level folder would give, so moving the folder in Drive makes no second
product; inside a range that does not split, or one with no loose photographs, it is a product
folder, one product, as D104 has it.

The real Drive dry run on 7 October, against the local stack's `import_files`: Bamboo Veneer
Wall Panels 35 products, Kitchen Accessories 19, Office Accessories 27, Floating Shelf
Accessories 25, Drawer rails 20, Fluted Wall Panels 9, 15mm Sintered Stones 5, each unpublishing
its umbrella on the next import; 406 products in all, no slug claimed by two folders and no
photograph in two products. Two photographs of one item still become two products, as for the
hinges: the team deletes the repeat in the dashboard.

## D123, 5 October 2026: HEIC decodes on Linux, so the import button handles hardware

**Decision.** `toDecodable` converts HEIC with `heif-convert` from libheif everywhere but macOS,
which keeps `sips`. The import workflow and CI both install `libheif-examples` and
`libheif-plugin-libde265` (the HEVC decoder libheif needs) from Ubuntu's own archive. A missing
converter now fails with what to install rather than "spawn ENOENT", and the import records the
same advice against the file.

**Why.** Every hardware photograph in Drive is iPhone HEIC, and the dashboard's import button
runs on GitHub's Ubuntu runners, where nothing could decode it: the button skipped every hinge,
door lock and furniture leg, and D122's split only worked from the Mac. Brown asked for the
button to handle them.

**Proof.** A real 927 byte HEIC is committed as a fixture. The decode test turns it into a PNG
through `heif-convert`, and the finish test reads it as gold, on Ubuntu 24.04 with libheif
1.17.6, the version GitHub's `ubuntu-latest` installs. Not yet run against Beco's own
photographs on a runner: the first dispatch from the dashboard is that test.

**What was considered.** A Sharp build with libheif compiled in: a custom native build to keep
working across Sharp upgrades, for one decoder. Running the import on a macOS runner: ten times
the Actions minutes. Asking Beco to set their iPhones to Most Compatible: right for new photos,
does nothing for the hundreds already in Drive.

**Reverses if:** Sharp's prebuilt binary starts shipping an HEVC decoder, when the converter
step can go.

## D124, 5 October 2026: quote and order lines carry the product code

**Decision.** `quote_items` and `order_items` gain `code`, the product's code when the line was
written. A `before insert` trigger fills it from `products.sku` unless a code is given, so the web
form, the counter form and adding catalogue lines all carry it without any of those functions
being rewritten. `convert_quote_to_order` copies the quoted code onto the order. The dashboard
shows it under each line's name, the PDF prints "Code H-301" under the description, and the
priced quote and receipt emails put it before the quantity. One function, `lineCodeLabel`,
writes it for the PDF and the email alike.

**Why.** Brown asked that an item chosen by its code, a hinge or a handle, reach the quote as a
single line with that code. A line said only the product's name, so a hinge named "Soft close
hinge" with H-301 in its code field could not be told from its neighbours on the document the
customer takes away. With D122 sorting hinges by finish and the Beco team keying codes into the
dashboard, the code is now the thing that identifies the item.

**A snapshot, like the price.** The code is copied, never read live: an issued quote does not
change because a product's code was corrected afterwards, and an order carries what was quoted.
Lines written before migration 62 carry no code. Backfilling would rewrite quotes already issued,
and would fire the money and approval triggers on every old line for nothing.

**What was considered.** Folding the code into `description`: it would survive, but a
salesperson editing the description could delete it, and the PDF could not set it apart.
Joining `products.sku` when rendering: live, so a corrected code would silently change an
issued document.

**Reverses if:** codes move to a variants table, one product with several coded variants, when
the line would snapshot the variant's code instead.

## D125, 5 October 2026: a slight corner radius, in two values

**Decision.** Corners are slightly rounded, from two tokens in `tokens.css`: `--radius-control`,
4px, for buttons, fields, quantity steppers, menu rows, small tags and image thumbnails, and
`--radius-card`, 6px, for product and range cards, image frames, dialogs, the phone sheet's top
edge, the nav dropdown and boxed notes such as the spec lists and the quote summary. An inset
outline drawn over a rounded frame is rounded with it, or its square corners show inside the
curve. Nothing full bleed is rounded: the hero, section bands, the header and the footer meet the
edge of the screen square, so the page itself keeps its hard frame. The dashboard's floating
panels keep their 14px `rounded-panel` (D85) and its bottom navigation its own 10px. The old
`--radius-button` (2px) is gone and every `rounded-[2px]`, `[3px]` and `[4px]` became one of the
two tokens. The WhatsApp card's speech nub and chat bubbles, drawn to look like WhatsApp's own, and the
chart legend swatches stay as they are. `radius.test.ts` fails on any other arbitrary pixel radius.

**Why.** The Beco team asked, through Brown on 5 October, for a subtle radius on the components
that carry an edge: the sharp corners read harsher than the materials they sell. This reverses
the "sharp, no exceptions" rule CLAUDE.md held since D92, on the fresh, explicit instruction that
rule asked for. It does not reverse D92's finding: 8px and 16px on cards were both reported "not
right", so the card value stops at 6px and the control value at 4px, small enough to soften the
edge without turning the site into rounded tiles.

**What was considered.** One value everywhere: 4px reads as square on a large image frame and 6px
looks soft on a 44px button. Rounding full bleed media: a rounded hero floats in white margin and
stops reading as the room.

**The documents too, the same day, on Brown's go ahead.** The emails use the same two values:
6px on the white card (its charcoal band rounds at the top, its footer at the foot), the reference
box and the total block; 4px on the buttons, the PDF mark and the step numbers. Outlook on Windows
ignores `border-radius` and draws them square, the old look rather than a broken one. The quote
and receipt PDF has one boxed element, How to pay, which takes the card corner as
`PDF_CARD_RADIUS`, 4.5pt, the same 6px at 0.75pt per CSS pixel; everything else on it is a rule.

**Reverses if:** the team or Brown sees it live and wants it tighter or gone, when both values
change in `tokens.css` alone, plus the two constants in `@beco/documents`.

## D126, 5 October 2026: every page draws its own link preview, and the dashboard has none

**Decision.** Every storefront page states a complete share card through one function,
`pageMetadata` in `apps/storefront/src/lib/seo.ts`: title, description, canonical, og:url, site
name, a 1200 by 630 JPEG og:image with its alt, and a large Twitter card. The images come from
routes under `/og/`: `/og/<section>` for pages with no photograph of their own, drawn at build from
one of Beco's own site photographs, and `/og/product/<slug>`, `/og/range/<slug>` and
`/og/blog/<slug>`, drawn on first request from the record's own photograph and cached for the
hour its page is. Each card is the photograph with a charcoal band carrying the real logo mark, an
eyebrow and the page's name, set in the self hosted Titillium and Cormorant through `next/og`, then
encoded by sharp as a baseline JPEG under 300KB. A card whose photograph will not load falls back
to the section photograph, still named for the page. The image origin is the canonical one on
production and the preview's own host on a Vercel preview (`ogOrigin`). Product titles name the
product's own range rather than "sintered stone" on every item. The JSON-LD logo is an absolute
`ImageObject`, and the product and post schema images are absolute derivatives rather than bare
R2 keys. `/quote` is no longer disallowed in robots.txt, so its noindex is read, and `/og/` is
allowed explicitly. The dashboard sets noindex, nofollow at its root layout, drops the shop copy
from its description, and states no Open Graph tags, on top of its robots.txt and X-Robots-Tag.

**Why.** Shared links showed the wrong picture or none. Four causes, all fixed: the default image
was a portrait WebP declared as landscape, and WhatsApp does not render WebP; the product and post
pages passed a bare R2 key as og:image, which resolved to a 404 on the canonical host; a page that
set `openGraph` at all replaced the layout's whole object, so the product page lost its site name
and type; and every image pointed at www.beco.co.ke, which is not yet on DNS. The dashboard
described itself as "Premium interior materials in Nairobi", so a pasted dashboard link previewed
as the shop, and three of its pages never set noindex themselves.

**Rejected.** Handing scrapers the WebP derivatives: WhatsApp and some LinkedIn paths drop them.
The `opengraph-image` file convention: its alt is fixed per file, and the metadata could not be
unit tested as one object per page. A text rendering endpoint taking the title from the query
string: anyone could draw any words under Beco's logo. A JPEG derivative per photograph in the
import: a second set of files for one use, and no logo on it.

*Reverses if:* a scraper Beco cares about is seen rejecting the generated JPEGs, or the image host
moves to img.beco.co.ke and a ready made JPEG derivative becomes cheaper than drawing one.

## D127, 6 October 2026: production moves onto beco-prod

**Found.** Both Vercel projects' Production environment pointed at `beco-staging`. The live
www.beco.co.ke and dashboard.beco.co.ke had been reading and writing the staging database since
they were first deployed, in breach of rule 6. `beco-prod` was empty: no tables, no accounts, no
migrations. Staging held one account and one web quote.

**Done, on Brown's instruction.** Staging was dumped first (`~/beco-backups/2026-10-05`, schema
and data). `beco-prod` took migrations 1 to 53, the seed rows those migrations write were
cleared, staging's data was loaded with triggers suspended, then migrations 54 to 62 ran over
it, so they transformed real data exactly as they will anywhere else. Every copied table
matched staging row for row, the quote sequence included; `beco-prod` and a local stack at 62
agree on 21 tables, 0 without RLS, 55 policies. Vercel Production was repointed, both apps
deployed from `main` at `f6e69ff`. No quote reached staging during the switch. pgTAP was not
run against `beco-prod`: nothing tests against production data.

**What it changes.** `beco-staging` is staging again and now at migration 62, but it still holds
a copy of production's one account and one quote; reseed it from `supabase/seed.sql` before
anyone else is given staging access. pgTAP is installed on staging but `supabase test db
--linked` cannot see it through the CLI's temporary login role, so the remote test run is open.

*Reverses if:* never. Production stays on `beco-prod`.

## D128, 6 October 2026: the storefront measures, to GA4 and to its own table

**Decision.** The storefront root layout renders four things that draw nothing. `<Analytics />`
and `<SpeedInsights />` from `@vercel/analytics/next` and `@vercel/speed-insights/next`, which
load from `/_vercel` on the site's own origin and record only once switched on in the Vercel
project. `GoogleAnalytics`, a server component that renders gtag.js through `next/script`
`afterInteractive` only when `VERCEL_ENV` is `production` and `NEXT_PUBLIC_GA4_ID` matches
`^G-[A-Z0-9]+$`. And `AnalyticsListener`, one capture phase, passive click listener on
`document` that turns any `data-analytics` element into an event. `track()` in
`apps/storefront/src/lib/analytics.ts` is the one sender: it calls `gtag('event', ...)` when gtag
is loaded and posts the row to `analytics_events` with the anon key, keepalive, `return=minimal`.
It is also called directly for `add_to_cart` after an add to quote (product page and quick add)
and `quote_submitted` once `submitQuote` returns a reference. The dashboard gets none of this.

The event names are migration 60's policy list, restated as `ANALYTICS_EVENTS`, and a test reads
the migration so the two cannot drift. The four key events in DEPLOYMENT 9.2 are all on it, so
nothing needed to change there. Params are `page_path` and, from the path, `product_slug` or
`category_slug`, each capped at 200 characters; any other key is dropped before sending. No name,
phone, email, reference or list contents ever leaves in an event. The CSP's `connect-src` names
each GA4 collection host, `img-src` adds Google Tag Manager, and `script-src` allows Vercel's CDN
in development only. The privacy page now says the site uses Google Analytics and Vercel's
analytics, since it had promised to say so before tracking started.

**Why.** The plan has always said GA4 loads from `NEXT_PUBLIC_GA4_ID` and every event is also
written to Beco's own database, and the controls were tagged for it, but nothing listened. The
dashboard's lead counters and conversion report were reading an empty table. `VERCEL_ENV` rather
than `NODE_ENV`, because every Vercel build, previews included, runs with `NODE_ENV=production`,
so a `NODE_ENV` gate would have sent staging traffic into Beco's real property. A plain `fetch`
to PostgREST rather than supabase-js, because it is the same request under the same policy
without putting the client library in every page's bundle for one insert, and `keepalive` lets
it outlive a click that navigates away. One delegated listener rather than a handler per link,
so tagging a new control is the whole job, and capture phase so a control that stops propagation
is still counted.

**Not done, and why.** D108 said a nonce based CSP gets built when a third-party script first
has to run on the storefront. gtag.js is that script. The nonce is not built here: it forces
every storefront page dynamic and gives up ISR, which is a decision with a performance cost that
belongs to Brown, not to this branch. GA4 is production only and loads from one named host, so
`'unsafe-inline'` stays the accepted risk it was, now with that trigger met and recorded.
`page_view`, `product_view` and `quote_started` are on the policy list but not sent: GA4 counts
page views itself, and a row per page view in `analytics_events` needs the retention policy
SCHEMA.md already asks for first. No consent banner: none is in the plan, and whether Kenyan data
protection practice needs one before GA4 sets cookies is Beco's call to make.

**Rejected.** `@next/third-parties` GoogleAnalytics: it cannot see `VERCEL_ENV` from the client
and adds a dependency for two script tags. supabase-js in the browser, above. Gating GA4 in the
browser: `VERCEL_ENV` is not a public variable, and a preview would still ship the markup.

*Reverses if:* Beco moves to Google Tag Manager, at which point the container replaces
`GoogleAnalytics` and the listener pushes to `dataLayer`; or a server side writer for
`analytics_events` lands, at which point the browser insert and its anon policy can go.

## D129, 6 October 2026: list filters are captioned selects, and list rows are rows

**Decision.** Every dashboard list filters through one bar, `ListFilters` in
`apps/dashboard/src/components`: search full width, then each filter as a `FilterSelect` from
`@beco/ui`, a 44px native select that draws its own caption and current value inside the box,
"Owner / Everyone", "Status / Any". Below the wide layout they sit in one compact grid: two
across on a phone, with the result count taking the next free cell, so on quotes the count
sits beside Source; three or four across from `md`. From `xl` (D113) search, filters and count
share one row, as before. The selects write the same query parameters the chip rows wrote, so
links, the back button and the server rendering are unchanged. Quotes, orders, catalogue,
users, announcements, blog and audit use it. Below `xl` the results are `ListRows`: rows
divided by a rule, the whole row the link, with a chevron, not a bordered rounded card inside
the page's panel. A new quote keeps its mark as a 2px charcoal rule down the row's edge, every
other row carrying the same edge transparent so the text lines up. Each page wraps its filters
and results in `QueryNavigationProvider`, so a filter change dims the rows, the table and the
empty state with `aria-busy`, and the count reads Updating until the rows land; the reports
page does the same for its period controls in the heading. The chosen value shows in its select
at once, through `useOptimistic`, before the server answers. The page heading is a little
tighter on a phone.

**Why.** Brown, on the live quotes list on a phone: "some proper design is needed here". At
390px the owner and status chip rows wrapped to two lines each and, with a labelled search
and a source select, took about two thirds of the screen before the first quote, which then
sat in a card inside the panel. Measured on the local server at 390 by 844, the first quote
row started at y 671 before and starts at y 417 after, inside the top half. The "Updating"
line beside the filters was the only sign of a filter change; the list and the table did not
dim, although `docs/DASHBOARD-UI.md` said they did, because the filters and the results each
held their own transition.

**What was considered.** Chips that scroll in one row: D112 rejected the half chip at the edge.
A label above each select: a row per filter, the height this was meant to save. The caption as
part of each option's text, "Owner: Everyone": the phone's picker would read the prefix on
every line. A custom dropdown: a native select is what the phone's own picker opens, which a
salesperson already knows, and it stays testable in jsdom.

*Reverses if:* staff report a filter they reach for many times an hour that is slower behind a
picker than it was as a chip, in which case that one filter returns as a single row of chips
above the grid, not all of them.

## D130, 6 October 2026: Beco keeps a real record of its clients, reversing REVIEW 2.6

**Decision.** A `customers` table, migration 64, one record per client keyed by the national part
of the phone number (`phone_key`, so 0722..., +254722... and 254722... are one person), unique
among records that are not soft deleted. It holds name, phone as entered, email, company, the
client's KRA PIN (a letter, nine digits, a letter, checked in zod and in a `check`), location,
client type (homeowner, contractor, designer, developer, business, other) and staff only notes.
`quotes.customer_id` and `orders.customer_id` point at it. The dashboard gains Customers: a list
with search, type filter and three sorts, a page per customer with editable details, their
quotes and orders and totals, and New customer. The new quote form picks a client record or adds
one in place, and a quote's page links or changes its customer. The client's KRA PIN prints
under Prepared for on their quote and receipt PDFs, and with the reference in the priced quote
email.

**Why.** Brown asked for a real client record on 6 October 2026. `docs/REVIEW.md` 2.6 named "no
customer entity" as a deliberate simplification for the four week build and predicted it would
be the first Phase 2 request; it was. Inferring a customer from quotes sharing a phone number
(`customer-search.ts`, 28 September) could find a returning buyer, but could not hold a
KRA PIN, a note, a type, or a client who has not had a quote yet, and could not say what one
client had spent.

**How the pieces fit.**

- **One person, one record.** The phone is the one field the counter and the web form both
  require, so it is the identity. A second record with the same number is refused by the unique
  index, and every screen that creates one asks first: a number already on file answers with
  that customer, "Use" on a quote, "Open" anywhere, never a duplicate.
- **A quote stays a historical document.** The quote still snapshots name, phone and email (and
  company, from a picked record) at the moment it is raised, read from the record inside
  `create_counter_quote` rather than trusted from the form. Editing the customer later never
  rewrites an issued quote, the same principle as D124's code. Linking a quote to a different
  customer moves `customer_id` and the converted order's, nothing printed. The one live read is
  the client's KRA PIN on a document generated later: a regenerated PDF carries the record's
  current PIN, which is what a tax document wants.
- **The web form links, never edits.** `submit_quote` links to the record with that number or
  creates one; it never updates an existing record, so a visitor typing a known number cannot
  rename that client. Its quote still snapshots what the visitor typed. A counter quote typed
  without picking does the same, through the same helper, `customer_for_phone`.
- **Backfill.** One record per distinct phone key among live quotes, merged exactly as
  `customer-search.ts` merged them: the newest quote's name and phone, an older email or company
  filling a gap. Every quote and order is then linked, orders through their quote first. On the
  local database: 8 customers from 8 quotes, all 8 linked. The backfill runs with the quotes and
  orders lock trigger disabled, so linking does not bump `updated_at` on every open quote.
  `seed.sql` calls it again, because the seed runs after the migrations.
- **Who.** Brown chose that all staff see the full list: every operations role reads,
  `beco_sales`, `beco_product_manager`, `beco_admin`, `brightex_admin`. `beco_editor` has no
  operations screen and reads nothing. The roles that raise quotes create and edit. Only an admin
  soft deletes; nobody hard deletes, revoked as well as unpolicied. Anon reaches the table only
  through `submit_quote`. The product manager reads the record but not quotes or orders (D87),
  so the list overview is `security_invoker` and that role sees no counts or spend, and the
  screen leaves those columns out rather than showing zeros.
- **Navigation.** Customers sits in the Sales group of the sidebar. On the phone bar (D111) it
  falls where the access map puts it: a salesperson's bar is Quotes, Orders, New quote raised in
  the middle, and Customers; the product manager's is Catalogue and Customers; an admin finds it
  behind More.

**Spent.** The list's Spent is the VAT inclusive total of the client's orders that are not
cancelled, from `orders.total_amount`. The client's page shows it as Ordered beside Paid, the
part marked paid, because payments are offline (D8) and the two are different figures.

**Found on the way.** `orders_insert_anon` (migration 6) still lets any role insert an order row
directly. It is narrowed here only so a direct insert cannot carry a `customer_id`; the wider
policy is recorded in `docs/SECURITY.md` as a follow up rather than changed in this migration.

**Rejected.** A customer required before the web form can submit: the site asks for name and
phone only, on purpose. Matching on email as well as phone: walk ins rarely give one, and two
keys can disagree. Updating the record from a web submission: it is the one write an anonymous
caller can make, and a known number is not proof of identity. Snapshotting the client's KRA PIN
onto the quote: it is not on the quote today, and a reissued document should carry the current
PIN.

*Reverses if:* Beco wants two people sharing one phone (a couple, a company switchboard) as
separate clients, at which point the identity moves from the phone to the record and the unique
index becomes a warning.

## D131, 7 October 2026: a line can come off a quote, and the customer's request stays on file

**Decision.** `remove_quote_line()` (migration 65) takes one line off a quote: the assigned
salesperson or an admin, under the quote's lock, refused on a deleted quote, a quote that became
an order, a won quote, a lost quote (reopen it first) and the last line ("A quote needs at least
one item. Mark it lost instead."). The line is hard deleted and a new `quote_items_audit` trigger
writes the whole line into `audit_log`. What the website form submitted is kept on the quote in
`quotes.requested_items`, written once by `submit_quote` and never changed by anyone, and the
quote page shows "Changed since the customer's request" with what was removed, changed or added.
Each line gets a 44px Remove confirmed through `ConfirmDialog` ("Remove item"). When the lines
cannot change, the screen says why: a salesperson on an unassigned quote reads "Claim this quote
to change its items." with Claim beside it.

**Why.** Brown, 6 October 2026: a customer who submitted items on the website phoned back to drop
one, and the person handling the quote could not. Two causes, both checked in the code:

- **No removal existed anywhere.** `update_quote_lines` moves quantity and price only; no
  function, action or control deleted a line, for any role. An admin could change a quantity but
  never take an item off.
- **A web quote arrives unassigned, and a salesperson's screen went silently read-only.** The
  page computes `canMutate = isAdmin || assignedTo === userId`, so for `beco_sales` an
  unassigned web quote rendered its lines as plain text with no reason beside them. The only hint
  was "Unassigned. Claim it to edit." in the Actions rail, which on a phone sits above the lines
  and reads as status, not as the answer to "why can I not change this?".

**How the pieces fit.**

- **Same rules as its siblings, checked not invented.** The permission and lock are
  `update_quote_lines`'s. The stale edit raises `PT409`, not `40001`: migration 56 moved every
  quote write off `40001` because PostgREST retries it forever, and pgTAP 32 refuses a function
  that raises it. Won is closed (`set_quote_status`, `reissue_quote`), lost needs a reopen
  (`set_quote_status`, `reopen_quote`), a converted quote's lines are what the order copied. On a
  quoted quote, removing a line clears the approval (D86); if the rest still deviates from the
  catalogue the `check` constraint would refuse, so the function says so in words: move it back
  to reviewing first. The totals come from `refresh_quote_money`, the one place the money maths
  lives.
- **The last line stays.** `create_counter_quote`, `submit_quote` and `convert_quote_to_order`
  all refuse a quote with no items; a quote the customer no longer wants is marked lost, which
  keeps it on the record with a reason.
- **Hard delete, full audit.** `quote_items` has no `deleted_at`, and adding one would mean
  filtering it out of every total, the PDF, the email, convert and the money triggers. The audit
  trigger every other commercial table has had since migration 3 was simply missing here; it now
  records inserts, quantity and price changes and deletes, so a removed line can be read back
  and put back, and a discount has a trail.
- **The original request is a snapshot, not an audit query.** The audit log could not serve this
  on its own: it is readable only by Brightex and granted Beco admins, never by a salesperson,
  and line edits were not audited before this migration, so no quote already on file has a
  history to reconstruct from. A column on the quote is readable through the quote's own RLS by
  everyone who can read the quote, costs one jsonb per web quote, and is matched to the live
  lines by id. `submit_quote` works the lines out once, before the quote row, so the snapshot and
  the inserted lines share ids and the quote is born with its request; a guard trigger then
  refuses any change, admins included.
- **Quotes already on file.** Web quotes submitted before migration 65 are backfilled from their
  lines as they stood when it ran, marked `source = 'backfill'`, because nothing recorded an
  earlier edit. The screen reads "Changed since 7 Oct 2026" and "Earlier edits were not
  recorded." for those, rather than calling them the customer's own words.
- **Unsaved edits block a removal.** Removing re-renders the lines from the server, which would
  discard a typed but unsaved quantity or price, so Remove waits for Save, the same rule the
  catalogue add already follows.
- **Layout, measured.** A Remove beside the price narrowed the price field to 66px at 390, so on
  a phone it has its own row. A fifth desktop column left the item column no width at all at
  1280, where the right rail takes its share, so on desktop it sits under the line amount.

**Found on the way, fixed separately (migration 66).** `is_admin()` returned null, not false, for
a deactivated account, which let it past every `... and not is_admin()` guard in the quote and
order functions. Now `coalesce(..., false)`; see `docs/SECURITY.md`, 7 October 2026.

**Not changed, for a decision.** `update_quote_lines` and the other line functions still accept
quantity and price edits on a won or lost quote (only the D86 constraint stops some of them), and
the screen still offers the steppers there. Remove follows the stricter rule the status functions
already state. Whether quantity and price should lock the same way is Brown's call. *Decided
7 October 2026: they do, see D132.*

**Rejected.** A soft delete on `quote_items`: every reader would need a filter, and a line
missed by one of them would print on a PDF. Reading the original request from `audit_log`: a
salesperson cannot read it, and quotes on file have no line history. Letting a salesperson edit
an unassigned quote without claiming: ownership is what tells the team who is handling the
customer, and claim is one tap, now beside the lines.

*Reverses if:* Beco wants a removed line greyed out on the quote rather than gone, at which point
`quote_items` gains `deleted_at` and every reader is filtered.

## D132, 7 October 2026: a closed quote's lines are fixed, and the quote's lines size to their own column

**Decision.** Approved by Brown, 7 October 2026, settling what D131 left open. Every function
that changes a quote's lines refuses a won quote ("A won quote is closed"), a lost one ("Reopen
this quote to change its items") and one that became an order ("This quote is already an order.
Its items are fixed."), with errcode `P0001`, exactly as `remove_quote_line` already did:
`update_quote_lines`, `update_quote_line`, `add_custom_quote_line`, `add_catalogue_quote_line`,
`add_catalogue_quote_lines` and `remove_quote_line` itself. The rule lives once, in
`assert_quote_lines_open(status, converted_order_id)` (migration 67), an internal function no
client role can execute, called by all six at the point `remove_quote_line` made its checks:
after the stale lock and the permission, before any line is read. Nothing else in those
functions changed: same signatures, permission rule, `PT409`, input checks, rounding and totals
through `refresh_quote_money`. The before and after definitions were diffed from the local
database and differ only by the status read and the call.

On the quote page, a won, lost or converted quote shows the same reason line Remove already used,
above the lines, and the steppers, price fields, Save, Add from catalogue and the custom line form
are disabled and tied to it by `aria-describedby`. The reason repeats under Add from catalogue,
because that control sits below the list. `closedBlock()` in `lib/quote-line-rules.ts` holds the
wording; `removeBlock()` now starts from it, so the Remove reasons read "Its items are fixed."
rather than "Nothing can be removed.". `QuantityStepper` in `@beco/ui` gained `disabled` and
`describedBy`, rather than the quote page wrapping its own.

**Layout.** The quote page's line rows switched to columns at the `md` screen width, but the
lines sit beside the sidebar and the right rail, so the list was 544px wide at 1280 and the four
fixed columns left the item name 80px: names truncated and "Catalogue Ksh 65,000.00" was clipped.
The same fix as `/quotes/new` (45fcb05): the lines form is a Tailwind `@container`, rows and the
header switch at `@3xl` (48rem of list, which leaves the item about 300px after 29rem of fixed
columns and gaps), stacked below that. Remove keeps D131's place, under the line amount, never a
fifth column. Measured on the local dev server, BEC-Q-01168, item name width before and after:
390: 267 and 267 (stacked both); 820: 276 and 697 (list 740, now stacked); 1024: 176 and 597;
1280: 80, clipped, and 501; 1440: 240 and 661; 1920: 488 and 488 (list 952, columns both). No
horizontal scroll and nothing past the row's edge at any width, Remove inside the row at every
width.

**An unpriced line no longer reads as a discount.** A web line arrives at `unit_price = 0`, D86's
"not priced yet", with the catalogue price it was asked at in `list_price`. The page struck that
catalogue price through, as if it had been discounted to nothing. Now a line at 0 with a catalogue
price reads "Not priced yet. Catalogue Ksh 65,000.00" (editable) or "1 × not priced yet, Catalogue
Ksh 65,000.00" (read only), plain, the figure to price from. Strike through is kept for a real
price that differs from the catalogue. A line at 0 with no catalogue price still reads price on
application, the custom line's own convention.

**Closed by migration 68, 7 October 2026.** The raw `quote_items_write_owner` RLS policy let
the assigned salesperson or an admin insert, update or delete `quote_items` directly through
PostgREST, whatever the quote's status, which was a way around this lock. Brown approved the
lock, so its write half is dropped: every line write goes through a security definer function,
and the dashboard only reads `quote_items` directly. `44_quote_items_functions_only.test.sql`
proves the owner and an admin are refused a direct insert, update and delete, reading still
works, and the functions still write. `10_quote_pricing_approval.test.sql` now writes its lines
as the table owner, since it tests the approval trigger, not who may write.

Migration 67, `43_closed_quote_lines.test.sql`, 92 assertions.

*Reverses if:* Beco wants a won quote corrected after the fact, say a quantity keyed wrong, at
which point the route is a reopen for won quotes with its own audit, not loosening this rule.

## D133, 7 October 2026: a product is published from the top of its editor

**Decision.** Asked for by Brown and Irene at Beco. A new product still starts as a draft. The
editor now carries Publish (primary) beside the Draft pill, or Unpublish (outline) beside the
Published pill, and the "Published on the website" checkbox in the Availability section is
removed. Publish with no unsaved edits calls `setProductPublished`, which writes `is_published`
and nothing else, under the same `/products` route check, zod parse and `updated_at` lock as
Save, audited by the existing `products_audit` trigger. Unpublish goes through `ConfirmDialog`
("Unpublish (name)?", "It will disappear from the website until you publish it again.",
confirm "Unpublish"). Pending and result follow D117: the pressed button spins as Publishing or
Unpublishing, the toast reads "Published. It will appear on the website shortly." or
"Unpublished.", and the pill flips. On a draft, "No photo yet." and "No price yet." (a fixed
price product with no price) sit under the pill and in the button's description, and Publish
stays enabled. No rule anywhere blocked publishing without a photograph, so there was none to
follow instead. Both buttons carry a `Tooltip`, new in `@beco/ui`, shown on hover, on focus and
from an info button for touch. Creating a draft now toasts "Draft created. Add a photo, then
Publish."

**Unsaved edits: save them with the flag, rather than disable Publish.** When any field of the
form has changed since the row loaded, the button reads "Save and publish" (or "Save and
unpublish", still confirmed) and submits the whole form through `updateProduct` with the flag,
which then reports "Saved and published. It will appear on the website shortly." The other
option, Publish disabled with "Save your changes first", was rejected because Save closes the
sheet on success (D117): staff would save, lose the editor, find the product again and only then
publish, which is the same friction that left finished products hidden. The label names both
operations, so nothing happens that the button did not say. Dirty means any change event on a
field owned by the editor's form, plus spec rows; a value typed back to what it was still counts,
since the cost is one extra save. Photograph controls belong to their own forms and do not count.

**One source of truth: the checkbox goes.** Keeping it in sync with the top control would have
left two controls with different semantics for one flag, one saved on Save and one immediately,
and a checkbox ticked but not yet saved would contradict the pill. `isPublished` is now optional
in `updateProductSchema`: a form that does not send it leaves the column alone, so a plain Save
can never unpublish, which the old checkbox could, by being unticked by accident.

**Telling a refusal from a stale lock.** RLS filters an UPDATE silently, the same result as a
stale lock. `writeProductPublished` (`lib/product-publish.ts`) reads the row after a no-match: a
lock that still matches means the role may not write products, and says so; otherwise the
stale-edit message. The route check refuses those roles first, so this is the second line.

*Reverses if:* Beco wants a gate before publishing, say no product live without a photograph,
when the warning becomes a disabled button with the reason and a database check to match.
