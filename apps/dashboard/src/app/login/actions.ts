'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createRateLimiter, signInSchema } from '@beco/validation';
import { resolveSessionUser } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export interface SignInState {
  error?: string;
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
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again' };
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

  const next = formData.get('next');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/');
}
