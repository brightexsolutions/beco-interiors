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
