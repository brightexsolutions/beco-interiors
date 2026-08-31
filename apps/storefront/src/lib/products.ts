import { createClient } from '@supabase/supabase-js';
import type { ProductImage } from '@beco/types';

/**
 * Reads published products with the ANON key, so row level security is the
 * authority rather than application code. An unpublished or soft deleted
 * product is invisible here because the database says so, not because this
 * query remembered to filter.
 */
export interface CatalogueProduct {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  compare_at_price: number | null;
  price_display_mode: 'fixed' | 'poa';
  availability: 'in_stock' | 'pre_order' | 'poa';
  face_type: 'book_match' | 'one_face' | null;
  unit: string | null;
  badge: 'hot' | 'new' | 'sale' | 'clearance' | null;
  images: ProductImage[];
}

const anon = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

export const getPublishedProducts = async (): Promise<CatalogueProduct[]> => {
  const { data, error } = await anon()
    .from('products')
    .select(
      'id,name,slug,price,compare_at_price,price_display_mode,availability,face_type,unit,badge,images',
    )
    .order('name');
  if (error) throw new Error(`could not load products: ${error.message}`);
  return (data ?? []) as CatalogueProduct[];
};

/** The gallery order is the order a specifier reads a material in. */
const ROLE_ORDER = ['slab', 'on_stand', 'bookmatch', 'application', 'unknown'] as const;

export const primaryImage = (p: CatalogueProduct): ProductImage | undefined =>
  [...(p.images ?? [])].sort(
    (a, b) =>
      ROLE_ORDER.indexOf(a.role as (typeof ROLE_ORDER)[number]) -
      ROLE_ORDER.indexOf(b.role as (typeof ROLE_ORDER)[number]),
  )[0];
