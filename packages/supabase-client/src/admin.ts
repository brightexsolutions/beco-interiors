import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@beco/types';

/**
 * SERVICE ROLE. Bypasses RLS entirely. Treat as a database password.
 *
 * The `server-only` import above makes this a BUILD ERROR if it is ever
 * imported into a client component, which is the point. The storefront
 * never imports this module at all.
 *
 * Use only where RLS genuinely cannot express the rule. Prefer the
 * server client, which keeps RLS as the authority.
 */
export const createAdminClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This is a server only module.');
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
