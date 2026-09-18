import type { Availability, PriceDisplayMode, ProductBadge, ProductImage } from '@beco/types';
import { IMAGE_ROLES } from '@beco/types';
import { displayAvailability } from '@beco/ui';
import { createServerClient } from '@beco/supabase-client';
import { specsFromRecord } from '@beco/validation';

type SupabaseClient = ReturnType<typeof createServerClient>;

export interface ProductListFilters {
  search?: string | undefined;
  availability?: Availability | 'out' | undefined;
  published?: 'published' | 'draft' | undefined;
  stock?: 'low' | 'out' | undefined;
}

export interface CatalogueProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  price: number | null;
  compareAtPrice: number | null;
  priceDisplayMode: PriceDisplayMode;
  availability: Availability;
  badge: ProductBadge | null;
  isPublished: boolean;
  sortOrder: number;
  shortDescription: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  specs: { label: string; value: string }[];
  images: ProductImage[];
  unit: string | null;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  updatedAt: string;
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: 'In stock',
  pre_order: 'Pre-order',
  poa: 'Enquire',
};

export const isLowStock = (quantity: number | null, threshold: number | null): boolean =>
  quantity != null && threshold != null && quantity > 0 && quantity <= threshold;

export const isOutOfStock = (quantity: number | null): boolean => quantity != null && quantity <= 0;

export const productAvailabilityLabel = (product: Pick<CatalogueProduct, 'availability' | 'stockQuantity'>): string => {
  const shown = displayAvailability(product.availability, product.stockQuantity);
  if (shown === 'out_of_stock') return 'Out of stock';
  return AVAILABILITY_LABEL[shown];
};

export const IMAGE_ROLE_LABEL: Record<ProductImage['role'], string> = {
  slab: 'Slab',
  on_stand: 'On stand',
  bookmatch: 'Bookmatch',
  application: 'In use',
  unknown: 'Other',
};

export interface ProductCategoryOption {
  id: string;
  name: string;
  slug: string;
}

export const parseProductImages = (value: unknown): ProductImage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((row, index) => {
      if (!row || typeof row !== 'object') return [];
      const rec = row as Record<string, unknown>;
      const path = typeof rec.path === 'string' ? rec.path : '';
      if (!path) return [];
      const role = IMAGE_ROLES.includes(rec.role as ProductImage['role'])
        ? (rec.role as ProductImage['role'])
        : 'unknown';
      const image: ProductImage = {
          role,
          path,
          alt: typeof rec.alt === 'string' ? rec.alt : '',
          width: Number(rec.width) || 0,
          height: Number(rec.height) || 0,
          sort: typeof rec.sort === 'number' ? rec.sort : index,
        };
        if (typeof rec.blur === 'string') image.blur = rec.blur;
        return [image];
    })
    .sort((a, b) => a.sort - b.sort);
};

export const productImageUrl = (path: string, width: 400 | 800 | 1600 = 400): string => {
  const host = (process.env.NEXT_PUBLIC_IMAGE_HOST ?? '').replace(/\/$/, '');
  return `${host}/${path}-${width}.webp`;
};

const sanitizeSearchTerm = (term: string): string => term.replace(/[,()]/g, '').trim();

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category_id: string | null;
  price: number | null;
  compare_at_price: number | null;
  price_display_mode: PriceDisplayMode;
  availability: Availability;
  badge: ProductBadge | null;
  is_published: boolean;
  sort_order: number;
  short_description: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  specs: unknown;
  images: unknown;
  unit: string | null;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  updated_at: string;
  categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
}

const oneCategory = (
  value: ProductRow['categories'],
): { id: string; name: string; slug: string } | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

const PRODUCT_SELECT = `id, name, slug, sku, category_id, price, compare_at_price, price_display_mode, availability, badge,
       is_published, sort_order, short_description, description, meta_title, meta_description,
       specs, images, unit, stock_quantity, low_stock_threshold, updated_at, categories(id, name, slug)`;

const toProduct = (row: ProductRow): CatalogueProduct => {
  const category = oneCategory(row.categories);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    categoryId: row.category_id ?? category?.id ?? null,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    priceDisplayMode: row.price_display_mode,
    availability: row.availability,
    badge: row.badge,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    shortDescription: row.short_description,
    description: row.description,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    specs: specsFromRecord(row.specs),
    images: parseProductImages(row.images),
    unit: row.unit,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    updatedAt: row.updated_at,
  };
};

export async function fetchProducts(
  supabase: SupabaseClient,
  filters: ProductListFilters = {},
): Promise<CatalogueProduct[]> {
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .is('deleted_at', null)
    .order('name')
    .limit(400);

  const term = filters.search ? sanitizeSearchTerm(filters.search) : '';
  if (term) {
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,slug.ilike.%${term}%`);
  }
  if (filters.availability && filters.availability !== 'out') {
    query = query.eq('availability', filters.availability);
  }
  if (filters.published === 'published') query = query.eq('is_published', true);
  if (filters.published === 'draft') query = query.eq('is_published', false);

  const { data, error } = await query.overrideTypes<ProductRow[]>();
  if (error) throw new Error(`Could not load products: ${error.message}`);

  let products = (data ?? []).map(toProduct);
  if (filters.availability === 'out' || filters.stock === 'out') {
    products = products.filter((product) => isOutOfStock(product.stockQuantity));
  }
  if (filters.stock === 'low') {
    products = products.filter((product) => isLowStock(product.stockQuantity, product.lowStockThreshold));
  }
  return products;
}

export async function fetchProductBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<CatalogueProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load product: ${error.message}`);
  return data ? toProduct(data as unknown as ProductRow) : null;
}

export async function fetchProductCategories(supabase: SupabaseClient): Promise<ProductCategoryOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_published', true)
    .order('name');
  if (error) throw new Error(`Could not load ranges: ${error.message}`);
  return (data ?? []) as ProductCategoryOption[];
}
