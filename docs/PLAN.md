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
| M5 Operations dashboard | 6.5 | Not started |
| M6 Launch | 3.5 | Not started |
| M7 Brightex Studio | 3.5 | After launch, unbilled. Inside the dashboard per D9, gated per D42 |

28 working days sequential, 26 calendar once M3 overlaps M2, against 20 available. The gap is
6 days and is closed by staging the motion and taking the dashboard cuts below, accepting a
one day slip rather than cutting into the storefront.

**Post-M5:** a storefront modernisation pass, accepted per D82. Targeted craft passes on named
pages after the dashboard closes, each an M4 revision, inside the brand guideline and the
performance budgets. Not a rebrand and not a milestone in its own right unless Beco asks for one.

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
| Receipt PDF and its email template | M5 | Agreed cut order item 1: quotes only at launch, receipts the week after. `document_type` already carries `receipt`, so this defers the renderer and template, not schema | Week after launch |
| Audit log viewer (`/dashboard/audit`) | M5 | Agreed cut order item 3: audit *writing* is live from day one via the trigger, *reading* it through a screen waits. Admin roles can still query the table directly meanwhile | M6 or first retainer cycle |
| `/dashboard/imports` screen | M5 | Agreed cut order item 4: the `drive:import` CLI and the `import_runs` / `import_issues` tables carry the same information until the screen exists | Post-launch retainer |
| Automatic stock decrement on order status change | M5 | 0.1 resolved to option B (manual quantity). Auto-decrement needs a non-racing, non-negative decrement path, a put-back on cancellation, and a decision on whether a `quoted` quote reserves stock, none of which should be designed before the order flow has been used for real | After the order flow has real usage |
| MFA enrolment for admin roles (TOTP + a challenge on admin sign-in) | M5 | 0.6 and D83: forced first-login password change ships in M5 and closes the issued-password hole. TOTP enrolment is self-contained Supabase Auth work that blocks no other M5 screen, so it moves to the M6 security pass unless Beco wants it at launch | M6 security pass |
| Import pipeline EXIF auto-orient | Storefront revamp (D82) | Some rescued DELFONE-folder room photos render rotated 90 degrees: `tools/drive-import/src/images.ts` reads metadata without auto-orienting, so stored `width/height` are pre-rotation and a ratio guard cannot catch them. Worked around in `SlabToSurface` and `/about`; the real fix is `.rotate()` before `.metadata()`, or recording `orientation` | Next import pipeline pass |
| Portrait video sections to landscape stock | Storefront revamp (D82) | Beco approved the licensed landscape clip on `/gallery` (D69) and wants the portrait `SHOWROOM_FILM` sections (home, `/contact`) done the same way. Sourcing and licence-verifying a specific clip needs a session with web access | Next revamp session |
| `/about` lower sections | Storefront revamp (D82) | The opening hero and statement section were rebuilt; the pillars, rotating statement and showroom block still carry their pre-pass design | Follow-up revamp pass |

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
