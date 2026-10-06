import type { createServerClient } from '@beco/supabase-client';
import type { UserRole } from '@beco/types';
import { canAccess } from './access';

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Quotes nobody has opened yet, for the Warm Red count on the Quotes pill.
 * RLS decides which quotes a role can count. A failed count reads as zero:
 * a missing badge is better than a shell that will not render.
 */
export async function fetchNewQuoteCount(supabase: SupabaseClient, role: UserRole): Promise<number> {
  if (!canAccess(role, '/quotes')) return 0;
  const { count, error } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')
    .is('deleted_at', null);
  if (error || !count) return 0;
  return count;
}
