# Dashboard

M5 builds this out. Today it carries one real surface: the anniversary launch control, D80.

## Routes

- `/login` password sign in against Supabase Auth
- `/launch` set the countdown date and throw the launch switch. Gated by `requireAdmin`
  (`beco_admin` or `brightex_admin`), with RLS on `settings` as the real backstop

## Running the launch control locally

`supabase start` must be running, then create an admin to sign in as. There is no seeded
account on purpose: a known password in a committed file would also reach staging.

1. Open Studio at http://127.0.0.1:54323, Authentication, Add user, e.g. `admin@beco.local`
   with any password. Copy the new user's id.
2. In the SQL editor:

   ```sql
   insert into users (id, email, full_name, role, is_active)
   values ('<the-user-id>', 'admin@beco.local', 'Local Admin', 'beco_admin', true);
   ```

3. `pnpm --filter @beco/dashboard dev`, sign in at `/login`, set a date and try the switch.
   The storefront reads `site_launch_at` and `site_launch_live` from `settings` on its next
   load.
