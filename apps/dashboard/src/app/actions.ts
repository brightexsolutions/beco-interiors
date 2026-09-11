'use server';

import { redirect } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

/**
 * Ends the Supabase session (clears the auth cookies through the bound
 * cookie store) and returns to the login screen. A server action, so it is
 * a real POST, not a link.
 */
export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}
