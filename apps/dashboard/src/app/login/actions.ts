'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createRateLimiter, signInSchema, safeReturnPath } from '@beco/validation';
import { DEV_QUICK_ACCOUNTS, DEV_SEED_PASSWORD, isDevQuickLoginEnabled } from '@/lib/dev-quick-login';
import { resolveSessionUser } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export interface SignInState {
  error?: string;
  /** Set only for client-side shape failures, never for an auth miss, so a
   *  wrong password is not blamed on the email field. */
  field?: 'email' | 'password';
}

// Supabase Auth rate limits sign in on its own side; this is a thin layer
// in front of it so a burst gets one clear message rather than a string of
// GoTrue 429s, per D81. Ten attempts a minute from one address.
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

async function callerKey(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip');
    return ip ? `sign-in:${ip}` : 'sign-in:unknown';
  } catch {
    return null;
  }
}

/**
 * Password sign in against Supabase Auth. Proves who you are, then:
 *
 *  - a deactivated or unknown account is signed straight back out and told
 *    nothing that a wrong password would not also produce (A.5)
 *  - a successful sign in stamps `last_login_at` and writes a `login` audit
 *    row through `record_sign_in()` (A.4)
 *
 * The role check per route is the proxy's job (`lib/access.ts`), and RLS is
 * the authority underneath. See D80 and rule 7.
 */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const key = await callerKey();
  if (key && !limiter.check(key).ok) {
    return { error: 'Too many attempts. Please wait a minute and try again.' };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path[0];
    return {
      error: issue?.message ?? 'Check the form and try again',
      // exactOptionalPropertyTypes: field is only ever 'email' or 'password', or
      // absent entirely, never present-and-undefined.
      ...(path === 'email' || path === 'password' ? { field: path } : {}),
    };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    // One message for every failure mode: a wrong password and an unknown
    // email must not be told apart from the outside.
    return { error: 'That email and password do not match an account' };
  }

  const user = await resolveSessionUser(supabase, data.user.id);
  if (!user || !user.role) {
    // Deactivated, or no `users` row. End the session that sign-in just
    // started, and give the same answer as a wrong password.
    await supabase.auth.signOut();
    return { error: 'That email and password do not match an account' };
  }

  // Best effort: a stamp failure must not block a valid sign in.
  await supabase.rpc('record_sign_in');

  redirect(safeReturnPath(formData.get('next')));
}

const DEV_EMAILS = new Set<string>(DEV_QUICK_ACCOUNTS.map((account) => account.email));

/**
 * Development only. Signs in as a seeded local account with the fixture
 * password. Refuses outside `development`, and refuses any email that is not
 * on the seeded allowlist. Still a real session: RLS is the authority, same
 * as the password form.
 *
 * It does NOT clear `must_change_password`. The forced-change screen is
 * skipped by `isForcedPasswordChangeEnforced` instead, so the seeded flag
 * survives and the real first-login flow can be put back with
 * DEV_FORCE_PASSWORD_CHANGE=1 rather than a database reset.
 */
export async function devSignIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  if (!isDevQuickLoginEnabled()) {
    return { error: 'That email and password do not match an account' };
  }

  const email = String(formData.get('email') ?? '');
  if (!DEV_EMAILS.has(email)) {
    return { error: 'That email and password do not match an account' };
  }

  const key = await callerKey();
  if (key && !limiter.check(`dev:${key}`).ok) {
    return { error: 'Too many attempts. Please wait a minute and try again.' };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_SEED_PASSWORD,
  });
  if (error || !data.user) {
    return { error: 'That email and password do not match an account' };
  }

  const user = await resolveSessionUser(supabase, data.user.id);
  if (!user || !user.role) {
    await supabase.auth.signOut();
    return { error: 'That email and password do not match an account' };
  }

  await supabase.rpc('record_sign_in');

  redirect(safeReturnPath(formData.get('next')));
}
