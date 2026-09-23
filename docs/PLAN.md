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

Not touched this pass, still open: `/quote`'s form column beside the new charcoal panel, the
showroom video and background image on `/about`, the shop page's catalogue-by-category section,
the home page hero copy, pricing prominence, and the wider Beco team feedback (broader offering
messaging, "Why Beco", real project photography replacing supplier renders on `/gallery`, a
showroom booking CTA, dual homeowner/professional pathways, technical spec fields, a floating
WhatsApp button). That feedback was explicitly routed to a different chat session; check with
Brown before assuming it is unclaimed.

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
