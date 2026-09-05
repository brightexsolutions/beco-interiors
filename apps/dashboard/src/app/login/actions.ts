'use server';

import { redirect } from 'next/navigation';
import { signInSchema } from '@beco/validation';
import { getSupabase } from '@/lib/supabase';

export interface SignInState {
  error?: string;
}

/**
 * Password sign in against Supabase Auth. The role check is NOT here: this
 * only proves who you are. `requireAdmin` on the launch page proves you are
 * allowed in, and RLS on `settings` is what actually stops a non admin
 * write. See D80 and rule 7.
 */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
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
