---
name: testing
description: What to test at each layer and what tested means on this project. Use before writing any test, and for the Codex review pass.
---

# Testing

Every piece of functionality or logic ships with a test. Hard rule for the whole engagement.

**No Playwright and no browser automation.**

## Layers

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | Quote and VAT totals, discount maths, reference generation, stock transitions, price display mode, slugging, zod schemas, WhatsApp and `tel:` link building, formatting, the image role token set matcher against every real filename in the export |
| Component | Vitest + RTL, jsdom | Add to quote, quantity, filter state, wizard steps, price override, empty, loading, error, and partially populated states, mobile card fallback |
| Integration | Vitest + local Supabase | Every server action and query helper. **This is where the quote flow is proven end to end**, because that is where the business logic lives. Failure paths included: duplicate reference, missing product, email failure, oversized upload |
| RLS | pgTAP | See the `rls-policy` skill |
| Accessibility | `vitest-axe` | Every public page type and the dashboard quote screens |
| Performance | Lighthouse CI | Budgets, with motion live rather than disabled |
| PDF | Snapshot | Page break behaviour on a 15 line quote |
| Backup | Scripted restore | Last night's dump restores and the site boots against it |
| UI journeys | `docs/QA-CHECKLIST.md`, by hand | Walked before any milestone closes, on a real phone where it matters |

## Failure paths are not optional

A test suite that only covers the happy path tells you the feature works when nothing goes
wrong, which is not the interesting case.

## The manual layer is a real layer

Dropping E2E means nothing automated walks a journey across page boundaries. The QA checklist
is the mitigation, so skipping it removes the mitigation rather than saving time.

The 12 tap budget is counted out loud, on a phone, producing a quote for three products. If it
exceeds 12, the milestone does not close. A person counting is a better test than an assertion
here, because a machine cannot tell that a tap felt awkward.

## Codex review pass

At each milestone close, on committed state, never concurrently. Run the suite. Review the diff
against the milestone todo list, hunting for what the author missed rather than re reading what
they wrote. Add the adversarial layer: attempts to break each RLS policy from every role,
neglected failure paths, property tests on the money maths, boundary cases on the import
matcher. Walk the QA checklist against a running dev server.

Findings become todos on the current milestone, not a separate backlog.

## Keeping the two agents in sync

`docs/TEST-COVERAGE.md` is the shared ledger of what is tested at which layer. Read it before
adding a test, so the second layer complements rather than duplicates and a gap is visible
rather than assumed covered.
