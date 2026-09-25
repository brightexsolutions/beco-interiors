# RUNBOOK

Operational procedures, written as the milestone that owns each one lands, never in a catch up
pass. See `files/BUILD-PLAN.md` for the intended full contents.

## Dashboard staff accounts

**There is no public signup on any surface.** An account exists only because someone with
`brightex_admin` created it. See `docs/ARCHITECTURE.md` section 11 and D6.

### Local and staging

`supabase/seed.sql` seeds **six fictional staff** for local development and staging: one
`beco_admin`, three `beco_sales`, one `beco_product_manager`, one `brightex_admin`. Every one
starts `must_change_password = true`, so the forced-change flow is exercised on first sign-in,
and every one shares the dev password `beco-dev-pass`. These are fixtures. Staging is seeded
from this file, never cloned from production (rule 6), so the same six exist there; the shared
password is harmless because the first sign-in forces it to be replaced and staging holds no
real data.

`supabase db reset` restores all six to the pristine, still-flagged state.

### Real staging and production

Created **out of band by Brightex** and handed to Beco. They are never written into the repo,
the seed, or a migration.

Until `/dashboard/users` ships (M5 section B), create one with two steps against the target
Supabase project:

1. **Auth user.** Supabase dashboard, Authentication, Add user, "Create new user". Set the
   email and a temporary password. Leave "Auto confirm user" on.
2. **Profile row.** SQL editor:

   ```sql
   insert into users (id, email, full_name, role, is_active, must_change_password, created_by)
   values (
     '<the auth user id from step 1>',
     '<same email>',
     '<full name>',
     '<beco_admin | beco_sales | beco_product_manager | beco_editor | brightex_admin>',
     true,
     true,
     '<your own users.id>'
   );
   ```

   `must_change_password = true` is the point: hand over the temporary password by whatever
   channel, and it stops working the moment the person signs in and sets their own.

A `brightex_admin` account also needs its email adding to the `brightex_allowed_emails` array
in `settings` before it can reach Studio (D42), but not before it can use the rest of the
dashboard.

### Resetting a password

No self-service reset, no "forgot password" email (D83, `docs/ARCHITECTURE.md` section 11).
`brightex_admin` reissues one from `/dashboard/users` (M5 section B), which sets a new
temporary password and re-arms `must_change_password`. Until that screen exists, repeat the two
steps above: set a new password on the auth user, then
`update users set must_change_password = true where id = '<id>'`.

### Deactivating someone

`update users set is_active = false where id = '<id>'`. `current_user_role()` returns null for
an inactive account, so RLS falls closed immediately; the proxy clears their session cookie on
their next request. The row is never deleted, so their quote attribution and audit history
stay intact. Reactivate by setting it back to `true`.
