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
