# SECURITY

Written as the milestone that owns each surface lands, never in a catch up pass. See
`files/BUILD-PLAN.md` for the intended full contents and `docs/ARCHITECTURE.md` sections 11 and
12 for the model.

## Dashboard authentication and authorization (M5 section A)

**Two enforcement layers, never the client alone.**

- **Layer 1, the proxy** (`apps/dashboard/src/proxy.ts`). Runs on every dashboard route except
  the login screen and static assets. Verifies the session, that the account is active and has
  a role, that a flagged account only reaches `/change-password`, and that the role permits the
  path. The route/role map is `apps/dashboard/src/lib/access.ts`, read by both the proxy and
  the pages so they cannot drift (D83). Every page also calls `requireUser` / `requireRole` /
  `requirePath`, because a server component and a server action are public endpoints whatever
  gated the render.
- **Layer 2, Postgres RLS.** The authority. Holds even if the proxy is bypassed. Tested per
  table, per role, proving the negative, in `supabase/tests`.

**Accounts.** No public signup. Created only by `brightex_admin` (`users_write_brightex`).
Every account opens with `must_change_password = true`; the forced-change screen sets the new
password through Supabase Auth, then `complete_first_login()` clears the flag. There is no
self-service reset and no "forgot password" flow.

**`users` is not self-editable where it matters.** `users_update_self_safe` lets a user change
their own `full_name` and nothing else: `role`, `is_active`, `email`, `must_change_password`
and `last_login_at` are pinned to their stored value in the policy (migration 26). Those move
only through `users_write_brightex` (an admin) or the two security-definer RPCs
`record_sign_in()` and `complete_first_login()`, which are `execute`-granted to `authenticated`
only, never `anon`.

**Deactivation is immediate.** `current_user_role()` returns null for an inactive account, so
RLS falls closed. The proxy also clears the `sb-*-auth-token` cookies when a live session
resolves to a null role, and the sign-in action signs an inactive account straight back out, so
GoTrue's longer-lived token does not keep a deactivated user in.

**Rate limiting.** The sign-in server action is behind `createRateLimiter` (D81), ten attempts
a minute per address, in front of Supabase Auth's own limiter.

**Audit.** Every sign-in writes a `login` row; the forced-change transition writes an `update`
row via the `users` trigger. `audit_log` takes no direct insert, only the security-definer
trigger and `record_sign_in()`.

**MFA** for admin roles is deferred to the M6 security pass (D83, `docs/PLAN.md`).

## Secrets

The dashboard's server-side environment carries the Supabase anon key only for M5 section A.
The service role key is not needed by the auth flow (the RPCs run `security definer`). The CI
secret scan and bundle scan must stay green as later M5 sections introduce the Resend key and,
if unavoidable, the service role key.

## Review, 3 October 2026 (D108)

A pass over both apps against rule 7, on the committed `dev` branch, with the running stack and
the test suite. What was checked, what was found, what was done.

### Headers

Both apps send an explicit CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src
'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests` in production),
HSTS for a year with subdomains, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a Permissions-Policy that denies camera,
microphone and location, and the dashboard adds `X-Robots-Tag: noindex, nofollow`. `font-src` is
`'self'` because the fonts are self hosted. `tools/backup/src/__tests__/csp.test.ts` holds both
policies to that shape.

**Accepted:** `script-src 'unsafe-inline'`. Next inlines its bootstrap, and a nonce needs every
page rendered dynamically, which the storefront's ISR pages are not. Recorded as the follow up it
has always been, not forgotten.

### Routes and actions

| Surface | Gate | Input | Limit |
|---|---|---|---|
| Dashboard pages and actions | Proxy (layer 1) plus `requirePath`, `requireRole` or `requireAdmin` in every action (layer 2 is RLS) | zod in every action that takes a form | Sign-in, 10 a minute per address; import dispatch, 1 a minute per user |
| `POST /api/ops-alert` (dashboard) | `OPS_ALERT_SECRET`, constant time | zod, bounded | 60 a minute |
| `POST /api/quote-confirmation` (dashboard) | `OPS_ALERT_SECRET`, constant time | zod: a reference shape, a name, one address, a count | 60 a minute |
| `POST /api/revalidate` (storefront) | `REVALIDATE_SECRET`, **now constant time** | typed, **now capped at 100 tags and 100 paths** | by the secret |
| `GET /api/img/*` (both) | none, read only, one bucket | key refused on `..`, a leading slash, **now a backslash too** | CDN cache |
| `GET /api/health` (both) | none, anon key, one row | none | none, it is the uptime probe |
| `submit_quote` (storefront) | public by design | zod, prices recomputed server side | 5 a minute per address (D81) |
| `loadPickerCatalogue` | `requirePath('/quotes')` | takes no input; published, live products only, through the session client so RLS applies; the picker filters on the phone | by the session |
| `searchCustomers` | `requirePath('/quotes')` | filter characters stripped, **now capped at 60 characters**; reads `customer_overview` since D130 | by the session |
| `createCustomer`, `updateCustomer` (D130) | `requirePath('/customers')`, then sales or admin only | `createCustomerSchema` / `updateCustomerSchema`: name, Kenyan phone, email, KRA PIN shape, client type, length caps | by the session |
| `deleteCustomer` (D130) | `requirePath('/customers')`, then `isAdminRole` | the id | by the session |
| `linkQuoteCustomer` (D130) | `requirePath('/quotes')`; the RPC checks owner or admin and the lock | `linkQuoteCustomerSchema` | by the session |
| `removeQuoteLine` (D131) | `requirePath('/quotes')`; `remove_quote_line` checks role, owner or admin, the lock, the quote's state and the last line | `removeQuoteLineSchema`: quote id, line id, lock token | by the session |

### Findings fixed

1. **Open redirect on sign-in.** The `next` return path was accepted when it began with `/`,
   which `//evil.example/steal` does. `safeReturnPath` in `@beco/validation` now refuses the
   protocol-relative and backslash shapes, control characters and anything over 512 characters.
   Both sign-in actions use it; the test covers the exact payload.
2. **Timing-unsafe secret compare.** `/api/revalidate` compared the bearer header with `!==`.
   `bearerMatches` moved from the dashboard into `@beco/validation`, rewritten on Web Crypto so
   the shared package carries no Node builtin, and both server to server routes use it.
3. **Unbounded revalidation.** The route accepted any number of tags and paths. Capped.
4. **Blog cover upload had no size or type guard.** A 400MB file went to sharp before anything
   looked at it. `photoUploadProblem` (12MB, image types, empty type allowed for HEIC phones)
   is one function shared by the product photo and blog cover actions.
5. **Six tables had policies but no test:** `documents`, `testimonials`, `import_runs`,
   `import_issues`, `import_files`, `import_state`. `36_documents_import_rls.test.sql` proves
   each role's negative before its positive, the D42 allowlist included.
6. **Anonymous `analytics_events` insert accepted any row.** Migration 60 bounds it to the
   documented event types and a 2KB payload. `37_analytics_insert_bounds.test.sql`.
7. **Secret scan missed the GitHub token** the dashboard now holds for the import dispatch, and
   the newer Supabase `sb_secret_` key format. Patterns moved into a module with a test and
   widened; `NEXT_PUBLIC_*TOKEN*` is now a leak too.

### Still accepted, with reasons

- **In-memory rate limiter.** Per instance, resets on deploy (D81). The durable layer is a
  Cloudflare rate-limit rule at the edge once DNS moves; until then this is a brake, not a wall.
- **No MFA.** Deferred per D83 and `docs/PLAN.md`. Accounts are created by one admin role, open
  with a forced password change, and have no self-service reset.
- **`'unsafe-inline'` styles and scripts**, above.
- **The storefront `/api/img` route** streams from R2 without auth. It serves only derivatives the
  storefront publishes anyway, the bucket holds nothing else, and at launch the custom image host
  replaces it.

### Verified unchanged

Service role key reaches no client bundle (`check:secrets` and the bundle scan). Every public
table has RLS on (`03_role_separation`). Audit triggers stand on users, categories, products,
quotes, orders, documents, blog posts, announcements, clients and settings. Soft delete on
everything with commercial meaning. No `window.confirm`, `alert` or `prompt` anywhere (lint).

## Finding, 6 October 2026: anyone could insert an order (migration 63)

Migration 6 created `orders_insert_anon` and `order_items_insert_anon` as
`for insert with check (true)` with no role, so any role, the anonymous web visitor
included, could write an order or an order line directly with the public anon key.
The 3 October review (D108) did not catch it. Found during the customers work and
confirmed by a direct anonymous insert against a local stack. Live in production from
the first deploy until migration 63.

Fixed in migration 63, `close_anon_order_insert`: both policies dropped. Nothing
legitimate used them: every order is written by `convert_quote_to_order`, a security
definer function, and admins keep `orders_write_admin`. pgTAP
`39_orders_insert_closed.test.sql` proves anon and a salesperson are refused on both
tables, an admin still writes, and the conversion function stays security definer.

Not yet checked: whether any order rows were inserted this way before the fix. Look
for orders with no `quote_id` and no admin `created_by` on beco-prod.

## Who may do what, by function (D110, 3 October 2026)

Routes are the coarse gate (`lib/access.ts`). Inside a route, these are the functions that
differ by role. Every row is enforced in the action and in Postgres, and the control is not drawn
for a role that cannot use it.

| Function | sales | product manager | beco_admin | brightex_admin |
|---|---|---|---|---|
| Raise, price and issue a quote; claim an unassigned one | own | no | yes | yes |
| **Remove a line from a quote** (D131), not the last one, not on a won, lost or converted quote | own, **after claiming** | no | yes | yes |
| Read what the customer first submitted (`quotes.requested_items`, D131) | yes | no (no quote read, D87) | yes | yes |
| Change what the customer first submitted | no | no | **no** | **no** |
| **Read the customer list and a customer's record** (D130) | yes | **yes, without quote or order figures** | yes | yes |
| Add a customer, edit a customer's details | yes | no | yes | yes |
| Link or change the customer on a quote | own | no | yes | yes |
| **Soft delete a customer** | **no** | no | yes | yes |
| Mark a quote quoted, won or lost; reopen | own | no | yes | yes |
| Reassign a quote to someone else | no | no | yes | yes |
| Approve a price away from the catalogue | no | no | yes | yes |
| Convert a won quote; confirm, fulfil, record payment | own | no | yes | yes |
| **Cancel an order** | **no** | no | yes | yes |
| Edit products, ranges, photographs | no | yes | yes | yes |
| Sign a direct photograph upload (D116): products area | no | yes | yes | yes |
| Sign a direct photograph upload: team photo, blog cover | no | no | team yes, blog if granted | yes |
| **Open the Drive import, start one on staging or production** | no | **no** | **no** | yes |
| Announcements, reports, the leaderboard | no | no | yes | yes |
| Business identity, KRA, payment details, notifications | no | no | yes | yes |
| **The Brightex allowlist** (D42) | no | no | **no** | yes |
| Staff accounts: create, role, deactivate, reset | no | no | no | yes |
| Grant blog or audit access to a Beco user | no | no | no | yes |
| Audit log | no | no | if granted | yes |
| Studio blog | no | no | if granted | yes |
| Anniversary launch switch | no | no | no | yes |

"own" means the quotes and orders assigned to that salesperson; the database functions check
`assigned_to` or `salesperson_id` against `auth.uid()` and the admin bypass is `is_admin()`.
Tested in `21_convert_quote_to_order.test.sql` (cancel), `10_quote_pricing_approval.test.sql`
(approve), `12_quote_claim_assign.test.sql` (assign), `41_remove_quote_line.test.sql` (remove a
line, the customer's request, line audit) and the action tests named in
`docs/TEST-COVERAGE.md`.

## Finding, 7 October 2026: a deactivated account passed the quote functions' role guard (migration 66)

Found while testing `remove_quote_line` (D131). `current_user_role()` is null for an account
with `is_active = false`, so `is_admin()` returned null as well, and every quote and order
function opens with `if current_user_role() is distinct from 'beco_sales' and not is_admin()`.
`not null` is null and IF treats null as false, so the guard waved the account through; the
owner check after it (`not is_admin() and v_assigned is distinct from v_uid`) failed the same
way. A salesperson deactivated while their token was still valid could therefore still edit,
claim, reopen, convert or cancel through a direct RPC call, which never meets the proxy that
signs them out (D83). The admin-only cancel in `set_order_status` (D110) had the same hole.

Fixed in one place: `is_admin()` now returns `coalesce(..., false)`. Every policy that reads it
uses it positively (`using (is_admin())`, `is_admin() or ...`), where false and null both deny,
so nothing previously refused became allowed. Proven by `42_is_admin_never_null.test.sql`
(the function for anon, a deactivated, an active sales and an admin account; two quote
functions refusing a deactivated owner) and by the full pgTAP suite passing unchanged.


## Customers, 6 October 2026 (D130)

The `customers` table holds names, phone numbers, KRA PINs and staff notes, so it is closed by
default and opened role by role, each proven in `40_customers.test.sql` (85 assertions):

| Who | Read | Create | Edit | Soft delete | Hard delete |
|---|---|---|---|---|---|
| anon | no (no grant, `42501`) | only through `submit_quote` | no | no | no |
| `beco_sales` | live rows | as themselves | live rows, not `deleted_at`, not `created_by` | no (`42501`) | no |
| `beco_product_manager` | live rows, the overview without counts or spend | no | no (zero rows) | no | no |
| `beco_editor` | nothing | no | no | no | no |
| inactive account | nothing | no | no | no | no |
| `beco_admin`, `brightex_admin` | live and soft deleted | as themselves | yes, not `created_by` | yes | no |

**Through the public RPC.** `submit_quote` calls `customer_for_phone`, which links to the record
with that phone key or creates one and never updates an existing record, so an anonymous visitor
who types a known number cannot rename or re-email that client. The test proves a submission
from a known number with another name, email and company leaves the record as it was, and
creates no second record. What an anonymous caller *can* still do is attach a new web quote to
an existing client's history by using their number, which was already true of the inferred
history before D130 and is visible on the quote as a web submission.

`customer_for_phone` and `backfill_customers` are granted to nobody; anon is tested to be refused
both. `link_quote_customer` follows every quote mutation: owner or admin, under the lock.

**Resolved.** `orders_insert_anon` (migration 6) let any role, anon included, insert an
`orders` row directly. Migration 63 dropped it and its `order_items` twin, with its own test
file; see "Finding, 6 October 2026" above. A direct order carrying a `customer_id` is refused
with every other direct insert, and `40_customers.test.sql` still asserts it for anon.
