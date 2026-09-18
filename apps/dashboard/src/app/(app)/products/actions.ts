'use server';

import { randomBytes } from 'node:crypto';
import type { ProductImage } from '@beco/types';
import {
  addProductImageSchema,
  createProductSchema,
  deleteProductSchema,
  removeProductImageSchema,
  saveProductImagesSchema,
  specsToRecord,
  updateProductSchema,
} from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { productMutationMessage } from '@/lib/product-errors';
import { processProductPhoto } from '@/lib/product-photo';
import { deleteProductDerivatives, isProductStorageConfigured, uploadProductDerivatives } from '@/lib/product-storage';
import { parseProductImages } from '@/lib/products';
import { revalidateStorefront } from '@/lib/storefront-revalidate';

export interface ProductActionState {
  error?: string;
  ok?: string;
  slug?: string;
}

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

const specsFromForm = (form: FormData): { label: string; value: string }[] => {
  const raw = form.get('specs');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const label = 'label' in row ? String(row.label) : '';
        const value = 'value' in row ? String(row.value) : '';
        return { label, value };
      })
      .filter((row): row is { label: string; value: string } => row != null);
  } catch {
    return [];
  }
};

const imagesFromForm = (form: FormData): unknown => {
  const raw = form.get('images');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
};

const categorySlugOf = (value: unknown): string | null => {
  const join = value as { slug: string } | { slug: string }[] | null;
  if (!join) return null;
  return Array.isArray(join) ? (join[0]?.slug ?? null) : join.slug;
};

export async function updateProduct(_prev: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requirePath('/products');
  const parsed = updateProductSchema.safeParse({
    productId: formString(form, 'productId'),
    updatedAt: formString(form, 'updatedAt'),
    name: formString(form, 'name'),
    slug: formString(form, 'slug'),
    categoryId: formString(form, 'categoryId'),
    unit: formString(form, 'unit'),
    priceDisplayMode: formString(form, 'priceDisplayMode'),
    price: formString(form, 'price'),
    compareAtPrice: formString(form, 'compareAtPrice'),
    availability: formString(form, 'availability'),
    badge: formString(form, 'badge'),
    isPublished: form.get('isPublished'),
    sortOrder: formString(form, 'sortOrder'),
    shortDescription: formString(form, 'shortDescription'),
    description: formString(form, 'description'),
    metaTitle: formString(form, 'metaTitle'),
    metaDescription: formString(form, 'metaDescription'),
    specs: specsFromForm(form),
    stockQuantity: formString(form, 'stockQuantity'),
    lowStockThreshold: formString(form, 'lowStockThreshold'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const former = await supabase
    .from('products')
    .select('slug, categories(slug)')
    .eq('id', parsed.data.productId)
    .maybeSingle();
  const formerSlug = former.data?.slug ?? parsed.data.slug;
  const categorySlug = categorySlugOf(former.data?.categories);

  const { data, error } = await supabase
    .from('products')
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      category_id: parsed.data.categoryId,
      unit: parsed.data.unit,
      price_display_mode: parsed.data.priceDisplayMode,
      price: parsed.data.price,
      compare_at_price: parsed.data.compareAtPrice,
      availability: parsed.data.availability,
      badge: parsed.data.badge,
      is_published: parsed.data.isPublished,
      sort_order: parsed.data.sortOrder,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      meta_title: parsed.data.metaTitle,
      meta_description: parsed.data.metaDescription,
      specs: specsToRecord(parsed.data.specs),
      stock_quantity: parsed.data.stockQuantity,
      low_stock_threshold: parsed.data.lowStockThreshold,
    })
    .eq('id', parsed.data.productId)
    .eq('updated_at', parsed.data.updatedAt)
    .is('deleted_at', null)
    .select('id, categories(slug)')
    .maybeSingle();

  if (error) return { error: productMutationMessage(error) };
  if (!data) return { error: 'This product changed while you were editing. Reload and try again.' };

  await revalidateStorefront({
    productSlug: parsed.data.slug,
    formerSlug,
    categorySlug: categorySlugOf(data.categories) ?? categorySlug,
  });
  return { ok: 'Saved.' };
}

export async function createProduct(_prev: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requirePath('/products');
  const parsed = createProductSchema.safeParse({
    name: formString(form, 'name'),
    slug: formString(form, 'slug'),
    categoryId: formString(form, 'categoryId'),
    unit: formString(form, 'unit'),
    priceDisplayMode: formString(form, 'priceDisplayMode'),
    price: formString(form, 'price'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      category_id: parsed.data.categoryId,
      unit: parsed.data.unit,
      price_display_mode: parsed.data.priceDisplayMode,
      price: parsed.data.price,
      is_published: false,
      availability: 'in_stock',
      images: [],
      specs: {},
    })
    .select('slug, categories(slug)')
    .maybeSingle();

  if (error) return { error: productMutationMessage(error) };
  if (!data?.slug) return { error: 'The database refused that write.' };

  await revalidateStorefront({
    productSlug: data.slug,
    categorySlug: categorySlugOf(data.categories),
  });
  return { ok: 'Draft created. Add photographs, then publish.', slug: data.slug };
}

export async function deleteProduct(_prev: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requirePath('/products');
  const parsed = deleteProductSchema.safeParse({
    productId: formString(form, 'productId'),
    updatedAt: formString(form, 'updatedAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };

  const supabase = await getSupabase();
  const current = await supabase
    .from('products')
    .select('slug, categories(slug)')
    .eq('id', parsed.data.productId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString(), is_published: false })
    .eq('id', parsed.data.productId)
    .eq('updated_at', parsed.data.updatedAt)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) return { error: productMutationMessage(error) };
  if (!data) return { error: 'This product changed while you were editing. Reload and try again.' };

  await revalidateStorefront({
    productSlug: current.data?.slug ?? parsed.data.productId,
    categorySlug: categorySlugOf(current.data?.categories),
  });
  return { ok: 'Removed from the storefront. Existing quotes keep their line and price.' };
}

const storedImages = (images: ProductImage[]) =>
  images.map((image) => {
    const row: Record<string, string | number> = {
      role: image.role,
      path: image.path,
      alt: image.alt,
      width: image.width,
      height: image.height,
      sort: image.sort,
    };
    if (image.blur) row.blur = image.blur;
    return row;
  });

const writeImages = async (
  productId: string,
  updatedAt: string,
  images: ProductImage[],
): Promise<{ error?: string; categorySlug: string | null; slug: string | null }> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('products')
    .update({ images: storedImages(images) })
    .eq('id', productId)
    .eq('updated_at', updatedAt)
    .is('deleted_at', null)
    .select('slug, categories(slug)')
    .maybeSingle();
  if (error) return { error: productMutationMessage(error), categorySlug: null, slug: null };
  if (!data) {
    return {
      error: 'This product changed while you were editing. Reload and try again.',
      categorySlug: null,
      slug: null,
    };
  }
  return { categorySlug: categorySlugOf(data.categories), slug: data.slug ?? null };
};

export async function addProductImage(_prev: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requirePath('/products');
  const parsed = addProductImageSchema.safeParse({
    productId: formString(form, 'productId'),
    updatedAt: formString(form, 'updatedAt'),
    role: formString(form, 'role'),
    alt: formString(form, 'alt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the photograph, then try again.' };

  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a photograph first.' };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: 'That photograph is larger than 12MB. Compress it and try again.' };
  }
  if (file.type && !ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { error: 'Use a JPEG, PNG or WebP photograph.' };
  }
  if (!isProductStorageConfigured()) {
    return { error: 'Photograph storage is not configured. Add the R2 keys, then try again.' };
  }

  const supabase = await getSupabase();
  const current = await supabase
    .from('products')
    .select('slug, images, updated_at, categories(slug)')
    .eq('id', parsed.data.productId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!current.data) return { error: 'That product is gone.' };
  if (current.data.updated_at !== parsed.data.updatedAt) {
    return { error: 'This product changed while you were editing. Reload and try again.' };
  }

  const existing = parseProductImages(current.data.images);
  if (existing.length >= 12) return { error: 'Twelve photographs is the most a product can carry.' };

  let processed;
  try {
    processed = await processProductPhoto(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'That file is not a photograph we can read.' };
  }

  const folder = categorySlugOf(current.data.categories) ?? 'uncategorised';
  const stem = `${folder}/${current.data.slug}/${parsed.data.role}-${randomBytes(4).toString('hex')}`;
  try {
    await uploadProductDerivatives(stem, processed.derivatives);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not store that photograph.' };
  }

  const next: ProductImage[] = [
    ...existing,
    {
      role: parsed.data.role,
      path: stem,
      alt: parsed.data.alt,
      width: processed.width,
      height: processed.height,
      blur: processed.blurDataUrl,
      sort: existing.length,
    },
  ];
  const written = await writeImages(parsed.data.productId, parsed.data.updatedAt, next);
  if (written.error) {
    await deleteProductDerivatives(stem).catch(() => undefined);
    return { error: written.error };
  }
  await revalidateStorefront({ productSlug: written.slug ?? current.data.slug, categorySlug: written.categorySlug });
  return { ok: 'Photograph added.' };
}

export async function removeProductImage(_prev: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requirePath('/products');
  const parsed = removeProductImageSchema.safeParse({
    productId: formString(form, 'productId'),
    updatedAt: formString(form, 'updatedAt'),
    path: formString(form, 'path'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };

  const supabase = await getSupabase();
  const current = await supabase
    .from('products')
    .select('slug, images, updated_at, categories(slug)')
    .eq('id', parsed.data.productId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!current.data) return { error: 'That product is gone.' };
  if (current.data.updated_at !== parsed.data.updatedAt) {
    return { error: 'This product changed while you were editing. Reload and try again.' };
  }

  const existing = parseProductImages(current.data.images);
  const next = existing.filter((image) => image.path !== parsed.data.path).map((image, index) => ({ ...image, sort: index }));
  if (next.length === existing.length) return { error: 'That photograph is already gone.' };

  const written = await writeImages(parsed.data.productId, parsed.data.updatedAt, next);
  if (written.error) return { error: written.error };

  if (isProductStorageConfigured()) {
    await deleteProductDerivatives(parsed.data.path).catch(() => undefined);
  }
  await revalidateStorefront({ productSlug: written.slug ?? current.data.slug, categorySlug: written.categorySlug });
  return { ok: 'Photograph removed.' };
}

export async function saveProductImages(_prev: ProductActionState, form: FormData): Promise<ProductActionState> {
  await requirePath('/products');
  const parsed = saveProductImagesSchema.safeParse({
    productId: formString(form, 'productId'),
    updatedAt: formString(form, 'updatedAt'),
    images: imagesFromForm(form),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the photographs, then try again.' };

  const supabase = await getSupabase();
  const current = await supabase
    .from('products')
    .select('slug, images, updated_at, categories(slug)')
    .eq('id', parsed.data.productId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!current.data) return { error: 'That product is gone.' };
  if (current.data.updated_at !== parsed.data.updatedAt) {
    return { error: 'This product changed while you were editing. Reload and try again.' };
  }

  const allowed = new Set(parseProductImages(current.data.images).map((image) => image.path));
  if (parsed.data.images.some((image) => !allowed.has(image.path))) {
    return { error: 'That photograph list does not match this product. Reload and try again.' };
  }

  const written = await writeImages(parsed.data.productId, parsed.data.updatedAt, parseProductImages(parsed.data.images));
  if (written.error) return { error: written.error };
  await revalidateStorefront({ productSlug: written.slug ?? current.data.slug, categorySlug: written.categorySlug });
  return { ok: 'Photographs updated.' };
}
