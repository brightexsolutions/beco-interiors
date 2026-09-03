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

/**
 * One column list for every catalogue query.
 *
 * These drifted: the category grid's query omitted `specs` and the category
 * join, so the same ProductCard showed a finish and its range on /shop and
 * neither on /shop/[category]. A card should not depend on which page asked.
 */
const PRODUCT_COLUMNS =
  'id,name,slug,price,compare_at_price,price_display_mode,availability,face_type,unit,badge,' +
  'images,specs,categories(name,slug)';

// The generated types cannot narrow an embedded join in a select string, so
// the shape is asserted here and guaranteed by PRODUCT_COLUMNS above.
const withCategory = (row: unknown): CatalogueProduct => {
  const { categories, ...rest } = row as Record<string, unknown> & {
    categories: { name: string; slug: string } | null;
  };
  return { ...rest, category: categories } as unknown as CatalogueProduct;
};

export const getPublishedProducts = async (): Promise<CatalogueProduct[]> => {
  const { data, error } = await anon().from('products').select(PRODUCT_COLUMNS).order('name');
  if (error) throw new Error(`could not load products: ${error.message}`);
  return (data ?? []).map(withCategory);
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
  /** The group this sits under, or null for a group and for Lighting. */
  parent_id: string | null;
  product_count: number;
}

/** A top level category with whatever sits under it. See migration 19. */
export interface CategoryGroup extends Category {
  children: Category[];
  /** Products across the whole subtree, which is what the reader counts. */
  total_count: number;
}

const CATEGORY_COLUMNS = 'id,name,slug,description,source_path,parent_id,products(count)';

const withCount = <T extends { products?: { count: number }[] }>(row: T): Category => {
  const { products, ...rest } = row;
  return { ...rest, product_count: products?.[0]?.count ?? 0 } as unknown as Category;
};

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
    .select(CATEGORY_COLUMNS)
    .order('sort_order');
  if (error) throw new Error(`could not load categories: ${error.message}`);
  return (data ?? [])
    .map((c) => withCount(c as never))
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
    .select(CATEGORY_COLUMNS)
    .order('sort_order');
  if (error) throw new Error(`could not load categories: ${error.message}`);
  return (data ?? []).map((c) => withCount(c as never));
};

/**
 * The taxonomy as two levels, which is how a specifier actually looks.
 *
 * Nobody arrives wanting "Bamboo Veneer Wall Panels". They arrive wanting
 * panels, and only then care which kind. Fifteen flat facets in one row asked
 * the reader to hold the whole range in their head to find anything.
 *
 * A top level category with no children is returned as a group of one with an
 * empty `children`, so Lighting does not need a wrapper group invented for it
 * and callers do not need a second code path. `total_count` is the subtree
 * total, because that is the number a reader is counting.
 *
 * Depth is guaranteed to be two by a trigger, per migration 19, so this does
 * not recurse.
 */
export const buildCategoryTree = (all: Category[]): CategoryGroup[] => {
  const childrenOf = new Map<string, Category[]>();
  for (const c of all) {
    if (!c.parent_id) continue;
    childrenOf.set(c.parent_id, [...(childrenOf.get(c.parent_id) ?? []), c]);
  }

  return all
    .filter((c) => !c.parent_id)
    .map((parent) => {
      const children = childrenOf.get(parent.id) ?? [];
      return {
        ...parent,
        children,
        total_count:
          parent.product_count + children.reduce((n, c) => n + c.product_count, 0),
      };
    });
};

export const getCategoryTree = async (): Promise<CategoryGroup[]> =>
  buildCategoryTree(await getAllCategories());

export const getProductsByCategory = async (slug: string): Promise<CatalogueProduct[]> => {
  const { data, error } = await anon()
    .from('products')
    .select(PRODUCT_COLUMNS.replace('categories(', 'categories!inner('))
    .eq('categories.slug', slug)
    .order('name');
  if (error) throw new Error(`could not load products: ${error.message}`);
  return (data ?? []).map(withCategory);
};

/**
 * Everything under a set of categories, for a group page.
 *
 * A group holds no products of its own, so /shop/hardware is only worth
 * opening if it shows what is in the ranges beneath it. Called with the
 * group's id alongside its children's, so a category that later grows
 * children keeps working without a second query path.
 */
export const getProductsInCategories = async (ids: string[]): Promise<CatalogueProduct[]> => {
  if (ids.length === 0) return [];
  const { data, error } = await anon()
    .from('products')
    .select(PRODUCT_COLUMNS)
    .in('category_id', ids)
    .order('name');
  if (error) throw new Error(`could not load products: ${error.message}`);
  return (data ?? []).map(withCategory);
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

export interface GalleryShotImage {
  path: string;
  alt: string;
  width: number;
  height: number;
  blur?: string | undefined;
}

export interface GalleryShot extends GalleryShotImage {
  productName: string;
  productSlug: string;
  /**
   * Other real installation shots of the SAME product, this one first, so
   * hovering the card can cycle through the rest of that stone's projects
   * rather than only ever showing the one photograph the grid happened to
   * place there.
   *
   * Capped at four, matching the product card's own hover gallery: a card
   * is not a slideshow, and Delfone alone has ten application shots, which
   * is too many to cycle through on a single hover.
   *
   * Never a DIFFERENT product's photograph. The whole point is showing more
   * of the same installation, not a stone the reader did not ask about.
   */
  siblings: GalleryShotImage[];
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
/**
 * One product's application shots, each carrying its own siblings, itself
 * first. Pure, so the siblings rule (this shot first, capped at four, never
 * another product's photograph) is testable without a database.
 */
export const shotsForProduct = (
  applications: GalleryShotImage[],
  productName: string,
  productSlug: string,
): GalleryShot[] =>
  applications.map((image, i) => ({
    ...image,
    productName,
    productSlug,
    siblings: [image, ...applications.filter((_, j) => j !== i)].slice(0, 4),
  }));

/** Round robin interleave: one from each list, then the next from each. */
export const interleave = <T>(lists: T[][]): T[] => {
  const out: T[] = [];
  const deepest = Math.max(0, ...lists.map((list) => list.length));
  for (let round = 0; round < deepest; round++) {
    for (const list of lists) {
      // `round in list` rather than a truthy check on the value: this is a
      // generic interleave and a falsy element, 0, an empty string, is a
      // legitimate array member that a truthy check would silently drop.
      // The only caller today always passes GalleryShot objects, which are
      // never falsy, so this could not have shown up in the site itself, but
      // an exported utility is a promise to whatever calls it next.
      if (round in list) out.push(list[round] as T);
    }
  }
  return out;
};

export const getGalleryShots = async (): Promise<GalleryShot[]> => {
  const products = await getPublishedProducts();

  const byProduct = products.map((product) => {
    const applications: GalleryShotImage[] = (product.images ?? [])
      .filter((image) => image.role === 'application')
      .map((image) => ({
        path: image.path,
        alt: image.alt,
        width: image.width,
        height: image.height,
        blur: image.blur,
      }));
    return shotsForProduct(applications, product.name, product.slug);
  });

  // Interleaved by product rather than grouped, so ten photographs of one
  // stone cannot take the whole first screen. Delfone alone had ten, before
  // it was unpublished for reasons that have nothing to do with this.
  return interleave(byProduct);
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
    .select(CATEGORY_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`could not load category: ${error.message}`);
  if (!data) return null;
  return withCount(data as never);
};

/**
 * A category with its place in the tree, for `/shop/[category]`.
 *
 * That one route serves both levels, so it has to know which it is looking at
 * before it can decide whether to render products or the ranges underneath.
 * `parent` is carried for the breadcrumb, which otherwise skips a level and
 * tells search engines the tree is flatter than it is.
 */
export const getCategoryWithTree = async (
  slug: string,
): Promise<{ category: Category; parent: Category | null; children: Category[] } | null> => {
  const category = await getCategoryBySlug(slug);
  if (!category) return null;

  const { data, error } = await anon()
    .from('categories')
    .select(CATEGORY_COLUMNS)
    .eq('parent_id', category.id)
    .order('sort_order');
  if (error) throw new Error(`could not load child categories: ${error.message}`);

  let parent: Category | null = null;
  if (category.parent_id) parent = (await getAllCategories())
    .find((c) => c.id === category.parent_id) ?? null;

  return { category, parent, children: (data ?? []).map((c) => withCount(c as never)) };
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

export interface TeamMember {
  id: string;
  full_name: string;
  public_title: string | null;
  public_phone: string | null;
  public_photo: { path: string; alt: string; width: number; height: number; blur?: string } | null;
}

/**
 * The sales team, as the public may see it.
 *
 * Read with the ANON key, so the `users_read_public_team` policy is what
 * decides who appears. Beco's requirement is specifically that DIRECTORS never
 * appear, and that is held by a check constraint on the row rather than by
 * this query remembering to filter, so there is no way for this to leak one.
 *
 * Only the public columns are selected. An email or a role would be refused by
 * the policy anyway, but asking for them at all would be a mistake waiting to
 * be copied into the next query.
 */
export const getPublicTeam = async (): Promise<TeamMember[]> => {
  const { data, error } = await anon()
    .from('users')
    .select('id,full_name,public_title,public_phone,public_photo')
    .order('sort_order');
  if (error) throw new Error(`could not load the team: ${error.message}`);
  return (data ?? []) as unknown as TeamMember[];
};

/**
 * Categories worth putting in front of a search engine.
 *
 * D27 gates on whether a category has anything to say. With a two level
 * taxonomy that question has to be asked of the SUBTREE, not the row: a group
 * holds no products of its own, so counting only its own would have kept
 * "Sintered Stone" out of the index while the twenty five slabs beneath it
 * were indexed individually.
 *
 * The same rule the other way: a group whose ranges are all still being
 * photographed is exactly as thin as an empty leaf, whatever buying guidance
 * it carries, so it stays out until one of them lands.
 *
 * Used by the sitemap and by the category page's robots tag, so the two can
 * never disagree about which pages exist for search.
 */
export const indexableCategories = (tree: CategoryGroup[]): Category[] =>
  tree.flatMap((group) => [
    ...(group.total_count > 0 ? [group as Category] : []),
    ...group.children.filter((child) => child.product_count > 0),
  ]);

export const getIndexableCategories = async (): Promise<Category[]> =>
  indexableCategories(buildCategoryTree(await getAllCategories()));

/** Whether one category is indexable, without loading the whole tree twice. */
export const categoryIsIndexable = async (slug: string): Promise<boolean> =>
  (await getIndexableCategories()).some((c) => c.slug === slug);
