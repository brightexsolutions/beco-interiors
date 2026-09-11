'use server';

import { redirect } from 'next/navigation';
import { changePasswordSchema } from '@beco/validation';
import { ROLE_LANDING } from '@/lib/access';
import { requireSignedIn } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export interface ChangePasswordState {
  error?: string;
}

/**
 * Sets a new password through Supabase Auth, then clears the forced-change
 * flag. The flag is cleared by `complete_first_login()`, a security-definer
 * RPC, not a direct `users` write: `must_change_password` is not a column a
 * near-client path should be able to move (migration 26).
 *
 * `requireSignedIn`, not `requireUser`: this screen is exactly where a
 * flagged user is meant to be, so it must not redirect them away from it.
 */
export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireSignedIn();

  const parsed = changePasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again' };
  }

  const supabase = await getSupabase();

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    // GoTrue refuses a password equal to the current one, and enforces its
    // own length floor. One message covers every case: the user picks
    // another.
    return { error: 'That password cannot be used. Choose a different one.' };
  }

  const { error: rpcError } = await supabase.rpc('complete_first_login');
  if (rpcError) {
    return {
      error: 'Your password was changed, but finishing sign-in failed. Reload the page and try again.',
    };
  }

  redirect(ROLE_LANDING[user.role]);
}
