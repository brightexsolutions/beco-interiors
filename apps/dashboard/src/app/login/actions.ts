'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createRateLimiter, signInSchema } from '@beco/validation';
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
 * Password sign in against Supabase Auth. The role check is NOT here: this
 * only proves who you are. `requireAdmin` on the launch page proves you are
 * allowed in, and RLS on `settings` is what actually stops a non admin
 * write. See D80 and rule 7.
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // One message for every failure mode: a wrong password and an unknown
    // email must not be told apart from the outside.
    return { error: 'That email and password do not match an account' };
  }

  const next = formData.get('next');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/launch');
}
