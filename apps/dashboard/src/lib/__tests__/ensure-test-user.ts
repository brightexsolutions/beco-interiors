import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@beco/types';

type Role = Database['public']['Enums']['user_role'];

/**
 * A signed in test user that survives a rerun of the integration suite.
 *
 * A fixture user cannot always be deleted: once a test has written a quote or
 * an order, `audit_log` points at the user, and that trail is never rewritten
 * to make cleanup easier. So the user is reused when it already exists, its
 * password reset and its profile restored, instead of failing the next run on
 * "a user with this email address already exists".
 */
export async function ensureTestUser(
  sb: SupabaseClient<Database>,
  user: { email: string; password: string; fullName: string; role: Role },
): Promise<string> {
  const created = await sb.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  let id = created.data.user?.id;
  if (!id) {
    const { data: listed, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw new Error(`listing auth users failed: ${listErr.message}`);
    id = listed.users.find((u) => u.email === user.email)?.id;
    if (!id) throw new Error(`creating ${user.email} failed: ${created.error?.message}`);

    const { error: updateErr } = await sb.auth.admin.updateUserById(id, {
      password: user.password,
      email_confirm: true,
    });
    if (updateErr) throw new Error(`resetting ${user.email} failed: ${updateErr.message}`);
  }

  const { error: profileErr } = await sb.from('users').upsert(
    {
      id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      is_active: true,
      must_change_password: false,
    },
    { onConflict: 'id' },
  );
  if (profileErr) throw new Error(`writing the profile for ${user.email} failed: ${profileErr.message}`);

  return id;
}
