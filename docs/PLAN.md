# Plan of Record

Committed summary of milestones and status. The full plan, with architecture, decisions D1 to
D39, schema and design direction, is `files/BUILD-PLAN.md`, which is gitignored internal
Brightex material.

## Status

| Milestone | Days | Status |
|---|---|---|
| M0 Rules and rails | 0.5 | **Done**, commit 0c9566c |
| M1 Foundation and infrastructure | 3.5 | Next |
| M2 Drive import pipeline | 3.5 | Not started |
| M3 Design system | 2.0 | Not started, overlaps M2 |
| M4 Storefront, SEO, conversion, motion | 8.5 | Not started |
| M5 Operations dashboard | 6.5 | **WIP**, screens done including Ranges (D91), close remaining. Quotes through settings, `/studio/blog`, `/audit`, `/categories`, dashboard dark mode and the storefront revamp are on `dev`, the branch now used for all ongoing work (forked from `m5-dashboard`, always kept ahead of `main`; a feature or polish branch forks from `dev` and merges back once built and verified). Next: sections S, T, U and phone QA. Handoff: `docs/milestones/M5-QUOTES-HANDOVER.md` |
| M6 Launch | 3.5 | Not started |
| M7 Brightex Studio | 3.5 | After launch, unbilled. Inside the dashboard per D9, gated per D42 |

28 working days sequential, 26 calendar once M3 overlaps M2, against 20 available. The gap is
6 days and is closed by staging the motion and taking the dashboard cuts below, accepting a
one day slip rather than cutting into the storefront.

**Post-M5:** a storefront modernisation pass, accepted per D82. Targeted craft passes on named
pages after the dashboard closes, each an M4 revision, inside the brand guideline and the
performance budgets. Not a rebrand and not a milestone in its own right unless Beco asks for one.

**Landed so far, 2026-09-17** (multiple sessions have been working this pass concurrently in
the same working tree; this list is what is actually committed on `m5-dashboard`, not a plan):

- `/quote`: the item list is now a charcoal panel rather than sitting on the same white surface
  as the form beside it, matching the confirmation screen's own existing treatment. Fixed two
  real bugs the redesign surfaced (the panel forcing itself to the form's height and leaving a
  dead void below the last row; a "no photo yet" mark subtle enough to read as broken rather
  than deliberate). `QuantityStepper` and `Notice` moved into `@beco/ui`, closing drift between
  the copies on the product page and the quote list, and between the quote page's two notes and
  the dashboard's sign-in denial respectively.
- Home page: an "About Beco" strip and a "What we deal in" section covering all six ranges now
  sit right after the hero, addressing the gap that the home page read as a sintered stone
  catalogue with nowhere saying Beco sells six ranges or who Beco is. New `RangePillarList` in
  `@beco/ui` backs this and `/about`'s own four pillars, replacing two copies of the same row
  that had started to drift. Client credentials moved up the page and can now carry a written
  testimonial (migration 29).
- `/about`: the pillars section now reuses `RangePillarList` (see above). The rotating
  statement and showroom block still carry their pre pass design, unchanged, see the deferred
  row below.
- `HoverGallery` auto cycles on a device with no hover event instead of leaving sibling
  photographs permanently unreachable there, `/gallery`'s own "hover for more" label now hidden
  under `@media(hover:hover)` to match.
- `PinnedHero`'s lede truncation had a real bug: a sentence whose first clause was under 24
  characters fell through the heuristic entirely and shipped uncut to the mobile hero. Fixed.

Not touched this pass, still open: `/quote`'s form column beside the new charcoal panel and the
shop page's catalogue-by-category section. The rest of what used to sit in this paragraph (the
`/about` showroom video and background, home hero copy, pricing prominence, real project
photography on `/gallery`, a showroom booking CTA, dual homeowner/professional pathways,
technical spec fields, a floating WhatsApp button) is now claimed by the D92 pass below rather
than an unclaimed, separately routed thread.

**Second storefront pass, D92, 23 September 2026:** wider than D82, on Brown's explicit
instruction to diverge further from `CLAUDE.md`'s interaction rules than a craft pass allows.
Full reasoning, what stays locked and what opens up, is D92 in `docs/DECISIONS.md`; this is the
session breakdown so the work can be picked up cold in a fresh chat session without re-deriving
the decision. Branch `storefront-cinematic-redesign`, forked from `dev`.

| Session | Scope |
|---|---|
| 1 (this one) | Home: header gradient softened from a flat bar into a cinematic falloff; hero broadened from sintered stone alone to all six ranges via a static `HERO_RANGE_IMAGES` manifest (real Beco photography where it exists, checked stock where it does not), not a live product query, so it survives `pnpm db:reset`; `framer-motion` added as a dependency |
| 2 | Shop: the catalogue-by-category section, hero treatment extended to `/shop` (previously deliberately excluded as "a slim banner, not a full hero"), category cards, filter UI |
| 3 | Product: `/product/[slug]`, hero treatment extended (previously excluded the same way as Shop), the "product characteristics" style feature block Brown referenced from the sintered stone inspiration image |
| 4 | Gallery, About, Contact together, since all three already carry the dark hero pattern: `/about`'s showroom video and background (still on its pre pass design), real project photography replacing supplier renders on `/gallery`, dual homeowner/professional pathways, a showroom booking CTA, a floating WhatsApp button |
| 5 | Dashboard modernisation: same top nav, coloured and avatar bearing tables, charts where a screen has a real trend or split to show. A separate milestone from the storefront sessions above |

Each session's change is recorded as an M4 revision on completion, same as D70 to D79 and D82.

**Session 1 shipped, 23 September 2026.** `RANGE_GROUPS` moved out of `page.tsx` into
`apps/storefront/src/lib/ranges.ts`, now shared by the home page's "What we deal in" grid and
the new `HERO_RANGE_IMAGES` manifest rather than defined twice. `PinnedHero`'s `HeroSlab` type
and `slabs` prop are gone, replaced by `HeroRangeSlide` and `slides`: the `thickness` prop is
gone too, since it stopped meaning anything once the hero covers ranges that are not sold by
the millimetre. The right side chip rail and the mobile swipeable cards now link to
`/shop/<range>` rather than `/product/<stone-slug>`, and render as a plain, non-interactive span
or card when a range has no stock, rather than a link to an empty shop page. Header eyebrow and
h1 copy changed from stone-specific ("Sintered stone, stocked in Nairobi" / "Surfaces that
outlast the [room]") to range-general ("Six ranges, stocked in Nairobi" / "Every material for
the [room]"). The header's scrim went through two live iterations against the running dev server
before Brown signed off on the second: the first attempt still showed a visible edge where its
fade ended, fixed by a longer, more eased curve that actually reaches zero opacity rather than
stopping at a faint residual.

Four further rounds of live feedback against the running page, same session. `RotatingRoomWord`
no longer reuses `WordReveal`'s rise-from-a-clipped-line entrance on every 2.2s tick, reported
directly as reading like a mannerism on repeat: it now types and deletes each word with a
blinking `.beco-caret`, a `setTimeout` chain rather than `setInterval` so typing speed, the hold
and deleting speed can each own a different duration. The hero's lead sintered stone photograph
moved from `karen-kitchen-cyprus-grey.webp` to `kitchen-fluted-island.webp`, on the verdict that
the first read as an ordinary counter for the lead, LCP slide. That same
`karen-kitchen-cyprus-grey.webp` was then found to be the lead "Kitchen" card on `/gallery` too,
and on closer look really was the unfinished shot it looked like: the tap still had its
protective wrap on and a rough mid-install window frame sat in the background, missed by the
pass that originally curated `SITE_SHOTS`. Dropped from that list entirely rather than
demoted, since a secondary hover frame is still a frame a reader can reach;
`kitchen-charcoal-island.webp` leads the Kitchen group now. And a new "Beyond stone" section
went in between the signature moment and Process: sintered stone had the hero, the featured
grid and the signature moment, hardware had its own cutout section, and lighting, wall panels,
SPC flooring and accessories had nothing beyond the overview grid, reported directly as the page
still reading as a stone catalogue once a reader scrolled past the hero. Reuses
`HERO_RANGE_IMAGES` rather than sourcing a second set of photography.

A further round after Brown asked directly what had actually been borrowed from the reference
sites he shared at the start of the session, and pointed out correctly that the answer so far
was "not much, it's mostly been plumbing fixes". Three changes, deliberately picked as the
highest visible impact per unit of risk: every image card's corner is now rounded
(`rounded-2xl`), in `ProductCard` and `RangeCardGrid` in `@beco/ui` (so `/shop`, `/product`,
`/about` and every other caller inherit it, not just the home page) and in the hero's own mobile
card and the new "Beyond stone" tiles, since every reference image shared, Poliform, Aestic,
Ambiente, Mira among them, rounds its cards and a sharp corner next to a rounded one is what
actually reads as unfinished. `ProductCard`'s own "no border, no shadow, no lift" principle is
unchanged, this is a corner treatment, not a reversal of it. The horizontal content gutter,
`px-8 sm:px-10 lg:px-14`, was a single repeated string across 21 files including the header and
footer, not a token, so it widened everywhere in one pass to `px-8 sm:px-12 lg:px-20`, on direct
feedback shown against a reference with generous side margins that Beco's own gutter read as
cramped beside. And the desktop step on every major heading and the hero H1 (`sm:text-Nxl`)
came down one size, to the point that several are now identical to their own mobile size and
the now redundant `sm:` class was removed rather than left as dead weight: CLAUDE.md's type
floor is a minimum on body and small print, not a ceiling on display type, so this does not
touch the locked floor, only walks back how large the display end of the scale had grown.

A fourth round, still the same session, on "keep going on Home, I want to be satisfied with the
final look". The rounded corner treatment extended to `CompletedInteriors`' offset grid and
`RoomStack`'s dealt cards, both real card grammar the same way `ProductCard` is. `CutoutReveal`,
`SlabToSurface` and `SlabRail` deliberately did not: the first has no box at all by design, a
cutout object rather than a photograph in a frame, and the other two are full bleed, pinned,
cinematic sections, a different visual category from a card grid, the same reasoning that
already keeps the hero's own background unrounded. The stat band, a single full-bleed charcoal
rectangle since D43, became four separate rounded tiles on the page's own white ground instead,
same four real figures, same PLACEHOLDER flag on "Projects delivered", because a solid strip
edge to edge is exactly the flat block every reference Brown shared avoids. The horizontal
gutter widened in the same round turned out to have missed `CutoutReveal` in `packages/ui`,
outside the `apps/storefront/src` sweep that caught the other 21 files: found by curling the
running dev server rather than trusting the source grep alone, and fixed. That gutter value,
`px-8 sm:px-12 lg:px-20`, is now written into CLAUDE.md's own Spacing rule directly, on Brown's
explicit instruction to make it a standing rule rather than a one-off. Heading-to-content
margins (`mt-14` to `mt-10`) and grid row gaps (`gap-y-12` to `gap-y-8`, `RangeCardGrid`
included) tightened across the repeated grids, on the specific, concrete evidence that the page
looked "ideal" to Brown at 90% browser zoom: zoom shrinks spacing and text together, and the
fix taken was to tighten spacing rather than push body copy below CLAUDE.md's 16px/17px floor,
which stays untouched, Brown's own choice when asked directly. Section padding itself,
CLAUDE.md's separate "120 desktop, 88 tablet, 64 mobile" rule, was not touched: that number
governs the space between sections, not within one, and nothing in this round needed it moved.

`pnpm typecheck` clean across all 9 packages after every round. `pinned-hero.test.tsx`,
`site-header.test.tsx` and `rotating-room-word.test.tsx` rewritten for their new APIs and
passing (17, 13 and 5 tests). Full `unit` (258), `component` (540) and `dashboard` (535)
projects green as of the last round. Not yet done: this has not been walked on a real phone,
per the milestone's own "done means" definition, and the four stock photographs (lighting,
flooring, hardware, accessories, now each doing double duty in both the hero and "Beyond stone")
are flagged in `lib/ranges.ts` to be replaced the moment Beco has real room photography for
those ranges. Bento/asymmetric composition, badges sitting directly on a photograph, and an
integrated stat tile beside imagery rather than a standalone band are still on the table if
Brown wants to keep going further in the same direction.

A fifth round, still the same session: the gutter kept moving on Brown's direct, iterative
feedback against the running server, each step confirmed live before the next: 80/48/32px to
112/64/32px to 160/80/32px to 176/96/32px, then dialled back to 160 desktop with tablet held at
96, `px-8 sm:px-24 lg:px-40`, now CLAUDE.md's own written rule. The footer got a deliberate,
narrower exception, `lg:px-32`, on direct feedback that the site wide value compressed its
several nav columns rather than giving them room. `ProductCard`'s corner radius, added earlier
this session at `rounded-2xl`, 16px, was reported directly as "not right": corrected to
`rounded-lg`, 8px, matching the 8px spacing base, everywhere it had been applied
(`RangeCardGrid`, `CompletedInteriors`, `RoomStack`, the hero's mobile card, the home page's own
"Beyond stone" tiles and stat tiles), on the standing instruction that every boxed element
should carry this same subtle radius, not the softer one. That instruction reversed a second,
older rule in this same file, buttons at `rounded-[2px]`, effectively sharp, specifically
defended in `button.tsx`'s own comment as "no shadcn default radius survives here": buttons,
form fields (`field.tsx`) and the quantity stepper now carry `rounded-lg` too, since they are
unambiguously boxed elements and the new instruction was explicit that every one of them should
match. Left alone deliberately: `CutoutReveal`, `SlabToSurface` and `SlabRail`, full bleed or
frameless by design, a different visual category from a card; and the dashboard's own
`rounded-panel` menu system in `dropdown-menu.tsx`, an already established, separate rounding
convention that belongs to the dashboard's own future milestone, not this one. Nav items and the
header's own quote button were tightened (padding and tracking, not the 14px text-sm floor or
the 44px touch target, both of which CLAUDE.md locks) on the same direct, iterative pattern.
Full `unit` (258), `component` (540, one pre-existing flake in `dropdown-menu.test.tsx` that
passes in isolation and under a clean run, confirmed not a regression), and `dashboard` (535)
green, `pnpm typecheck` clean across all 9 packages.

**Corner radius reversed outright, same session.** The rounded corner direction, tried twice
(`rounded-2xl` then corrected to `rounded-lg`) and reported "not right" both times, was dropped
entirely rather than tuned a third time: Brown's call was to stay consistent with the sharp
language everywhere rather than round some boxed elements and not others. Reverted precisely,
file by file against `git diff`, so the OTHER changes made in the same files this session
(the gutter widening in `completed-interiors.tsx` and `CutoutReveal`, the `gap-y-12` to
`gap-y-8` tightening in `RangeCardGrid`) stayed intact rather than being swept up in a blind
revert. `ProductCard`, `RangeCardGrid`, `CompletedInteriors`, `RoomStack`, `Button`, `Field` and
`QuantityStepper` are all back to their exact original corners (`rounded-[2px]` on buttons and
form controls, sharp on card frames), confirmed against `git diff --stat` showing zero remaining
change on the components that had no other edits. CLAUDE.md's own "Corner radius" rule rewritten
to state sharp corners plainly and record that rounding was tried and reversed, so a future
session does not propose it again without knowing that history. Confirmed live against the
running dev server, not just the source diff. `pnpm typecheck` clean across all 9 packages,
full `unit` (258), `component` (540) and `dashboard` (535) green.

**Session 2 shipped, 23 September 2026: Shop, a real bug plus surface depth.** The hero
treatment extension to `/shop` (`CinematicBackground`, a crossfade through real application
photography behind the opening band, replacing the old slim identity bar D79 deliberately
excluded it to) had already landed earlier this pass, uncommitted alongside the site-wide gutter
widen; this session is the rest of the D92 session table's row 2, category cards and the filter
UI, plus a real bug Brown reported against a screenshot rather than a design ask.

The filter bar's broken look (Range, Finish and Sort each stacked on their own near-empty full
width row, the drawn chevron stranded far from the visible box) was not a styling gap, it was a
real defect in `Select` (`packages/ui/src/components/field.tsx`), a shared primitive: the flex
sizing classes a caller passes (`ShopControls`' own `sm:flex-1 lg:w-auto lg:flex-none`) were
applied to the inner `<select>` element, while the element that actually sits in the caller's
flex row is the wrapping span `Select` renders around it, hardcoded `w-full` with no way for a
caller to override it. Every sizing class `ShopControls` passed was therefore inert at every
breakpoint, and had been since the bar was rewritten. Fixed by moving the passed `className`
onto the wrapping span instead of the `<select>`, a shared fix reaching every other caller of
`Select`, not just this one: `grep -rn "<Select" apps/` turns up two dozen, mostly the
dashboard's own filter bars, all of which now get whatever sizing they ask for rather than
silently losing it. Regression coverage in both `packages/ui/src/components/__tests__/field.test.tsx`
(the wrapper, not the `<select>`, receives a passed className) and `shop-controls.test.tsx`
(the three facet controls carry `lg:w-auto lg:flex-none`, the classes that were being dropped).

Corner radius was asked about directly rather than assumed from the record above: confirmed, not
reopened. Sharp `rounded-[2px]` stays throughout, no rounding on the filter panel, the category
cards, or anywhere else this session touched.

Both `/shop`'s catalogue grid and `/shop/[category]`'s product grid moved onto a full bleed
`bg-neutral-50` section, on Brown's own direct observation, unprompted, that the site's surfaces
read as plain white throughout with nothing to lift a product photograph off the page the way
`ProductCard`'s own "no border, no shadow" principle assumes something will. Same token the home
page's "Why Beco" section already uses, not a new colour introduced for this. The docked filter
panel and the featured rail above keep their white ground, so the tint reads as the browsing
surface changing register rather than the whole page shifting colour. `ChildRanges`' own grid
gap tightened `gap-y-10` to `gap-y-8`, matching the convention `RangeCardGrid` already settled
on, a rule this grid had been left out of.

`pnpm typecheck` clean across the storefront. Full `component` and `unit` projects green
(113 files, 799 tests). Not yet done: walked on a real phone, per the milestone's own "done
means" definition; Codex's adversarial pass has not run on this diff.

**Session 2's own last gap tried again and reverted the same day, 24 September 2026, plus four
smaller items that did stick.** See D93 in `docs/DECISIONS.md` for the full reasoning and its own
addendum. In brief: `/shop`'s flat "whole catalogue" grid was rebuilt as one `SlabRail` per
range, `RANGE_GROUPS` order, sintered stone leading, on fresh direct instruction. Live against
the running site this read exactly as repetitive as the version tried and reverted on 14
September, and worse, `RailTrack`'s own cards carry no price and no add to quote control at all,
so browsing the whole catalogue that way was a genuine functional regression, not only a taste
call. Reverted the same session: `/shop` is back to the single Featured rail over a flat,
paginated `ProductGrid`, unchanged from before this pass. `/shop/[category]` keeps its one real
improvement from the attempt, `ProductGrid` swapped for `ProductGridPaginated`, so its own "View
all" still paginates rather than dumping the whole range at once; that part was never the
complaint. The Drive importer's "Lights" folder had created its own duplicate top level category
beside "Lighting", both showing in the footer; the one real product in it moved into "Lighting"
and the empty duplicate was removed, a local database fix rather than a code change, still
needing the same merge done to the Drive folder itself before the next `drive:import`
reintroduces it. The footer's "soon" marker on an empty range is gone, on direct request, and its
old "Designed and built by Brightex Solutions" credit is replaced by "Terms & conditions" and
"Privacy policy" links to two new pages, neither of them previously written. The home page's four
process step captions were rewritten: the originals described the tool's own behaviour ("survives
a refresh", "no account is required") rather than speaking to the person reading them.

The catalogue-by-category section itself is therefore still the one item open from D92's Session
2 table, tried twice now and reverted twice for related but not identical reasons: repetitive
right after Featured the first time, repetitive again plus missing commerce actions the second.
Whatever is tried a third time needs to answer both objections at once, not just the first one.

**D94, same day: two real bugs in what stayed.** Reported directly against the running page.
Featured's own "View all" linked to `/shop`, the page already open, so clicking it produced no
visible change and read as not clickable; it now jumps to a real `#the-whole-catalogue` anchor on
the grid below instead. Featured's own product mix was built from the raw category tree rather
than `RANGE_GROUPS`, so two loose Drive folders ("Fluted Wall Panels", "Drawer Rails") were eating
slots under the old fixed 12 item cap and crowding out genuinely stocked ranges (Hinges, Office
Accessories); rebuilt from `RANGE_GROUPS` so all six ranges with any stock are guaranteed a slot.
Separately, the docked filter bar's `sticky top-20` had never actually held through a scroll: its
containing block was only as tall as the bar itself, so it unstuck again within a few pixels of
engaging. `ShopControls` now takes the rest of the page as `children`, rendered inside its own
outer wrapper, which is what actually keeps it pinned below the header for the whole scroll, on
every breakpoint including the phone panel, one CSS mechanism rather than a separate mobile fix.
Full reasoning in D94, `docs/DECISIONS.md`.

**D95, same day: dated legal pages, a services section on Home and About, and the eyebrow
device's own repetition, cut where an Explore agent's census found it worst.** `/terms` and
`/privacy` gained a hand set `LAST_UPDATED` line and had two uniform blocks each folded into the
sections they belonged beside, five and four `LegalSection`s rather than seven and six of
identical shape. `CompletedInteriors` gained `eyebrow?: string | null`, `null` dropping the row
entirely; Home's own call, plus Home's "The range" and About's "Inside the showroom" and "The
team", lost their eyebrow markup outright, taking Home's four-in-a-row eyebrow run down to two.
A new `ServiceCardGrid`, shared by Home and About, states the four services the company profile
document already documents (consultation, site assessment, fabrication and installation for
stone and panels specifically, delivery), each with its own "Book a consultation" WhatsApp
action, replacing a `RangePillarList` first attempt reported back as the wrong design style.
About's rotating statement also swapped its SHOWROOMS frame from an unrelated stock photo to
Beco's own real showroom still, `/video/showroom-poster.jpg`. Full reasoning in D95,
`docs/DECISIONS.md`. Gallery's own eyebrow density, the census's other major finding, is not
touched this pass.

**`/quote`, 24 September, on Brown's direct request for a better layout, easier to use on both
desktop and mobile.** Not one of the five D92 session table rows, and closes instead the one
item the "Landed so far" list above had already flagged as open: the form column beside the
charcoal list panel. No session table row existed for it because it is form and layout work,
not the hero and photography language the D92 sessions are otherwise walking page by page, and
D92's own reasoning still governs it (sharp corners, the locked palette, no `window.confirm`, no
Playwright).

The nine field form was previously one flat stack under a single heading. It is now grouped with
`FormSection` (`packages/ui`, previously dashboard editors only, reused here rather than
invented again per rule 5) into "Your details" (name and phone, the two required fields,
alongside email and company, two per row from `sm` up) and "The project", plus two existing
`fieldset`s restyled to match, Collection or delivery and Anything else you need. Collection or
delivery moved from two bare radio dots to a pair of bordered, selectable cards, the previous
tap target being the 16px dot itself, not the row; installation and samples moved from a plain
checkbox row to the same bordered card treatment, `border-charcoal bg-neutral-50` once checked.
Both stayed on real native radio and checkbox inputs, controlled from the same component state
`fulfilment` already used, rather than a CSS-only `:has()` selected state, so the card's own
appearance cannot desync from what the browser will actually submit. Every input gained a
placeholder; several previously had none.

The list panel is now `lg:sticky lg:top-24` beside the form, on the concrete case that the form
grew materially longer than the list it sits beside (typically three to six lines against nine
fields, more once the delivery address and installation and samples detail lines are counted):
without this a reader scrolls the list out of view long before reaching the end of the form and
cannot check what they are actually asking for while filling it in. Its own `<ul>` caps at
`lg:max-h-[46vh]` with internal scroll past that, so a list at the schema's own 60 item ceiling
cannot grow the sticky panel taller than the viewport and strand its own bottom rows off screen.
A new "Add more materials" link to `/shop` closes a real dead end: reaching the quote page
previously left no way back to the catalogue except the header nav, easy to miss once the list
panel is the tallest thing on screen.

Two gaps this closed on `docs/QA-CHECKLIST.md`: the collection or delivery control revealing the
delivery notice and address field, and the new "Add more materials" link, are both now covered
by `quote-builder.test.tsx` rather than carrying a **NOT CONFIRMED** flag. `pnpm typecheck`
clean, full `component` project green (13 tests on `QuoteBuilder` itself, 2 new). Not yet walked
on a real phone, per the milestone's own "done means" definition: the sticky panel's behaviour
against an on screen keyboard and the `46vh` scroll cap against a genuinely long list are both
new surface this pass added and neither has been checked outside a browser devtools viewport.

**Dashboard, 18 September, branch `m5-dashboard`:** quotes, catalogue editor and
dashboard home figures are in. `/orders` converts a won quote, walks pending
to confirmed to fulfilled, marks paid, and issues a receipt. `/reports` is
the salesperson leaderboard and conversion funnel for admins. `/users` is
Brightex admin only. Announcements authoring is Beco admin. Settings, blog authoring and the audit
log viewer shipped next. Blog write and audit read are Brightex unless
Brightex assigns the grant on that user. The photography-led storefront
revamp is on the same branch.
Live beco.co.ke is still WordPress until launch.

**Consolidation, 23 September, branch `dev`:** the branch had accumulated real, previously
unverified debt from several concurrent sessions: `pnpm typecheck` had never once been run
clean end to end (a broken build was committed: the product page imported a function that did
not exist), three migrations collided on the same number from an unrenumbered merge so a fresh
`supabase db reset` failed outright, and `stock_quantity` was never actually wired into the
storefront's own query layer despite the M5 handover recording it as done. All fixed; see
`docs/DECISIONS.md` D90 and the commit history on `dev`. `pnpm typecheck`, both app builds,
the full Vitest suite (1331 tests) and pgTAP (330 tests) are now clean together for the first
time. Category and range management shipped, `/categories` (D91), closing the one real gap in
the "no developer needed to manage the catalogue" goal: product editing was already complete,
the taxonomy itself had no editor. The Drive importer had two real bugs, found before reusing
it to pick up photographs Beco added to previously empty folders: a re-run could silently drop
existing photos, and it reverted a dashboard rename or recategorisation on the next unrelated
change to that product's folder. Both fixed, D90, and the importer has run for real against the
local stack to prove it on live data, not only against fixtures.

**Dashboard, 24 September, branch `storefront-cinematic-redesign`.** Two items Brown raised
together: `/categories` folded back into `/products` as one "Catalogue" screen, and dialog
sheets across products and ranges now close on a successful Save rather than sitting open on the
same form with only a toast to say the write went through. Full reasoning is D100 in
`docs/DECISIONS.md`, this is the session record. `nav-items.ts` drops the separate "Ranges" item;
`/categories` becomes a redirect, the same shape `/stock` already used, rather than a 404 for an
old link. `CatalogueRanges`, new, renders the range tree as a chip panel above the product list,
each chip filtering the list below it via `?category=` (`fetchProducts` gained a `categoryIds`
filter, expanded from a selected group to its children by `categoryIdsInSelection`), its pencil
opening the same range sheet as before at `?range=`/`?newRange=` so it does not collide with the
product sheet's own `?edit=`/`?new=` on the same route. `CategoryTree` and `NewCategoryFab`
deleted, superseded rather than left dead. `ProductEditor` and `CategoryEditor` both gained an
`onSaved` callback, wired to close the sheet, matching the `onDeleted` callback each already had;
deliberately not extended to the create flow, which continues into edit mode on success on
purpose, see D100 for why that is recorded as a judgement call rather than assumed settled.

A real regression surfaced and fixed in the same pass, not left for review to find: removing the
now dead `/categories` entry from `ROUTE_RULES` silently opened `createCategory`, `updateCategory`
and `deleteCategory` to any signed-in role, since those actions still gated on `requirePath('/categories')`
and an unmatched path is open by design. RLS never stopped enforcing the real role check, migration
49, but the route-level check, the first of rule 7's two required places, had gone quiet. Fixed by
gating those three actions on `/products` instead, which already carries the identical role set;
see D100 for the full account.

`pnpm typecheck` clean across all 9 packages. Full `dashboard` (548), `unit` and `component`
projects green together (1355 tests). New: `catalogue-ranges.test.tsx` (9 tests), `categories.test.ts`
(pure unit coverage on `categoryIdsInSelection`), a `categoryIds` case in
`products.integration.test.ts` against real Postgres, two `onSaved` tests each on
`category-editor.test.tsx` and `product-editor.test.tsx`. Not yet walked on a real phone, per the
milestone's own "done means" definition: the chip panel's wrapping behaviour with all six ranges
and their full child count is untested outside the two-range fixture this was built against, see
D100's own reversal clause.

The announcement bar rendering a custom announcement in Warm Red rather than charcoal, also
raised this session, was investigated and found to be the system working as designed, not a
bug: `buildAnnouncementItems` in `apps/storefront/src/lib/announcements.ts` colours the bar red
only when an announcement's own `type` is literally Clearance, matching `AnnouncementEditor`'s
own live preview and its "Clearance is the Warm Red pass" hint, and keeping Warm Red rationed per
the design rules. Confirmed against the local database directly rather than assumed: the row was
"New test announcemenr", type Clearance, a leftover test entry. Brown confirmed delete on being
shown that, so it is gone; the type-to-colour coupling itself is confirmed as intended, not
changed.

**Same session, a fast follow-up against Brown's live screenshots.** Two things reported back
once the catalogue redesign above was actually running: "Old URL redirects" as a Page URL hint is
developer language a product manager should not have to parse, changed to "Old links still work"
on both the product and range editors; and the ranges panel itself, against the real taxonomy
rather than the two-range fixture it shipped against, read as "over the place" exactly the way
D100's own reversal clause anticipated. Fixed structurally rather than by falling back to that
clause's disclosure escape hatch: each group is now a full width row of its own so a line break
can never cross a group boundary, the group's name is a heading-weight control distinct from the
bordered range chips beneath it, and a group's displayed count now sums its own ranges rather
than showing its own always-0 figure. Full account, including why the disclosure fallback was not
needed, is the addendum on D100 in `docs/DECISIONS.md`. `catalogue-ranges.test.tsx` now 11 tests,
up from 9. `pnpm typecheck` and the full `dashboard` project (550) green.

**A third round, same day, against a screenshot of the real nine-group taxonomy.** The row-per-
group fix above closed "over the place" but not the scroll it was reported alongside: most groups
had one or two ranges, each still claiming a full line, so the panel stayed tall enough to push
the product list down. Brown gave a concrete instruction this time rather than a description of
the symptom: uniform pills, one wrapping row, a small edit icon inside each pill rather than
beside it, and the whole section collapsible. Built exactly that: one `RangePill` for both groups
and ranges, same height and form, a group's pill immediately followed by its own ranges' pills so
order alone now carries the relationship the earlier heading-weight styling used to; the edit
pencil is a narrow segment sharing the pill's own border; a disclosure on the "Ranges" heading
collapses the whole panel, replacing the `max-h-72` scroll cap rather than sitting alongside it.
Second addendum on D100 has the full account, including the deliberate 44px touch-target
tradeoff on the now-narrower edit segment. `catalogue-ranges.test.tsx` is 13 tests, up from 11.
`pnpm typecheck` clean, full `dashboard` project (552) green.

**Same session: delivery and installation made visible to whoever prices a quote, D101.** Brown's
own report: a customer asking for delivery or installation needs that indicated to staff, and
priced as its own line. Research first, since Brown said directly he was not sure of the right
approach: `quotes.fulfilment`, `delivery_address`, `wants_installation` and `wants_samples` were
all already captured on every submission, with a migration comment stating the plan was always
"captured as intent, not as priced lines: the salesperson prices them." What was missing was
purely the display: `fetchQuote` never selected the two `wants_*` columns and never rendered
`fulfilment` or `delivery_address` anywhere on the quote detail page. Fixed by adding both columns
to `lib/quote-detail.ts` and a new "Requested" block on `/quotes/[reference]`'s Customer panel:
`StatusPill`s, Delivery and Installation in the dashboard's `attention` tone since each is a real
pricing gap, Samples `muted` since it is not one. Pricing itself needs no new mechanism, the
existing "Not in the catalogue" custom line control already does exactly this. A `quote_items`
line-type column that would let the PDF visually separate a delivery or installation line from
materials was considered and deliberately deferred until the plain version has actually been used
once; full reasoning in D101, `docs/DECISIONS.md`. `pnpm typecheck` clean, full `dashboard`
project (552, unchanged) green. `docs/QA-CHECKLIST.md` marks the new panel NOT WALKED rather than
assumed correct.

## Agreed cut order, if the date is held

Stop when it fits.

1. Receipt PDF. Quotes only at launch, receipts the week after
2. Reports beyond a single salesperson leaderboard
3. Audit log viewer. Logging still happens from day one, reading it waits
4. `/dashboard/imports`. The CLI and `import_runs` cover it meanwhile

Motion can also stage: the pinned hero and reveal system at launch, the category rail, scale
and crop panel and cut out parallax the week after.

**Not on the cut list:** backups, documentation, the performance budget, SEO, the redirect map,
conversion instrumentation, the three blog articles. Studio is already outside the four weeks
and does not count as a cut.

## Deferred

Anything cut or deferred is recorded here with a reason, never silently dropped.

| Item | Milestone | Reason | Revisit |
|---|---|---|---|
| ~~Receipt PDF and its email template~~ **No longer deferred, 17 September** | M5 | Brown reversed cut order item 1: receipts are to be built in full, not left to the week after launch. A receipt is proof of payment, so it is sequenced behind the order payment state (mark an order paid, stamp `paid_at`) and is built with the orders screen rather than with quotes. Renderer decided at the same time: `@react-pdf/renderer`, shared by the quote and receipt templates per the `quote-document` skill | Building in M5, with orders |
| Audit log viewer (`/audit`) | M5 | Brown asked for it with settings, 18 September. Default read is `brightex_admin`. A Brightex admin can grant `can_read_audit` to another user. `beco_admin` no longer has a default read | Built this session |
| `/dashboard/imports` screen | M5 | Agreed cut order item 4: the `drive:import` CLI and the `import_runs` / `import_issues` tables carry the same information until the screen exists | Post-launch retainer |
| Automatic stock decrement on order status change | M5 | 0.1 resolved to option B (manual quantity). Auto-decrement needs a non-racing, non-negative decrement path, a put-back on cancellation, and a decision on whether a `quoted` quote reserves stock, none of which should be designed before the order flow has been used for real | After the order flow has real usage |
| Deeper reports (~~date range picker~~, trends) | M5 | 0.7 item 2: salesperson leaderboard and conversion from `analytics_events` shipped on `/reports`. A sales-review PDF download for the selected period shipped 18 September. Custom start and end dates shipped 18 September. Trends still wait | Post-launch retainer |
| MFA enrolment for admin roles (TOTP + a challenge on admin sign-in) | M5 | 0.6 and D83: forced first-login password change ships in M5 and closes the issued-password hole. TOTP enrolment is self-contained Supabase Auth work that blocks no other M5 screen, so it moves to the M6 security pass unless Beco wants it at launch | M6 security pass |
| Import pipeline EXIF auto-orient | Storefront revamp (D82) | Some rescued DELFONE-folder room photos render rotated 90 degrees: `tools/drive-import/src/images.ts` reads metadata without auto-orienting, so stored `width/height` are pre-rotation and a ratio guard cannot catch them. Worked around in `SlabToSurface` and `/about`; the real fix is `.rotate()` before `.metadata()`, or recording `orientation` | Next import pipeline pass |
| Portrait video sections to landscape stock | Storefront revamp (D82) | Beco approved the licensed landscape clip on `/gallery` (D69) and wants the portrait `SHOWROOM_FILM` sections (home, `/contact`) done the same way. Sourcing and licence-verifying a specific clip needs a session with web access | Next revamp session |
| `/about` lower sections | Storefront revamp (D82) | The opening hero and statement section were rebuilt, and the pillars now reuse `RangePillarList` (2026-09-17). The rotating statement and showroom block still carry their pre-pass design; the showroom block's background image and video sizing are specifically flagged as weak | Follow-up revamp pass |

## External dependencies

| Item | Owner | Blocks |
|---|---|---|
| Nameserver change to Cloudflare | Beco | M1 DNS half |
| Drive service account share | **Brightex, no longer blocked.** Editors can re-share this folder, proven by the Brightex to gbrownze hop | M2 live sync |
| `products.csv`: prices, specs, descriptions | Beco | M4 being a catalog rather than a gallery |
| Old beco.co.ke URL list | Beco | M6 redirect map |
| Pre migration baseline capture | Brightex | M6, and it stops existing at cutover |
| Brand guideline pages 20 to 21, Website Design Application | Beco or Brightex, they are images | M3 |
| Confirm "10+ years" versus the guideline's "new entrant" | Beco | M4 About page copy |
| Confirm whether Lighting stays a category | Beco | M4 navigation and taxonomy |
| Which Sandstone Beige file is the slab | Beco | M2 |
| Vercel Pro upgrade | Brightex | M6 cutover |
