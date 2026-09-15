import { redirect } from 'next/navigation';
import { createServerClient } from '@beco/supabase-client';
import type { UserRole } from '@beco/types';
import { getSupabase } from './supabase';

export type AdminRole = Extract<UserRole, 'beco_admin' | 'brightex_admin'>;

export interface AdminSession {
  userId: string;
  email: string;
  role: AdminRole;
}

/** A Supabase client carrying the caller's session, however it was built. */
type SessionClient = ReturnType<typeof createServerClient>;

/**
 * The role decision, in one place so the proxy and `requireAdmin` cannot
 * drift. Reads `users`, not a JWT claim, because that is where role lives
 * and where it is revoked. Returns null for a signed-out caller, an
 * inactive one, or any non-admin role. RLS (`users_read_self`) lets a user
 * read exactly their own row, which is all this needs.
 */
export const resolveAdminRole = async (
  supabase: SessionClient,
  userId: string,
): Promise<AdminRole | null> => {
  const { data } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (!data?.is_active) return null;
  return data.role === 'beco_admin' || data.role === 'brightex_admin' ? data.role : null;
};

/**
 * The route side of "role checks in two places", per rule 7. RLS is the
 * other, and the stronger: `settings_write_admin` rejects the write no
 * matter what this returns. This exists so a non admin never SEES the
 * control, and so the page has a real user to attribute the action to.
 *
 * Reads the role from the `users` table, not from a JWT claim, because that
 * is where role lives and where it can be revoked.
 */
export const requireAdmin = async (): Promise<AdminSession> => {
  const supabase = await getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const role = await resolveAdminRole(supabase, auth.user.id);
  if (!role) redirect('/login?denied=1');

  return { userId: auth.user.id, email: auth.user.email ?? '', role };
};
