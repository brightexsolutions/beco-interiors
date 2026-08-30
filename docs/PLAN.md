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
| M7 Brightex Studio | 4.0 | After launch, unbilled |

28 working days sequential, 26 calendar once M3 overlaps M2, against 20 available. The gap is
6 days and is closed by staging the motion and taking the dashboard cuts below, accepting a
one day slip rather than cutting into the storefront.

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
| (none yet) | | | |

## External dependencies

| Item | Owner | Blocks |
|---|---|---|
| Nameserver change to Cloudflare | Beco | M1 DNS half |
| Drive service account share | okechirene21@gmail.com | M2 live sync |
| `products.csv`: prices, specs, descriptions | Beco | M4 being a catalog rather than a gallery |
| Old beco.co.ke URL list | Beco | M6 redirect map |
| Pre migration baseline capture | Brightex | M6, and it stops existing at cutover |
| Which Sandstone Beige file is the slab | Beco | M2 |
| Vercel Pro upgrade | Brightex | M6 cutover |
