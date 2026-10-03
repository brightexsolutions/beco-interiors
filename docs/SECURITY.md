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
| `searchCatalogue`, `searchCustomers` | `requirePath('/quotes')` | filter characters stripped, **now capped at 80 and 60 characters** | by the session |

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

