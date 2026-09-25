import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@beco/types';

/**
 * Service-role client for GoTrue admin calls (create user, set password).
 * Never imported from a client component. RLS on `public.users` still runs
 * through the signed-in Brightex session.
 */
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Service role is not configured');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
