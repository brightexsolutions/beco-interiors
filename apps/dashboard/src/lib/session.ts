import { redirect } from 'next/navigation';
import { createServerClient } from '@beco/supabase-client';
import type { UserRole } from '@beco/types';
import { CHANGE_PASSWORD_PATH, ROLE_LANDING, canAccess } from './access';
import { getSupabase } from './supabase';

export type AdminRole = Extract<UserRole, 'beco_admin' | 'brightex_admin'>;

export interface AdminSession {
  userId: string;
  email: string;
  role: AdminRole;
}

/** The signed-in user, as far as the dashboard is concerned. `role` is null
 *  for an inactive account, mirroring `current_user_role()` in Postgres, so
 *  a caller that checks `role` gets the same answer the database would. */
export interface SessionUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

/** A signed-in user whose account is active: `role` is known to be set. */
export type ActiveSession = SessionUser & { role: UserRole };

/** A Supabase client carrying the caller's session, however it was built. */
type SessionClient = ReturnType<typeof createServerClient>;

/**
 * The user's row, read from `users` rather than a JWT claim, because that is
 * where role, the active flag and the forced-change flag live and where they
 * are revoked. `users_read_self` (RLS) lets a user read exactly their own
 * row, which is all this needs. Returns null when there is no row at all.
 */
export const resolveSessionUser = async (
  supabase: SessionClient,
  userId: string,
): Promise<SessionUser | null> => {
  const { data } = await supabase
    .from('users')
    .select('role, is_active, must_change_password, email, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    userId,
    email: data.email ?? '',
    fullName: data.full_name ?? '',
    // An inactive account has no role, the same as `current_user_role()`.
    role: data.is_active ? data.role : null,
    isActive: data.is_active,
    mustChangePassword: data.must_change_password,
  };
};

/**
 * The role decision for the launch control (D80), in one place so the proxy
 * and `requireAdmin` cannot drift. Null for a signed-out caller, an inactive
 * one, or any non-admin role.
 */
export const resolveAdminRole = async (
  supabase: SessionClient,
  userId: string,
): Promise<AdminRole | null> => {
  const user = await resolveSessionUser(supabase, userId);
  if (!user || !user.role) return null;
  return user.role === 'beco_admin' || user.role === 'brightex_admin' ? user.role : null;
};

/**
 * Signed in and active. Does NOT enforce the forced password change, so the
 * change-password screen and its action can call it without a redirect loop.
 * Everything else should use `requireUser`.
 */
export const requireSignedIn = async (): Promise<ActiveSession> => {
  const supabase = await getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const user = await resolveSessionUser(supabase, auth.user.id);
  if (!user || !user.role) redirect('/login?denied=1');
  return user as ActiveSession;
};

/**
 * Signed in, active, and past the forced password change. The route side of
 * "checks in two places": a server component or action that calls this is
 * safe even if the proxy was bypassed, because RLS is still underneath and
 * this re-reads `users`.
 */
export const requireUser = async (): Promise<ActiveSession> => {
  const user = await requireSignedIn();
  if (user.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);
  return user;
};

/** `requireUser` plus a role gate. A wrong role is sent to its own landing,
 *  not shown a 403, because it is a real user in the wrong place. */
export const requireRole = async (roles: readonly UserRole[]): Promise<ActiveSession> => {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_LANDING[user.role]);
  return user;
};

/**
 * `requireUser` plus the access map for a path, so a page gates itself with
 * exactly the rule the proxy uses (`lib/access.ts`) and the two cannot
 * drift. This is the page-level half of "checks in two places".
 */
export const requirePath = async (pathname: string): Promise<ActiveSession> => {
  const user = await requireUser();
  if (!canAccess(user.role, pathname)) redirect(ROLE_LANDING[user.role]);
  return user;
};

/**
 * The route side of "role checks in two places", per rule 7, for the launch
 * control. RLS on `settings` is the other and the stronger. This exists so a
 * non admin never SEES the control.
 */
export const requireAdmin = async (): Promise<AdminSession> => {
  const supabase = await getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const role = await resolveAdminRole(supabase, auth.user.id);
  if (!role) redirect('/login?denied=1');

  return { userId: auth.user.id, email: auth.user.email ?? '', role };
};
