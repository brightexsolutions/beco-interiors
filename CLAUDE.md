# Beco Interiors Platform: Project Rules

Reference BEC-2026-004-PLAN. These rules govern the whole engagement. They are not
per feature suggestions and they do not lapse between sessions.

`AGENTS.md` is a symlink to this file. Claude Code and Codex read the same bytes, so the
rules cannot drift apart. CI fails if that symlink is replaced with a divergent file.

## Read first

The full build plan is `files/BUILD-PLAN.md`: architecture, decisions D1 to D39, milestones,
schema, design direction, SEO and conversion strategy, ownership.

`files/` is gitignored, so a fresh clone will not have it. **If you cannot find
`files/BUILD-PLAN.md`, say so and ask. Do not proceed on guesswork.** `docs/PLAN.md` is the
committed plan of record.

## What this is

A Nairobi interior materials supplier whose business runs on multi item quotations, not single
item checkout. Three surfaces from one monorepo:

- `apps/storefront` to www.beco.co.ke, public
- `apps/dashboard` to dashboard.beco.co.ke, Beco's operations tools
- Brightex Studio is **not a separate app**. It is routes at `/dashboard/studio`, reachable
  only by an account that is both `brightex_admin` and on the `brightex_allowed_emails`
  allowlist in `settings`. Built after launch. See D9 and D42

The quotation flow is the product. A salesperson at the counter must raise, price and issue a
branded quote from a phone faster than writing it on paper. Test it more thoroughly than
anything else.

## Hard rules

### 1. No em dashes. Anywhere.

UI copy, product descriptions, blog content, PDF documents, email templates, code comments,
commit messages, documentation. Use commas, periods or colons.

### 2. Everything is tested

No function, API route, query helper, or piece of business logic ships without a test. Unit
tests by default. Integration tests for anything touching the database, auth, or an external
service, covering failure paths and not only happy paths. RLS policy tests for every table and
every role. See `docs/TEST-COVERAGE.md` for what is covered where.

**No Playwright and no browser automation.** Component interaction is Vitest plus React Testing
Library in jsdom. UI journeys are verified by hand against `docs/QA-CHECKLIST.md` on a real
device.

### 3. No decorative controls

Every interactive element must be proven to perform the operation it advertises. A button that
looks right and does nothing passes every visual review, which is why it survives.

Each screen carries an interaction inventory in `docs/QA-CHECKLIST.md`: every button, link,
form, toggle, filter and menu item, what it does, and how that was confirmed. Confirmation
means the operation was observed:

- writes to the database: the row changed
- sends an email: the message arrived
- generates a document: the PDF rendered and a `documents` row was written
- navigates: the right destination loaded
- filters or sorts: the result set and its count actually changed
- changes state: the change survived a refresh
- opens an external channel: WhatsApp opened prefilled, the dialler had the right number

Never ship `onClick={() => {}}`, `href="#"`, or a control disabled with no reason given.

### 4. Never use a browser dialog

**No `window.confirm`, `window.alert`, or `window.prompt`. Ever.**

They cannot be styled, they cannot be branded, they block the main thread, they are inconsistent
across browsers, they are untestable in jsdom, and on mobile they look like a phishing warning.
A destructive action confirmed by a grey system box on a site selling premium materials is a
credibility problem, not just an aesthetic one.

Use the shared components instead:

| Instead of | Use |
|---|---|
| `window.confirm` | `<ConfirmDialog>` from `@beco/ui` |
| `window.alert` | `toast()` from `@beco/ui` |
| `window.prompt` | A real form in a `<Dialog>` |

`ConfirmDialog` is required for anything destructive or irreversible: deleting a product,
cancelling an order, marking a quote lost, deactivating a user, changing a role. It states what
will happen, names the thing being acted on, and its confirm button says the verb, "Delete
product", never "OK".

A lint rule fails the build on all three globals. The rule is the backstop, not the standard.

### 5. Build it once, in @beco/ui

If a pattern appears twice, it belongs in `@beco/ui`. Duplicated components drift, and drifted
components are how a design system quietly dies.

See `docs/COMPONENTS.md` for the inventory and what each one is for.

### 6. Security is not negotiable

- RLS on every table, deny by default, tested for anonymous and each role individually
- The service role key is server only. Never in client code, never in a `NEXT_PUBLIC_`
  variable. CI fails the build if it leaks
- Role checks in two places: Postgres RLS and route middleware. Never a client side check
  alone. Hiding UI is not access control
- All input validated server side with zod. Client validation is for UX only
- Rate limiting on public write endpoints
- CSP written explicitly, plus X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS
- Soft delete anything with commercial meaning, so the audit trail points at a real record
- Audit logging goes in as each feature is built, never in a catch up pass

### 7. Milestone discipline

Start every milestone by expanding it into a written todo list. Add what you discover rather
than remembering it. At the end, walk the list and verify each item against reality, not
memory. An item is ticked because it was checked, not because it was implemented.

**Done means:** the feature works, its tests pass, its RLS policies are tested, its pages meet
the SEO checklist, its interaction inventory is complete, the QA checklist has been walked,
Codex's review pass has run and its findings are resolved or explicitly deferred, its
documentation is written, and it has been clicked through on a real phone where that matters.

Anything cut is written into `docs/PLAN.md` as explicitly deferred with a reason. Never
silently dropped.

## Design rules

The brand system governs. The prototype in `prototype/` was drawn before anyone had seen the
guideline, so its colours are retired. What carries forward is its structure: the 8px base, the
section rhythm, the eyebrow pattern, the scroll reveal.

- **Palette:** Charcoal Black and High-Vis White carry everything. Warm Red appears three or
  four times per page and never more. The shell is near monochrome so the stone is the only
  colour on the page
- **Type:** Titillium Web for UI and body, Cormorant Garamond for display. Self hosted subset
  woff2, no Google Fonts request. **Formula1 Display is never deployed**, see D3
- **Type floor 16px everywhere including the dashboard.** 17px body on desktop. 14px small
  print floor, used rarely. Measure capped at 68ch. Line height 1.6 body
- **Spacing:** 8px base. Section padding 120 desktop, 88 tablet, 64 mobile. Touch targets 44px
- **Contrast** verified by script, never assumed. Warm Red on white checked at every size
- **Copy is short.** No explanatory paragraphs inside interface elements, no marketing voice in
  the dashboard, no sentence where two words will do

### Never build

A centered hero with a gradient blob. Three column feature cards with an icon in a circle. A
footer that is grey link columns and a copyright line. Unmotivated gradients. A dark sidebar
dashboard with four sparkline tiles over a dense table. Charts added because a dashboard is
expected to have them.

### Motion

Six effects, no more: pin and release, reveal, parallax at depth, count up, scale and crop,
video in view. One significant effect per section. Never two pinned sections adjacent. **No
scroll jacking.** All pinning dropped on mobile. Everything collapses under
`prefers-reduced-motion`. Transform and opacity only, never layout properties. The hero LCP
image is never animated on entry.

## Performance budgets

Enforced by Lighthouse CI, failing the build on breach, measured with the scroll choreography
live rather than disabled.

LCP under 2.0s on simulated 4G. CLS under 0.05. INP under 200ms. Home page under 1.0MB,
product page under 1.2MB. Hero image under 150KB, product card image under 60KB.

Speed is a ranking input and a conversion input at once, which is why these are budgets and not
aspirations.

## SEO

Built into each page as it is written, gated by the `seo-checklist` skill. Never bolted on at
the end. Metadata API, the full JSON-LD set, database generated sitemap, automatic category
index gating on published product count, and filtered category URLs canonicalised to the base
with `noindex`.

## Ownership boundaries

Brightex holds the GitHub repository and the Vercel projects. **Nothing else.** Cloudflare, R2,
Supabase, Resend, monitoring and the Drive service account are all registered to Beco under
becointeriorsdev@gmail.com, with Brightex added as a member on each.

Never set up Search Console, GA4 or the Google Business Profile under a Brightex account. Those
belong to Beco under their own Google account, with Brightex as manager only. Full matrix in
`docs/OWNERSHIP.md`.

What happens if Brightex stops working on this is in `docs/HANDOVER.md`, written to be shown
to Beco. Keep it accurate: an exit plan describing accounts that no longer exist is worse than
none, because it is trusted.

## Out of scope

Do not build unless the plan is formally revised: online payments, automated WhatsApp intake
via Meta's API, public customer accounts or wishlists, native apps, any ad tooling, appointment
booking, live chat widgets, email marketing platforms.

## Conventions

- **Directories:** `apps/` deployables, `packages/` shared, `tools/` scripts, `supabase/`
  migrations and policy tests, `docs/` committed documentation, `files/` gitignored internal
  reference, `_incoming/` gitignored raw source
- **Naming:** kebab-case files and directories, PascalCase components, camelCase functions,
  snake_case database columns. Slugs derive from Drive folder names so the taxonomy stays
  traceable to its source
- **Commits:** imperative mood, present tense, no em dashes, explain why when it is not
  obvious. **Never include agent attribution.** No `Co-Authored-By: Claude`, no
  `Co-Authored-By: Codex`, no "Generated with" notice. A commit is authored by the person who
  ran and reviewed the work. Enforced by `.githooks/commit-msg`, activated with
  `git config core.hooksPath .githooks`. See the `git-commit` skill
- **Migrations:** one file per change, RLS policies and their tests in the same migration. No
  table exists without a policy and a test proving it

## The two agents

Claude Code builds features and writes their tests together, so the tests carry the reasoning
behind the code.

Codex runs at each milestone close, on committed state, never concurrently: runs the suite,
reviews the diff against the milestone todo list, adds the adversarial layer (attempts to break
each RLS policy from every role, neglected failure paths, property tests on the money maths,
boundary cases on the import role matcher), and walks the QA checklist against a running dev
server. Its findings become todos on the current milestone, not a separate backlog.
