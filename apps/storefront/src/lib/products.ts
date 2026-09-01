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
  /** The real category, so a card never has to guess what it is showing. */
  category?: { name: string; slug: string } | null;
  /** Carried on the list query so the shop can facet on finish. */
  specs?: Record<string, string> | null;
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
      'id,name,slug,price,compare_at_price,price_display_mode,availability,face_type,unit,badge,images,specs,' +
        'categories(name,slug)',
    )
    .order('name');
  if (error) throw new Error(`could not load products: ${error.message}`);
  // The generated types cannot narrow an embedded join in a select string,
  // so the shape is asserted here and guaranteed by the query above.
  return (data ?? []).map((row) => {
    const { categories, ...rest } = row as unknown as Record<string, unknown> & {
      categories: { name: string; slug: string } | null;
    };
    return { ...rest, category: categories } as unknown as CatalogueProduct;
  });
};

/** The gallery order is the order a specifier reads a material in. */
const ROLE_ORDER = ['slab', 'on_stand', 'bookmatch', 'application', 'unknown'] as const;

/** Every image, in the order a specifier reads a material. */
export const orderedImages = (p: CatalogueProduct): ProductImage[] =>
  [...(p.images ?? [])].sort(
    (a, b) =>
      ROLE_ORDER.indexOf(a.role as (typeof ROLE_ORDER)[number]) -
      ROLE_ORDER.indexOf(b.role as (typeof ROLE_ORDER)[number]),
  );

export const primaryImage = (p: CatalogueProduct): ProductImage | undefined =>
  [...(p.images ?? [])].sort(
    (a, b) =>
      ROLE_ORDER.indexOf(a.role as (typeof ROLE_ORDER)[number]) -
      ROLE_ORDER.indexOf(b.role as (typeof ROLE_ORDER)[number]),
  )[0];

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Drive folder of origin. The category's identity, not its slug. */
  source_path: string | null;
  product_count: number;
}

/**
 * Categories that actually have something in them.
 *
 * An empty category is not a page worth linking to, and per D27 it is
 * noindexed and kept out of the sitemap until the import lands products in
 * it. Fifteen Drive folders are still empty, so this filter is doing real
 * work rather than guarding a theoretical case.
 */
export const getCategoriesWithProducts = async (): Promise<Category[]> => {
  const { data, error } = await anon()
    .from('categories')
    .select('id,name,slug,description,source_path,products(count)')
    .order('sort_order');
  if (error) throw new Error(`could not load categories: ${error.message}`);
  return (data ?? [])
    .map((c) => {
      const { products, ...rest } = c as typeof c & { products: { count: number }[] };
      return { ...rest, product_count: products?.[0]?.count ?? 0 } as Category;
    })
    .filter((c) => c.product_count > 0);
};

/**
 * EVERY published category, including those still waiting on photography.
 *
 * Used for navigation: the footer and the shop index, where hiding a range
 * Beco actually sells would misrepresent the business as a stone supplier
 * with a sideline in handles. Thirteen of the fifteen are empty today.
 *
 * NOT used for the sitemap or the home page, which stay on
 * `getCategoriesWithProducts` so D27's index gating holds: an empty category
 * is reachable and designed, but it is noindex and out of the sitemap until
 * it has something to say.
 */
export const getAllCategories = async (): Promise<Category[]> => {
  const { data, error } = await anon()
    .from('categories')
    .select('id,name,slug,description,source_path,products(count)')
    .order('sort_order');
  if (error) throw new Error(`could not load categories: ${error.message}`);
  return (data ?? []).map((c) => {
    const { products, ...rest } = c as typeof c & { products: { count: number }[] };
    return { ...rest, product_count: products?.[0]?.count ?? 0 } as Category;
  });
};

export const getProductsByCategory = async (slug: string): Promise<CatalogueProduct[]> => {
  const { data, error } = await anon()
    .from('products')
    .select(
      'id,name,slug,price,compare_at_price,price_display_mode,availability,face_type,unit,badge,images,categories!inner(slug)',
    )
    .eq('categories.slug', slug)
    .order('name');
  if (error) throw new Error(`could not load products: ${error.message}`);
  return (data ?? []) as unknown as CatalogueProduct[];
};

export interface ProductDetail extends CatalogueProduct {
  description: string | null;
  short_description: string | null;
  sku: string | null;
  specs: Record<string, string> | null;
  meta_title: string | null;
  meta_description: string | null;
  category: { name: string; slug: string; description: string | null } | null;
}

export const getProductBySlug = async (slug: string): Promise<ProductDetail | null> => {
  const { data, error } = await anon()
    .from('products')
    .select(
      'id,name,slug,price,compare_at_price,price_display_mode,availability,face_type,unit,badge,images,' +
        'description,short_description,sku,specs,meta_title,meta_description,' +
        'categories(name,slug,description)',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`could not load product: ${error.message}`);
  if (!data) return null;
  // The generated types cannot narrow an embedded join in a select string,
  // so the shape is asserted here and guaranteed by the query above.
  const row = data as unknown as Record<string, unknown> & {
    categories: { name: string; slug: string; description: string | null } | null;
  };
  const { categories, ...rest } = row;
  return { ...rest, category: categories } as unknown as ProductDetail;
};

export interface GalleryShot {
  path: string;
  alt: string;
  width: number;
  height: number;
  blur?: string | undefined;
  productName: string;
  productSlug: string;
}

/**
 * Every installation photograph in the catalogue, flattened.
 *
 * A gallery of real projects is one of the strongest local and trust signals
 * available, and it is a genuine advantage here: the nearest competitor's
 * equivalent rooms are AI generated.
 *
 * Interleaved by product rather than grouped, so ten photographs of one stone
 * cannot take the whole first screen. Delfone alone has ten.
 */
export const getGalleryShots = async (): Promise<GalleryShot[]> => {
  const products = await getPublishedProducts();

  const byProduct = products.map((product) =>
    (product.images ?? [])
      .filter((image) => image.role === 'application')
      .map((image) => ({
        path: image.path,
        alt: image.alt,
        width: image.width,
        height: image.height,
        blur: image.blur,
        productName: product.name,
        productSlug: product.slug,
      })),
  );

  // Round robin across products: one from each, then the next from each.
  const shots: GalleryShot[] = [];
  const deepest = Math.max(0, ...byProduct.map((list) => list.length));
  for (let round = 0; round < deepest; round++) {
    for (const list of byProduct) {
      const shot = list[round];
      if (shot) shots.push(shot);
    }
  }
  return shots;
};

/** Other products in the same category, for the product page's related row. */
export const getRelatedProducts = async (
  categorySlug: string,
  excludeSlug: string,
  limit = 4,
): Promise<CatalogueProduct[]> => {
  const products = await getProductsByCategory(categorySlug);
  return products.filter((p) => p.slug !== excludeSlug).slice(0, limit);
};

/** Published product slugs, for generateStaticParams. */
export const getProductSlugs = async (): Promise<string[]> => {
  const { data, error } = await anon().from('products').select('slug');
  if (error) throw new Error(`could not load slugs: ${error.message}`);
  return (data ?? []).map((r) => r.slug as string);
};

/**
 * A single category, whether or not it has products.
 *
 * Deliberately not filtered by product count: an empty category still renders
 * a designed page, it is simply noindexed and kept out of the sitemap until
 * the import lands something in it. Per D27 that flip is automatic, so nobody
 * has to remember to do it when a Drive folder fills.
 */
export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  const { data, error } = await anon()
    .from('categories')
    .select('id,name,slug,description,source_path,products(count)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`could not load category: ${error.message}`);
  if (!data) return null;
  const { products, ...rest } = data as typeof data & { products: { count: number }[] };
  return { ...rest, product_count: products?.[0]?.count ?? 0 } as Category;
};

export const getCategorySlugs = async (): Promise<string[]> => {
  const { data, error } = await anon().from('categories').select('slug');
  if (error) throw new Error(`could not load category slugs: ${error.message}`);
  return (data ?? []).map((r) => r.slug as string);
};

/**
 * next/image props for a blur placeholder, or nothing at all.
 *
 * Under exactOptionalPropertyTypes, passing `blurDataURL={undefined}` is not
 * the same as omitting it, and next/image rejects it. Six call sites had the
 * same conditional, so it lives here once.
 */
export const blurProps = (img: { blur?: string | undefined }) =>
  img.blur ? ({ placeholder: 'blur', blurDataURL: img.blur } as const) : ({} as const);
