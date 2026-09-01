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
