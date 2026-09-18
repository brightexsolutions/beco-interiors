# M5: Operations dashboard

> **Starting a new session to close M5?** Quotes through settings, Studio,
> audit and the appearance toggle are handed off. Read
> `docs/milestones/M5-QUOTES-HANDOVER.md` first, then walk sections S, T and
> U in this file. Do not reopen quotes, AppShell, the charcoal band,
> catalogue, orders, reports, users, announcements, settings, Studio, audit
> or the theme toggle unless Brown asks.
>
> Cold start on the whole milestone: this file, `docs/ARCHITECTURE.md`
> sections 4 to 7, 10, 11, 12 and 17, and `docs/DECISIONS.md` from D50. The
> quotation flow is the product. Test it more thoroughly than anything else
> on the platform.

Per CLAUDE.md rule 8. **Ticked only when checked against reality, not when written.**

Status key: `[x]` verified against reality / `[~]` built, not yet verified / `[ ]` not started

Items are added as they are discovered rather than remembered.

Branch: `m5-quotes`, off `m5-dashboard` at `a6d784d` (`m5-dashboard` itself is
off `m4-closeout` at `a5783b6`). Quotes (D, E), dashboard home figures (H) and
the catalogue editor (F, G, D89, including create and photographs) are built
as of 18 September. Orders (K) and reports (I) have shipped. Users (B) and
announcements (J) shipped 18 September. Settings (V), blog (W), audit (X)
and the dashboard appearance toggle shipped the same day. Studio write is
Brightex-only. Audit read stays grantable. Next: M5 close (S, T, U), not
another screen. M4's own tail (real phone QA walk, first green Lighthouse
PR run, ESLint once typescript-eslint supports TS 7) stays on
`m4-closeout` and is not M5 work.

---

## 0. Decisions and blockers, resolve before the feature they gate

Raised with Brown at M5 start. Each says what it blocks and carries a recommendation. **Do not
build past one silently.**

**Resolved 9 September:** 0.1 is **B** (quantity, manual, half unit for slabs; auto-decrement is
a deferred follow-up). 0.2 is **display only plus a Re-issue action**. 0.3 is the **"Pricing on
application" block**, not zeros, not a blocked PDF. 0.7 is **all three cuts confirmed deferred**
(receipt PDF, audit viewer, `/dashboard/imports`), leaderboard and conversion report stay.
0.4, 0.5, 0.6, 0.8, 0.9, 0.10 and 0.11 proceed on the recommendation each carries below unless
Brown changes it.

### 0.1 Stock: a label, or a real quantity? (blocks section F, and the storefront reflecting it)

`docs/REVIEW.md` 2.1 says stock is a label: `products.availability` is an enum
(`in_stock | pre_order | poa`) with no quantity anywhere, and it recommends the director's
"low or out of stock" card just counts rows explicitly marked `pre_order` or `poa`, no new
schema. Brown's 4 September ask (recorded in D68's closing note) is the opposite: track stock so
the dashboard shows what is left of a range as sales are made, **in the same half slab
granularity quotes are now written in**, or a sale of 1.5 slabs cannot be deducted correctly.

These genuinely conflict. Options:

- **A, label only.** Rename the card to "Items marked pre-order or POA". No migration. Ships in
  hours. Loses the 4 September ask entirely.
- **B, quantity, manual.** Add `stock_quantity numeric(12,2)` and `low_stock_threshold` to
  `products`, half unit granularity for `unit = 'per slab'` and whole elsewhere (the same split
  `submit_quote` already makes per D68). A product manager adjusts it by hand, every change
  audited. The card counts against the threshold. No automatic deduction: nobody keeps a manual
  count accurate for long, but it is honest about that.
- **C, quantity, deducted.** B, plus an order reaching `confirmed` (or `fulfilled`) decrements
  the line's product by its quantity, inside the same transaction as the status change, audited.
  Closest to the ask. Costs the most: it needs a decrement path that cannot go negative or race,
  a story for a cancelled order putting stock back, and a decision on whether a `quoted` quote
  reserves stock or not.

**Recommendation: B for M5, with the decrement in C written as a follow-up once the order flow
has been used for real.** B gets the number on the screen and in the half unit the quotes use,
without betting the milestone on a reservation model nobody has operated yet.

**RESOLVED 9 September: B.** Section F is written to B. The C decrement is recorded in
`docs/PLAN.md` as deferred with a reason. Still open, a smaller call folded into F: whether the
storefront availability card reads `stock_quantity` (so "mark stock out and the storefront
reflects it", the build plan's QA journey) or stays on `availability` with stock being an
internal figure only. Recommend it reads `stock_quantity` once a threshold of 0 is reached, so
the journey works, and F carries that unless told otherwise.

### 0.2 Quote expiry behaviour (blocks the quote list and detail state, `docs/REVIEW.md` 2.4, PRD open question 3)

`quotes.valid_until` is stored and printed on the PDF. Nothing acts on it. A quote sits at
`quoted` forever. Is an expired quote still honourable? Does its status change? Does the
dashboard show it differently?

**RESOLVED 9 September: display only plus Re-issue.** The dashboard computes an "expired"
presentation state from `valid_until < today` and shows it as a muted badge on the list and
detail, with a "Re-issue" action that stamps a fresh `valid_until` and regenerates the
document. No new `quote_status` value, no nightly job, no automatic status change. `valid_until`
stays exactly what the PDF already says it is.

### 0.3 Totals on an unpriced quote (blocks the quote document and the detail totals block, `docs/REVIEW.md` 2.5)

A quote whose lines are all still at `unit_price = 0` has no real subtotal. The document must
not print `KES 0.00` as though everything were free.

**RESOLVED 9 September: "Pricing on application" block.** While any line is unpriced, the
dashboard shows an "unpriced" state on the totals block and the "Generate PDF" action produces a
document with the totals block **replaced by "Pricing on application"** rather than zeros,
clearly marked as not a priced quote. Once every line has a `unit_price`, the totals block
renders normally (VAT backed out per D50). A mixed quote, some lines priced and some not, counts
as unpriced until every line is priced.

### 0.4 The quote response SLA number (blocks the "quotes awaiting response" stat card, A10)

`docs/CONTENT-AUDIT.md` and `M4-HANDOVER.md`: the prototype claimed a 2 hour turnaround in five
places and 24 hours in a sixth, and nobody has confirmed which is real. The storefront currently
promises nothing, on purpose. The stat card "quotes awaiting response, with the age of the
oldest, red when breached" needs a real threshold.

**Recommendation:** add `quote_response_sla_hours` to `settings` (staff-readable, admin-writable),
default it to `2`, and let Beco tune it without a deploy. The card and any "overdue" styling read
that key. Confirm the default.

### 0.5 Are the six stat cards the right six? (PRD open question 2, A10)

The six from `files/BUILD-PLAN.md` section 11.1: quotes awaiting response with oldest age; quotes won
this month, count and value, vs last month; quote to won conversion rate vs last month; invoiced
vs collected this month; leads today across quote submissions, WhatsApp clicks and calls; low or
out of stock count. **Recommendation: build against these six, show them to whoever opens the
dashboard first thing (Irene), adjust at milestone close.** Low risk, not a hard blocker.

### 0.6 MFA for admin roles: M5 or the M6 security pass? (`docs/ARCHITECTURE.md` section 11: "MFA required for admin level roles at minimum")

Forced first-login password change is core M5 and is in section A below regardless. TOTP
enrolment and a challenge on admin sign-in is the open question.

**Recommendation: forced password change in M5, MFA enrolment flagged into the M6 security
review** unless Beco wants it at launch. It is a self-contained Supabase Auth feature that does
not block any other M5 screen. Confirm which milestone.

### 0.7 Confirm the agreed cuts still hold (`docs/PLAN.md` "Agreed cut order")

The plan's cut order, "stop when it fits", for M5:

1. **Receipt PDF.** Quotes only at launch, receipts the week after. `document_type` already
   carries `receipt`, so this is deferring the renderer and the template, not schema.
2. **Reports beyond a single salesperson leaderboard.** The leaderboard and the six stat cards
   stay. The conversion report (product view to add to cart to quote submitted, plus WhatsApp
   and call clicks per product and category) is **explicitly not on the cut list** in
   `docs/PLAN.md` ("conversion instrumentation" is named as protected), so it stays in M5 unless
   you say otherwise.
3. **Audit log viewer.** Logging still happens from day one, the trigger is already live. The
   `/dashboard/audit` reading screen waits.
4. **`/dashboard/imports`.** The CLI and the `import_runs` table cover it meanwhile.

**RESOLVED 9 September: 1, 3 and 4 deferred**, recorded in `docs/PLAN.md` Deferred with a
reason. 2 holds as written: leaderboard and conversion report in, deeper reporting out.

### 0.8 Staff accounts for local, staging and the real thing (blocks anyone using the dashboard at all)

`supabase/seed.sql` seeds no `auth.users` rows. Nothing but the pgTAP suite, which mints its own,
has ever signed into the dashboard. A4 sizes the launch team at six: 1 `beco_admin`, 3
`beco_sales`, 1 `beco_product_manager`, 1 `brightex_admin`.

**Recommendation:** seed six **fictional** staff accounts into `seed.sql` for local and staging
(rule 6: never cloned from production, fictional only), each with a known dev password and
`must_change_password = true` so the forced-change flow is exercised. The real staging and
production accounts are created out of band by Brightex and handed to Beco, documented in
`docs/RUNBOOK.md`, never in the repo. Confirm the seed approach and the dev password convention.

### 0.9 Order-items write path for a salesperson (build decision, noted not blocked)

`order_items` RLS is admin-only write (`order_items_write_admin`); `orders` insert is open and
`orders_update_own` lets sales update their own. A salesperson converting a won quote to an order
therefore cannot write the order lines directly. **Plan: a `security definer` RPC
`convert_quote_to_order(p_quote_id uuid)`**, the same shape as `submit_quote`, atomic, carrying
line prices across unchanged, stamping `quotes.finalized_at` and `quotes.converted_order_id`,
setting `orders.salesperson_id` to the quote owner. Recorded here so the approach is agreed
before it is built. Not a blocker, flag if you want it done differently.

### 0.10 Web fixed-price order path: whose milestone? (`docs/ARCHITECTURE.md` section 7)

The storefront "Add to order" then "Confirm order" flow terminating in an `orders` row is in the
architecture but not ticked in `docs/milestones/M4-TODO.md`. The dashboard side of orders
(list, detail, mark paid, convert) is unambiguously M5.

**Recommendation:** the storefront submission form and its rate-limited server action land on
`m4-closeout` as an M4 tail item; M5 consumes the `orders` rows it produces. Confirm, or pull the
whole path into M5.

### 0.11 The web-submission confirmation email delivery (`docs/milestones/M4-HANDOVER.md` section 2)

`buildQuoteConfirmationEmail` and `sendQuoteConfirmation` exist in `@beco/documents`, tested, but
nothing sends them: the storefront must never hold the Resend key. The handover says this belongs
on the database side, an edge function triggered by the `quotes` insert, "a new deployment
surface with no precedent here yet".

**Recommendation:** M5 introduces the dashboard's own priced-quote send (section D), which does
hold the Resend key server-side and uses the same template. The **web** submission's
auto-acknowledgement edge function is its own small piece: decide whether it rides M5 (since M5
builds the first real server-side Resend integration) or waits for M6 when the deploy surfaces
exist. Recommend M5 if time allows, M6 if the cut order bites.

---

## A. Auth, sessions and accounts

`docs/ARCHITECTURE.md` section 11 and section 12. The `/launch` slice (D80) already has password sign-in,
`proxy.ts`, `lib/session.ts` (`resolveAdminRole`, `requireAdmin`), `lib/supabase.ts`. Reuse it.

**Built and verified 10 September. Model recorded as D83, exception note D84.** Route/role map
is `apps/dashboard/src/lib/access.ts`; first-login RPCs and the narrowed `users_update_self_safe`
are migration 26 with `09_dashboard_first_login.test.sql` (18 pgTAP). Verified live against the
running dev server with real Supabase sessions for every seeded role.

- [x] Extend `proxy.ts` `matcher` from `/launch/:path*` to the whole dashboard, with a
      per-route role check. `lib/access.ts` `ROUTE_RULES` + `canAccess`, read by the proxy AND
      `requirePath` so they cannot drift. Also excludes `public/` assets (any path with a dot)
- [x] `must_change_password` blocks every route except `/change-password`. Proxy redirect +
      `requireUser` re-check. Verified: flagged `sam.odhiambo` at `/` and `/quotes` -> `/change-password`
- [x] Forced password change screen (`/change-password`): `auth.updateUser({ password })`, then
      `complete_first_login()` clears the flag; the `users` trigger audits the transition;
      redirects to the role's landing. `changePasswordSchema` in `@beco/validation`
- [x] `last_login_at` stamped on every successful sign-in via `record_sign_in()`, which also
      writes the `login` `audit_log` row (`audit_log` takes no direct insert)
- [~] Deactivation is immediate: proxy clears the `sb-*-auth-token` cookies on a null-role
      session and the sign-in action signs an inactive account back out. `proxy.test.ts` covers
      it; the **real mid-session bounce still to be walked on a device** (in `docs/QA-CHECKLIST.md`)
- [x] No self-service reset, no "forgot password". The login screen offers neither; a test pins
      the denied copy. Reset path documented in `docs/RUNBOOK.md`
- [x] Role-based landing at `/` (the dashboard app root, not `/dashboard`): `beco_sales` ->
      `/quotes`, `beco_product_manager` -> `/products`, admins -> the stat-card home,
      `beco_editor` -> a plain "nothing assigned yet" page (no M5 operations screen). Verified
      live for all four
- [x] MFA for admin roles: **deferred to the M6 security pass** per 0.6, recorded in
      `docs/PLAN.md` Deferred. No code in M5
- [x] Six fictional staff seeded in `seed.sql` (1 admin, 3 sales, 1 PM, 1 brightex), all
      `must_change_password = true`, dev password `beco-dev-pass`, each with an `auth.identities`
      row so GoTrue password sign-in actually works. Verified by signing in as each
- [x] Real account creation documented in `docs/RUNBOOK.md` (out of band, two steps until
      `/dashboard/users` ships), never in the repo
- [x] Tests: `access.test.ts` (the matrix), `proxy.test.ts` (per role per route, the
      forced-change gate incl. `/launch`, the deactivation cookie-clear), `09_dashboard_first_login`
      pgTAP (RLS still the authority: self re-arm / self-deactivate / self role change all
      refused, anon cannot execute the RPCs), sign-in and change-password action tests
- [x] **Design pass** (Brown, 10 Sept): `AuthShell` (charcoal brand panel over Beco's own
      `showroom.mp4` with a charcoal wash, white form panel, no dark-sidebar look), `PasswordInput`
      in `@beco/ui` with a show/hide toggle, autofill fields forced onto the palette in
      `tokens.css`, dashboard logo marks + favicon. Plain product copy, no "Brightex issued you"

## B. `/dashboard/users`, per D6

`brightex_admin` only (`beco.brightex.dev@gmail.com`). Product manager
(`aisha.farah@beco.co.ke`) cannot load `/users`. Proxy and `requirePath`
already gate the route. `users_write_brightex` RLS already exists.
`beco_admin` may still SELECT users (existing `users_read_all_admin`);
writes stay Brightex.

Written 18 September before coding, from handover section 7. D38 lookup:
reduced-column table plus a detail sheet, **not** quote-style cards. FAB
because create is in the plan.

### Schema

- [x] Trigger: refuse changing your own `role` or `is_active` even through
      `users_write_brightex`. `record_sign_in` / `complete_first_login` still
      move `last_login_at` and `must_change_password`
- [x] Trigger: refuse deactivating or demoting the last active `beco_admin`
      or the last active `brightex_admin`
- [x] `end_user_sessions(p_user_id)` security definer, `is_brightex_user()`
      gated. Deletes `auth.sessions` / `auth.refresh_tokens` so a deactivated
      account is out, not waiting for JWT expiry
- [x] `users_touch_updated_at`. Audit trigger already on `users`

### List `/users`

- [x] Heading Users, no lede. Charcoal labelled FAB New user, desktop and phone
- [x] Filters from `lg`: search plus Role and Status on one row. Phone: search
      full width, selects under it. No Search label. URL is the source of truth
- [x] Desktop `DataTable`: Name, Email, Role, Status, Last login, Actions.
      Actions is icon plus View
- [x] Phone: reduced-column table (Name, Status, Actions), no horizontal
      scroll, not cards. View opens the sheet
- [x] Paginate. Empty state. Skeleton matches the shape

### Create and detail sheet

- [x] Create: email, full name, role. `must_change_password = true`,
      `is_active = true`, `created_by`. Auth user via service role, profile
      via the Brightex session so RLS still applies. Issued password shown
      once, copyable, not stored. Duplicate email refused
- [x] Sheet `FormSection`s. Close uses the x icon
- [x] Reset password: ConfirmDialog, reissues, re-arms `must_change_password`,
      shows the new secret once
- [x] Deactivate / Reactivate via ConfirmDialog naming the person. Sessions
      end. Quotes keep their attribution. Nothing is deleted
- [x] Change role via ConfirmDialog. UI never offers it on your own row
- [x] Last active admin of that role cannot be deactivated or demoted
- [x] Sales sheet: photograph upload (same R2 400/800/1600 pipeline as products),
      public title, public phone, Show on /team. Constraint still refuses
      `is_public` on any role but `beco_sales`. Storefront `/team` revalidated.
      Dashboard preview reads `/api/img` on this app, not the storefront origin

### Tests and docs

- [x] pgTAP: sales, product manager and editor cannot write `users`; Brightex
      on the allowlist can; self role / self deactivate refused; last admin
      refused; created row has `must_change_password`; anon cannot execute
      `end_user_sessions`
- [x] Vitest: list, filters, reduced table vs desktop, sheet actions,
      ConfirmDialog verbs, issued password shown once, server actions,
      integration against local Postgres. No Playwright
- [x] QA inventory and TEST-COVERAGE

## C. Dashboard shell and chrome

Design rules: no dark sidebar, no charts because a dashboard is expected to have them, hierarchy
from type and whitespace, Warm Red only for genuine attention states, 16px type floor including
here (D34, `pnpm check:type-floor` already in CI).

**Started early alongside section A, on Brown's steer (10 September). Direction recorded as
D85.** `AppShell` wraps the `apps/dashboard/src/app/(app)` route group; `/login`,
`/change-password` and `/launch` sit outside it.

- [~] App layout and navigation, role-scoped items, top nav not a sidebar. `AppShell` +
      `TopNav` + `AccountMenu`, `navItemsFor(role)` from `lib/access.ts`. Section row of text
      links, active one charcoal with a Warm Red underline; a horizontal scroll strip on mobile,
      no hamburger. Verified live for each role. **Real-device swipe check still to do**
- [~] New-quote count in the nav: the slot and styling are built (`TopNav` `newQuotes` prop, the
      one Warm Red in the chrome). **Wired to 0** until tier 1 realtime lands (section L / M)
- [x] `robots.ts` blocks the dashboard, and every route carries `robots: { index: false }` in
      its metadata plus the `X-Robots-Tag` header from `next.config.ts`
- [ ] `LastUpdated` control ("Updated 2 minutes ago / Refresh"), tier 3, available everywhere
- [ ] Cloudflare cache bypass for the dashboard is infra, tracked in `docs/DEPLOYMENT.md` for
      M6, not built here

## D. Quotes: the product. Test hardest.

`docs/ARCHITECTURE.md` section 4, section 5, section 6. `quotes` and `quote_items` RLS is already written
(`quotes_read_staff`, `quotes_update_own`, `quotes_write_admin`, `quote_items_write_owner`).

### The list

**Built 10 September**, `apps/dashboard/src/app/(app)/quotes/page.tsx`, `lib/quotes.ts`,
`components/quote-filters.tsx`, `components/quote-results.tsx`. Verified against the running
server with real sessions per role, and unit plus integration tested (`lib/__tests__/quotes.test.ts`,
`lib/quotes.integration.test.ts`, `components/__tests__/quote-filters.test.tsx`).

- [x] `/dashboard/quotes`: full cards on mobile (D38, each row is a decision), table on desktop
- [x] Filters that actually change the result set and its count: status, owner, source built and
      verified live (`?owner=unassigned`, `?status=quoted`, `?search=` all narrow correctly).
      Paginated, eight a page. **`age` not built yet**, left for a later pass
- [x] Mobile FAB: charcoal labelled New quote, stays on screen while the list scrolls. `NewQuoteFab`
- [x] The unassigned queue: web quotes arrive `created_by` null and `assigned_to` null. `owner=unassigned`
- [x] Per-agent view vs admin assignment, per Brown 4 September: built to the literal spec,
      `beco_sales` gets "Assigned to me" / "I'm preparing" (`created_by = me`, `assigned_to`
      null) / "Unassigned"; admins additionally get "Everyone". **"I'm preparing"'s exact
      meaning is still unconfirmed with Brown**: no current insert path produces
      `created_by` set without `assigned_to`, so this is forward compatible rather than
      exercised by real data yet
- [ ] Realtime: a new row shows a **banner, never an insertion** (D46). Deferred to section L,
      unchanged
- [x] Expired-quote presentation per 0.2: a muted "Expired" badge from `isExpired()`, Nairobi
      date boundary, string compared so there is no Date/timezone parsing ambiguity. Re-issue
      on an expired open quote stamps a fresh `valid_until` (`reissue_quote`)

### The detail

**Mutations built 17 September** on `m5-quotes`. Handoff:
`docs/milestones/M5-QUOTES-HANDOVER.md`. Do not reopen this section for the
products editor.

- [x] `/dashboard/quotes/[reference]`: customer, project, line items with the discount struck
      through, status, owner, approval, Dates rail. Verified live: a discounted quote, an
      unpriced one, and an unknown reference (real 404). **Not built:** the audit trail inline
- [x] **Optimistic locking**: every mutation RPC compares `updated_at`, refuses a stale write
      with "this quote changed while you were editing". `15` and `16` pgTAP cover the race
- [x] Claim: `beco_sales` sets `assigned_to = self` on an unassigned quote (`claim_quote`)
- [x] Assign: admin only, select change assigns immediately, Beco sales and Beco admin, never
      `brightex_admin` (`assign_quote`, migration 34)
- [x] Add several catalogue products from a dialog: `add_catalogue_quote_lines` under one lock.
      Search focused, list on open, multi-select, unpublished products refuse the whole batch.
      Range select lists empty folders, not only stone
- [x] Add a line item not in the catalogue: `add_custom_quote_line`, `product_id` null plus a
      description snapshot
- [x] One Save on the Line items heading writes every dirty line through `update_quote_lines`.
      Unsaved pill and Changed mark. View / Download / Email flush dirty lines first
- [x] Price override, D7: any `beco_sales` sets any `unit_price`. `list_price` is stored beside
      it. Every override writes `audit_log` with before and after (the `quotes` trigger already
      covers it via `requires_approval`/`approved_by`/`approved_at`)
- [x] **Revised by D86, 10 September:** a quote that deviates from the catalogue (a discount, a
      markup, or a priced custom line) needs `is_admin()` approval before it can reach
      `quoted`/`won`/`lost`. List and detail show Needs approval. Approve is an admin action
- [ ] Deleted product on a line: a graceful state, not a crash (`docs/REVIEW.md` 2.8).
      `product_id` goes null on delete, the `description` and prices are snapshots and survive.
      Falls out of the products editor (section G) more than quotes
- [x] Status lifecycle new to reviewing to quoted to won or lost. Won stamps `finalized_at`.
      Lost requires `lost_reason` and goes through `ConfirmDialog` ("Mark lost", the verb).
      A lost quote can be reopened to reviewing (`reopen_quote`) if the client comes back. Won cannot
- [x] Totals: `subtotal`, `vat_amount`, `total_amount` computed by **backing 16% out of the
      VAT-inclusive line totals** per D50, never adding it on top. `@beco/validation` `splitVatInclusive`,
      property-tested against the D50 worked example (65,000 slab to 8,965.52 VAT inside, not
      10,400 on top)
- [x] Unpriced and mixed quotes per 0.3: Pricing on application, never `KES 0.00`

### The counter flow

`docs/ARCHITECTURE.md` section 5. Speed matters more than polish. Someone is waiting.

- [x] `/dashboard/quotes/new`: Add from catalogue opens a dialog; search is focused on open
- [x] After adding, the dialog can be opened again. Search clears on close
- [x] `QuantityStepper`: steps by half a slab for a `per slab` line, by one for everything else
- [x] Inline price override on the line
- [x] One transaction on save: `create_counter_quote` (`source` `walk_in` or `phone`, `created_by` and
      `assigned_to` both the salesperson) plus `quote_items`. Refuses `web`
- [ ] **12-tap budget**, `docs/ARCHITECTURE.md` section 5 and the build plan: dashboard home to a sent
      PDF for three products, 12 taps and 3 typed fields. Counted out loud on a real phone before
      the milestone closes. Over 12 and the milestone does not close. Treated as a design target
      that forces the flow to be good, renegotiated only against a real device (`docs/REVIEW.md`
      1.4), never waved through
- [x] Tests: every step asserts the data changed. The crafted-request cases from `submit_quote`
      carry over: a counter caller cannot smuggle its own line price past the override audit

## E. Quote document: PDF and send

`quote-document` skill. Built 17 September on `m5-quotes`.

- [x] Quote PDF: logo, restrained brand colour, Titillium and Cormorant embedded, tabular
      lines, subtotal, **VAT as its own line, backed out per D50**, total, reference, validity
      from `quote_validity_days`, bank or till details and footer from `settings`. From block
      is **Beco Interiors Limited**
- [x] Page breaks pinned by test on a 15-line quote. A line split across a page is
      worse than no PDF
- [x] Unpriced document variant per 0.3
- [x] Download writes a `documents` row. Preview does not, so opening View is not a send
- [x] Preview in the dashboard before sending. Download. Email to the stored address or one
      typed at send time. WhatsApp is "download then send": `quoteWhatsAppLink` exists in tests
      but is not on the panel
- [x] Customer email template: short, plain, no marketing voice, no em dashes, in
      `@beco/documents`. **Manual Gmail and Outlook check still to do**
- [ ] Receipt PDF and template: **with orders**, recorded in `docs/PLAN.md` (Brown reversed the
      original cut on 17 September)
- [ ] If this introduces a server-side Resend key or the service role key in the dashboard,
      the CI secret scan and the bundle scan must stay green (rule 7)

## F. Stock

**0.1 resolved: option B**, quantity tracked, adjusted by hand, half unit granularity for slabs.

Landed on the catalogue editor (`/products`), not a separate `/stock` screen. See D89.

- [x] Migration: `products.stock_quantity numeric(12,2)` and `low_stock_threshold numeric(12,2)`,
      with RLS and pgTAP in the same migration (`supabase-migration` skill). Half unit
      granularity for `unit = 'per slab'`, whole elsewhere, the D68 split. A `check` that
      `stock_quantity >= 0`. Migration 39, tests in `20_product_stock.test.sql`
- [x] Quantity and threshold inline on the products sheet (D38 scanning table). Every change
      audited (the existing `products` audit trigger)
- [x] The director's stat card names rows at or below threshold (`dashboard_summary.catalogue.low_stock`)
- [x] Storefront availability reflects it: the card reads `stock_quantity` once it hits 0,
      otherwise shows `availability`. A stock write POSTs storefront `/api/revalidate`
- [x] Automatic decrement on order status change: **deferred**, not built in M5, per the 0.1
      decision. Recorded in `docs/PLAN.md` Deferred with the reason (no reservation model has
      been operated yet, and a wrong decrement is worse than a manual count)
- [x] pgTAP: `beco_product_manager` and admins write stock, `beco_sales` and anon cannot; the
      quantity cannot go negative; the half unit constraint holds for slabs

## G. Products editor

D54: from M5 the editor becomes the ongoing way to change prices and specs. Migrations 15 and 20
stay as the historical seed. Stock lives here too (D89). `/stock` redirects to `/products`.

- [x] `/dashboard/products`: list, then an editor for price, `compare_at_price`, `specs`,
      `description`, `short_description`, SEO overrides (`meta_title`, `meta_description`),
      `availability`, `badge`, `is_published`, `sort_order`, plus `stock_quantity` and
      `low_stock_threshold`
- [x] Soft delete via `ConfirmDialog` naming the product and stating that quotes which already
      include it keep their line and their price (`docs/COMPONENTS.md` has the exact copy)
- [x] Rename records the old slug for a 301 (`product_slugs`; verified from an editor write in
      the integration test). Storefront `/product/[slug]` 301s a former slug
- [x] Every write triggers storefront `revalidateTag('product:x')` and `revalidateTag('category:y')`
      via `POST /api/revalidate`. Mechanism in `docs/ARCHITECTURE.md` section 3
- [x] Audit logging on every field change (trigger exists on `products`)
- [x] Mobile: informative cards plus detail sheet. No horizontal table scroll
- [x] Tests: `beco_product_manager` and admins write, `beco_sales` and `beco_editor` cannot,
      anon cannot; a POA product still cannot carry a price and a fixed one must (schema plus
      editor path); SEO override is written to `meta_title` which `generateMetadata` already reads
- [x] New product: charcoal labelled FAB on desktop and on a phone, `?new=1`. Inserts an
      unpublished draft (name, slug, range, unit, price), then opens the editor. Verified live
- [x] Photographs in the editor: upload JPEG, PNG or WebP, role, alt, reorder, remove via
      `ConfirmDialog`. Sharp writes 400/800/1600 webp plus blur to R2. Separate locked actions
      so they do not fight the product save. Needs the R2 keys locally

## H. Dashboard home: the six stat cards

D37, `files/BUILD-PLAN.md` section 11.1, A10. **Every card states a number, what it is measured
against, and what it implies.** A number with no comparison is decoration.

- [x] `StatCard` in `@beco/ui`: value, comparison, implication. `component` skill
- [x] Quotes awaiting response, with the age of the oldest, red past `quote_response_sla_hours`
      (per 0.4). Warm Red only when the SLA is actually breached
- [x] Quotes won this month, count and value, against last month
- [x] Quote to won conversion rate, against last month
- [x] Invoiced against collected, this month. Two figures, kept honestly separate per D8
- [x] Leads today: quote submissions plus `whatsapp_click` plus `call_click` from
      `analytics_events`. The only view that counts the leads that left into WhatsApp
- [~] Catalogue card counts published / unavailable / POA / draft, and low-stock from
      `stock_quantity`
- [x] **All date boundaries computed in `Africa/Nairobi` explicitly** (`docs/REVIEW.md` 1.6),
      inside `dashboard_summary()`. pgTAP in `13_dashboard_summary.test.sql`
- [ ] Charts only where a shape answers what a number cannot: quotes and revenue over time,
      salesperson comparison. Nothing else gets one. Never "four sparkline tiles over a table"

## I. Reports

Per 0.7 item 2: leaderboard and conversion report in, deeper reporting deferred.
`beco_admin` and `brightex_admin` only. `/reports` is the screen. `/leaderboard`
already sits in `ROUTE_RULES`; redirect it here. No sparkline tiles. No FAB.

- [x] `salesperson_leaderboard()` SECURITY INVOKER, Africa/Nairobi month like
      `dashboard_summary()`. Per person: quotes raised (`created_by`), won count
      and won value (owner `coalesce(assigned_to, created_by)`, dated by
      `finalized_at`), conversion won / (won + lost). Orders closed via
      `salesperson_id` stay available to the function, not a side spreadsheet
- [x] Conversion report from `analytics_events`: product_view, add_to_cart,
      quote_submitted, plus whatsapp_click and call_click, per product and per
      category. Rates null when the denominator is zero. Metadata keys
      `product_id` / `product_slug` / `category_id` / `category_slug`
- [x] Nairobi boundaries on both reports. Period: this month, last month,
      or Custom with start and end dates, one select on the Reports heading
      row, to the right of the title. Custom is `?period=custom&from=&to=`
- [x] `/reports`: heading Reports, no lede. Period and View PDF on the
      title row. Compact StatCards, 2 by 2 on a phone, four across from `lg`, for invoiced,
      collected, won and conversion. Tabs for Sales, Products and
      Categories. Bars plus `DataTable` on desktop, cards on a phone.
      View PDF opens the sales review first. Review in the dialog is
      View PDF opens the sales review first. Review in the dialog is
      Overall or one salesperson. Download is `?download=1`.
      Not stored in `documents`.
- [x] Invoiced (confirmed or fulfilled) and collected (`payment_status = paid`)
      as two figures, D8. Same Nairobi month as the leaderboard
- [x] Custom date range on `/reports`. Trends stay **deferred**, recorded
      in `docs/PLAN.md`. Brown asked for a sales-review PDF download, which
      shipped on `/reports`.
- [x] Tests: pgTAP for the functions and the admin-only read; Vitest for the
      list render, empty state, period filter, and the rate maths. Sales cannot
      load `/reports`

## J. Announcements admin

D36. The storefront already renders the live one and gates the window by RLS.
Authoring UI is `beco_admin` (`irene.kariuki@beco.co.ke`). `brightex_admin`
may also load the route (existing access map). Writes use `announcements_write`
(`is_admin()`). Audit trigger already on the table.

Written 18 September before coding. List/FAB pattern. Cards on a phone.
Preview in the sheet, do not restyle the storefront bar.

- [x] `/announcements`: heading Announcements, no lede. Charcoal FAB New
      announcement. Filters from `lg` on one row (search, type, window)
- [x] Desktop `DataTable`: Title, Type, Window, Priority, Status, Actions
      (icon plus Edit). Phone: cards, the card is Edit
- [x] Sheet `FormSection`s: copy, schedule, call to action, preview of the
      charcoal (or clearance) bar line. Create and edit title, body, type,
      CTA label and URL, `starts_at`, `ends_at`, `priority`, `is_active`
- [x] Dates are Nairobi. `ends_at > starts_at` stays the database check
- [x] Writes bust the storefront layout so the bar updates
- [x] pgTAP: anon sees only live rows inside the window; a row that starts
      tomorrow is absent from anon today and visible once its window includes
      `now()`; sales and product manager cannot write; admin can; write is
      audited
- [x] Vitest: list, filters, cards vs table, sheet preview, actions,
      validation. Integration against local Postgres. QA inventory

## V. Settings

`beco_admin` (`irene.kariuki@beco.co.ke`) and `brightex_admin`. Proxy and
`requirePath` already gate `/settings`. `settings_write_admin` (`is_admin()`)
is the authority. Do not invent a second table. No FAB. Launch date stays
on `/launch`. Do not restyle PDFs or the storefront.

Written 18 September before coding, from handover section 8.

Authoring keys: `vat_rate`, `quote_validity_days`, `bank_details`,
`till_number`, `paybill_number`, `paybill_account`, `send_money_number`,
`notification_recipients`, `whatsapp_number`, `quote_footer`,
`brightex_allowed_emails`. Also the keys already in the table that documents
and the home cards already read: `payment_terms`, `business_phone`,
`quote_response_sla_hours`. Leave VAT on installation and delivery deferred
(D50 is products only).

- [x] Heading Settings, no lede. FormSections. Save writes the rows.
      Link to `/launch` for the anniversary date (Brightex only on the
      title row). No FAB. URL-backed tabs
- [x] VAT stored as a fraction, shown as a percent. Validity days integer.
      WhatsApp digits. Email lists one address per line
- [x] `notification_recipients` seeded if missing. Bank, till, paybill,
      send money, footer, allowlist stay off `settings_read_public`
- [x] Writes that affect documents or the storefront revalidate the right
      paths. Next PDF still reads settings live. Do not restyle PDFs
- [x] Brightex-only Permissions section: assign `can_write_blog` and
      `can_read_audit` on a named user, behind ConfirmDialog with the verb.
      Irene does not see it. Aisha and Sam cannot load `/settings`
- [x] Self-service cannot flip those grants. RLS plus the staff guard.
      Studio write is Brightex-only (migration 48); audit read stays
      grantable
- [x] pgTAP: sales cannot write settings; admin can; anon cannot read
      bank or the allowlist; product manager cannot grant blog or audit
- [x] Vitest: form, Save, launch link, grant ConfirmDialog, actions,
      validation. Integration against local Postgres. QA inventory
- [x] Dashboard appearance toggle (`html.dark`, `beco-dashboard-theme`).
      Storefront never sets `.dark`

## W. Blog authoring

Brightex's job. Route `/studio/blog`. Gemini drafts, a person publishes.
`GEMINI_API_KEY` is server side on the dashboard, never a `NEXT_PUBLIC_`
variable. Author is a person, never "AI". Validator rejects em dashes and
banned phrases. Preview uses the live article layout, do not restyle the
storefront. Cover images: same Sharp pipeline as products, R2, never
hotlinked. Alt required before publish.

Default access: `brightex_admin` on the allowlist. Studio is not grantable.

- [x] List: heading Blog, no lede. Charcoal FAB New article. Filters from
      `lg` on one row (search, status). Desktop `DataTable`, cards on a
      phone. Actions is icon plus Edit
- [x] Editor: work column plus inspector. Generate with sparkles
      icon. Markdown toolbar. Live preview centered. Breadcrumb uses the
      title, never the uuid
- [x] Draft save, Publish (needs cover alt), Unpublish. `published_at`
      stamped. Prompt and model stored. Storefront `/blog` and the slug
      revalidated
- [x] pgTAP: anon sees only published; sales cannot write; Brightex can;
      a salesperson with the flag cannot write Studio; an ungranted
      editor cannot; publish without alt refused
- [x] Vitest and integration. QA inventory. No Playwright

## X. Audit log viewer

Was deferred as `/dashboard/audit`. Brown asked for it with settings.
Read-only list at `/audit`. Default access: `brightex_admin`. A granted
user (`can_read_audit`) may also load it. `audit_read` RLS is the
authority. `beco_admin` loses the default read. No FAB. No writes.

- [x] Heading Audit, no lede. Filters from `lg` on one row (search,
      entity, action). Desktop table, cards on a phone. Actions is icon
      plus View. Sheet shows labelled before / after. Close uses the x icon
- [x] pgTAP: anon cannot read; sales cannot; Irene cannot unless granted;
      Brightex can; a granted sales row can
- [x] Vitest. QA inventory

## K. Orders

`docs/ARCHITECTURE.md` section 6, section 7. `orders` and `order_items` RLS already written.
Nav item exists. `beco_sales` and admins. Product manager does not. **No blank New
order FAB**: conversion is from a won quote. Realtime is section L, do not block
this screen on it. Stock does not auto-decrement (D89).

Written 18 September before coding, from the handover section 7 and the locked
Brown list.

### Schema and RPCs

- [x] `convert_quote_to_order(p_quote_id, p_expected_updated_at)` security
      definer, same shape as `submit_quote`. Atomic. Quote must be `won`.
      Line prices copied unchanged onto `order_items`. Stamps `finalized_at`
      and `converted_order_id`. `salesperson_id` is the quote owner
      (`coalesce(assigned_to, created_by)`). `created_by` is the converter.
      `source`, customer, fulfilment and totals carried. Returns the order
      reference. Unique `quote_id` on orders so a quote cannot convert twice
- [x] Sales converts own only. Admin converts any won quote. Product manager,
      editor and anon cannot execute
- [x] `set_order_status`: pending to confirmed to fulfilled, or cancelled.
      No backwards. Cancelled is a dead end. Sales own only. Optimistic lock
- [x] `mark_order_paid`: stamps `payment_status = paid` and `paid_at` together.
      Refuses cancelled and already paid. Constraint
      `orders_paid_at_matches_status` still the backstop
- [x] `confirmed_at`, `fulfilled_at`, `cancelled_at` stamps. `touch_updated_at`
      on orders. No stock write from any of these

### List `/orders`

- [x] Heading Orders, no lede. No FAB
- [x] `DataTable` on desktop, cards on a phone. Never cards on desktop. Never
      a phone table that scrolls sideways
- [x] Filters from `lg`: search plus Status, Payment, Source on one row.
      Phone: search full width, selects under it. No Search label, placeholder
      plus aria-label. URL is the source of truth
- [x] Columns: Order, Customer, Status, Payment, Owner, Source, Raised, Value,
      Actions. Source `web` labelled Website. Actions is icon plus View
- [x] Card is the View link. Paginate. Empty state. Skeleton matches the shape

### Detail `/orders/[reference]`

- [x] Copy quote detail: heading with reference and View (receipt) top right
      once paid. Work column is read-only lines. Inspector: Actions, customer,
      ownership, dates, source quote link
- [x] Status actions: Confirm, Fulfil. Cancel behind `ConfirmDialog` named for
      the order, confirm verb Cancel order
- [x] Mark paid behind `ConfirmDialog` named for the order, confirm verb Mark
      paid. Does not decrement stock
- [x] Sheets / inspector groups use `FormSection`. No lucide. No
      `window.confirm`

### Convert from a won quote

- [x] Convert to order on quote detail when `status = won` and
      `converted_order_id` is null. `ConfirmDialog`, confirm verb Convert to
      order. Lands on the new order. Already converted: View order link.
      Minimum quote-surface change. Do not restyle quotes

### Receipt

- [x] Receipt PDF in `@beco/documents`, same renderer as the quote, kind
      receipt. From block Beco Interiors Limited. VAT backed out per D50.
      Page breaks pinned on 15 lines. Email template, plain text fallback.
      Persist a `documents` row (`type = receipt`, `order_id`) on download
      and on send. Email when paid if an address exists; failure does not
      un-pay the order. Payments stay offline

### Tests and docs

- [x] pgTAP: conversion copies every line price; second convert refused;
      sales converts own only; mark-paid writes `paid_at`; paid with no
      `paid_at` still refused; status transitions; anon and product manager
      cannot execute
- [x] Vitest: list, filters, cards vs table, detail actions, ConfirmDialog
      verbs, PDF route, email builder, server actions, integration against
      local Postgres. No Playwright
- [x] `docs/QA-CHECKLIST.md` interaction inventory. `docs/TEST-COVERAGE.md`.
      `docs/SCHEMA.md` for the new stamps and RPCs
- [x] Realtime banner: **not this screen**. Section L. Do not insert rows
      silently either

## L. Live updates

`docs/ARCHITECTURE.md` section 17. Three tiers. "Realtime everywhere" is the expensive wrong answer.

- [ ] Tier 1, Supabase Realtime, `quotes` and `orders` only: quotes list, the unassigned queue,
      quote detail while open, the nav new-quote count, orders and payment status. RLS is
      enforced on the stream, so a `beco_sales` receives only events for rows it could already
      read: verify, do not assume
- [ ] **A new row never inserts itself into a list someone is touching.** Banner, not insertion
- [ ] Disconnect when the tab is hidden. Reconnect with backoff, and on reconnect do one
      refetch because events during the gap are lost. Degrade silently: if the socket fails,
      tiers 2 and 3 still work
- [ ] Tier 2, revalidate on focus: stock, products, reports
- [ ] Tier 3, explicit refresh, everywhere, via `LastUpdated`
- [ ] `LiveUpdateBanner` in `@beco/ui`, `component` skill

## M. `@beco/ui` additions

Per rule 5, each gets the `component` skill treatment: test, accessibility baseline, proof the
controls work. `docs/COMPONENTS.md` lists these as planned.

- [x] `DataTable` (desktop table; the per-table mobile treatment lives in the call sites, D38)
- [x] `StatCard`
- [x] `StatusPill` (quote and order lifecycle states)
- [ ] `LiveUpdateBanner`
- [ ] `LastUpdated`
- [ ] `AuditEntry` (before and after, readable by a human; used inline on quote and order detail
      even though the standalone audit viewer is deferred per 0.7)
- [x] `toast()` (replaces `window.alert`, announced to screen readers)
- [x] `Dialog` (plain elements, jsdom-testable). Sheet is built for D38
      detail sheets. Do not swap Dialog for Radix to "be more shadcn" (D88)
- [x] `DropdownMenu` (Radix via D88, restyled). Reference for new dashboard
      menus. AccountMenu stays plain (jsdom). Popover and Tabs next when a
      screen needs them
- [x] `Panel`, `Pagination`, `Fab`, `Skeleton` / `SkeletonScreen`, `BackLink`
- [x] `QuantityStepper` (the 12-tap budget depends on it; half-slab aware per D68)
- [x] `EmptyState`. `ErrorState` still planned
- [~] `docs/COMPONENTS.md` updated to **B** as each lands. Quotes widgets are **B**

## N. Mobile

Rule "everything works on a phone" is a hard requirement, not a courtesy (PRD section 4.2, section 5).

- [x] Quotes become full cards on mobile (D38). Orders match: cards on a
      phone, `DataTable` on desktop
- [x] Products are cards on a phone with a tap-through detail sheet, and
      keep the `DataTable` on desktop. Users and (deferred viewer aside)
      audit still to do
- [ ] Action buttons never sit under the on-screen keyboard (PRD section 5)
- [ ] Sorting, filtering and inline edit survive on mobile in both treatments
- [ ] 16px type floor holds on every dashboard screen (`pnpm check:type-floor`)
- [ ] Never a desktop table with a horizontal scrollbar

## O. Security, rule 7

- [ ] RLS on every new table and RPC, deny by default, tested for anon and each role
      individually, proving the negative (`rls-policy` skill, pgTAP)
- [ ] Role checks in two places: Postgres RLS and the proxy. Never a client-side check alone
- [ ] All input validated server-side with zod. Client validation is UX only
- [ ] Rate limiting on any new public write endpoint (`createRateLimiter`, D81)
- [ ] Audit logging goes in as each feature is built, never a catch-up pass
- [ ] Soft delete anything with commercial meaning (products; quotes and orders already have
      `deleted_at`)
- [ ] Service role key stays server-only. If M5 needs it (PDF, email, the convert RPC runs as
      `security definer` so it may not), the CI secret scan and bundle scan stay green
- [ ] `docs/SECURITY.md` updated for the new surfaces

## P. SEO

The dashboard is `noindex` and robots-blocked; no public routes are added in M5. The only
storefront-facing SEO work is indirect: the product editor's `meta_title` and `meta_description`
overrides must reach storefront metadata, and stock and announcement changes must trigger
`revalidateTag`. `seo-checklist` gates public pages only, so it does not apply to a dashboard
screen. Verify the editor override path against a live storefront render at milestone close.

## Q. Testing, rule 2

`docs/TEST-COVERAGE.md` is the ledger. Update it as each piece lands.

- [ ] Unit: the VAT backing-out helper (property tests against D50), quote and order totals,
      discount maths, the age and SLA calculation, the `Africa/Nairobi` report boundaries,
      any new zod schema, the half-slab stepper maths
- [ ] Component: every control proven to perform its operation (rule 3), the mobile card
      fallback, the price override input, the counter wizard steps, empty, loading and error
      states, `ConfirmDialog` on every destructive action
- [ ] Integration against local Supabase: every server action, query helper and RPC, failure
      paths included. Stale `updated_at`, duplicate reference, missing product, deleted product
      on a line, email send failure, PDF render failure, a quote converted twice, a crafted
      counter request
- [ ] pgTAP: every new policy and role, plus the existing ones re-attacked from the new write
      paths (the `rls-policy` skill's Codex-style adversarial pass)
- [ ] `vitest-axe` on every rendered dashboard component, per the `component` baseline
- [ ] PDF snapshot (page breaks on 15 lines). Email snapshot plus one manual Gmail and Outlook
      pass
- [ ] The dashboard gets its own Vitest project already (`--project dashboard`); keep new tests
      in it and ensure CI runs it (it does, since the M4 Codex fix)

## R. QA checklist and interaction inventory, rule 3 and D35

- [ ] Add a **Dashboard** section to `docs/QA-CHECKLIST.md`: every button, link, form, toggle,
      filter and menu item, per screen, what it does, and how that was confirmed. Confirmed
      means observed: the row changed, the email arrived, the PDF rendered and a `documents`
      row was written, the right destination loaded, the result set and its count changed, the
      change survived a refresh, WhatsApp opened prefilled, the dialler had the right number
- [ ] **Item one of the Dashboard section: the 12-tap count**, written down after counting on a
      real phone
- [ ] Walk the whole Dashboard section on a real phone before close. Log in as a salesperson,
      raise a quote for three products for a waiting customer, issue the PDF, convert to an
      order, mark it paid. Then log in as each other role and confirm the screens and figures
      differ correctly

## S. Documentation

- [ ] `docs/STATUS.md` M5 row and headline numbers
- [ ] `docs/COMPONENTS.md`: dashboard components to **B**
- [ ] `docs/DECISIONS.md`: new D-numbers for the stock model (0.1), quote expiry (0.2),
      unpriced totals (0.3), the SLA setting (0.4), the convert RPC (0.9), and anything
      discovered during the build
- [ ] `docs/ARCHITECTURE.md`: update any flow that changes (the convert path, optimistic
      locking enforcement, cross-app revalidation)
- [ ] `docs/TEST-COVERAGE.md`: every new file and what it proves
- [ ] `docs/PLAN.md` Deferred table: receipt PDF, audit log viewer, `/dashboard/imports`,
      automatic stock decrement, and anything else cut, each with a reason and a revisit note
- [ ] This file walked and ticked against reality at close, not against memory

## T. Definition of done, per CLAUDE.md rule 8

- [ ] Every item above verified against reality
- [ ] Its tests pass: Vitest across all projects, pgTAP, typecheck, both apps build
- [ ] Its RLS policies are tested, for anon and each role, proving the negative
- [ ] The interaction inventory for every dashboard screen is complete in `docs/QA-CHECKLIST.md`
- [ ] The QA checklist has been walked on a real phone, including the 12-tap count
- [ ] Codex's review pass has run on committed state and its findings are resolved or explicitly
      deferred
- [ ] Documentation is written
- [ ] Anything cut is in `docs/PLAN.md` as explicitly deferred with a reason, never silently
      dropped

## U. Codex M5 review

Per CLAUDE.md "The two agents". Runs at milestone close, on committed state, never concurrently.
Runs the suite, reviews the diff against this list, adds the adversarial layer: breaks every new
RLS policy from every role, hunts the neglected failure paths, property-tests the VAT and
discount maths, boundary-tests the half-slab rounding and the Nairobi report windows, and walks
the QA checklist against a running dev server. Its findings become todos here, not a separate
backlog.

- [ ] Pass run
- [ ] Findings recorded here and resolved or deferred
