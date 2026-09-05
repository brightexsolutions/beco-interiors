import { redirect } from 'next/navigation';
import type { UserRole } from '@beco/types';
import { getSupabase } from './supabase';

export interface AdminSession {
  userId: string;
  email: string;
  role: Extract<UserRole, 'beco_admin' | 'brightex_admin'>;
}

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

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!profile?.is_active || (profile.role !== 'beco_admin' && profile.role !== 'brightex_admin')) {
    redirect('/login?denied=1');
  }

  return {
    userId: auth.user.id,
    email: auth.user.email ?? '',
    role: profile.role,
  };
};
