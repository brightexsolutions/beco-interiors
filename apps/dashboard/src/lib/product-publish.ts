import type { createServerClient } from '@beco/supabase-client';
import { productMutationMessage } from './product-errors';

type SupabaseClient = ReturnType<typeof createServerClient>;

export const STALE_PRODUCT_MESSAGE = 'This product changed while you were editing. Reload and try again.';
export const PRODUCT_WRITE_REFUSED_MESSAGE = 'You do not have permission to change this product.';

export type PublishWrite =
  | { error: string }
  | { error?: undefined; slug: string; categorySlug: string | null; updatedAt: string };

const categorySlugOf = (value: unknown): string | null => {
  const join = value as { slug: string } | { slug: string }[] | null;
  if (!join) return null;
  return Array.isArray(join) ? (join[0]?.slug ?? null) : join.slug;
};

/**
 * Write ONLY `is_published`, under the optimistic lock on `updated_at`.
 *
 * Takes the caller's client, so `products_write` decides who may do this, and
 * the existing `products_audit` trigger records it. Kept out of the server
 * action so the integration suite can run it as each role against the local
 * database, the way the other catalogue writes are proven.
 *
 * Row level security does not raise on an UPDATE it filters out, it just
 * matches nothing, the same as a stale lock. The follow-up read tells the
 * two apart, so a role that cannot write products is told that, not asked to
 * reload a page that is not stale.
 */
export async function writeProductPublished(
  supabase: SupabaseClient,
  input: { productId: string; updatedAt: string; published: boolean },
): Promise<PublishWrite> {
  const { data, error } = await supabase
    .from('products')
    .update({ is_published: input.published })
    .eq('id', input.productId)
    .eq('updated_at', input.updatedAt)
    .is('deleted_at', null)
    .select('slug, updated_at, categories(slug)')
    .maybeSingle();

  if (error) return { error: productMutationMessage(error) };
  if (data) {
    return { slug: data.slug, categorySlug: categorySlugOf(data.categories), updatedAt: data.updated_at };
  }

  const current = await supabase
    .from('products')
    .select('updated_at, deleted_at')
    .eq('id', input.productId)
    .maybeSingle();
  if (current.data && !current.data.deleted_at && current.data.updated_at === input.updatedAt) {
    return { error: PRODUCT_WRITE_REFUSED_MESSAGE };
  }
  return { error: STALE_PRODUCT_MESSAGE };
}
