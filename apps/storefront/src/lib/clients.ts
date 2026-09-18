import { createClient } from '@supabase/supabase-js';
import type { ProductImage } from '@beco/types';

/**
 * Corporate clients Beco has permission to name publicly, for the projects
 * page's credential strip.
 *
 * RLS is the authority on which rows come back, not this query: migration 10's
 * `clients_read_published` policy already requires both `is_published` and
 * `has_permission`, belt and braces with a check constraint of the same
 * name, because some corporates prohibit being named contractually.
 *
 * `logo` follows the same jsonb shape as a product image, since nothing in
 * the schema documents it otherwise and every other image on this site is
 * shaped that way. Optional: a client with no logo falls back to its name.
 */
export interface PublishedClient {
  id: string;
  name: string;
  slug: string;
  logo: Pick<ProductImage, 'path' | 'alt' | 'width' | 'height'> | null;
  project: string | null;
  sector: string | null;
  /** A short written quote, migration 26. Optional: most credentials carry
      a project line with no quote attached. */
  testimonial: string | null;
}

export const getPublishedClients = async (): Promise<PublishedClient[]> => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb
    .from('clients')
    .select('id,name,slug,logo,project,sector,testimonial')
    .order('sort_order', { ascending: true });

  // A credential strip is never important enough to break the page it sits on.
  if (error || !data) return [];
  return data as PublishedClient[];
};
