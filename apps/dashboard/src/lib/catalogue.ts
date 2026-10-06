'use server';

import { getSupabase } from '@/lib/supabase';
import { requirePath } from '@/lib/session';
import { parseProductImages, productImageUrl } from '@/lib/products';

export interface CatalogueHit {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  unit: string | null;
  priceDisplayMode: 'fixed' | 'poa';
  categoryId: string | null;
  categoryName: string | null;
  /** The range above this product's own, so typing "Sintered Stone" finds
   *  the stones filed under 12mm Sintered Stones. */
  parentCategoryName: string | null;
  /** A 400px derivative of the first photograph, so the counter can pick
   *  by eye. Null for a product with no photography yet. */
  thumb: string | null;
}

export interface CatalogueRange {
  id: string;
  name: string;
  groupName: string | null;
  productCount: number;
}

/** Everything the quote picker needs, loaded once when it opens. */
export interface PickerCatalogue {
  products: CatalogueHit[];
  ranges: CatalogueRange[];
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number | null;
  parent_id: string | null;
  is_published: boolean;
}

/**
 * The whole published catalogue for the quote picker in one round trip.
 *
 * Range changes and typing used to call a server action each, and Next runs
 * server actions one at a time, so on Nairobi mobile data every change
 * queued behind the last. Around 280 slim rows is a small payload, so the
 * picker loads them once and filters on the phone.
 *
 * Rows are slim on purpose: the images jsonb carries a base64 blur per
 * photograph, most of its weight, so only the first photograph's thumbnail
 * URL leaves the server. Products are ordered by range name then product
 * name, the order the picker groups them in.
 *
 * Ranges: every published category that holds products of its own, plus
 * every empty leaf, so a range with sub ranges AND its own products (12mm
 * Sintered Stones beside Heixin 12mm) is listed too, named for what it
 * holds directly. The picker's select then drops the empty ones.
 */
export async function loadPickerCatalogue(): Promise<PickerCatalogue> {
  await requirePath('/quotes');
  const supabase = await getSupabase();

  const [{ data: categories, error: categoryError }, { data: products, error: productError }] =
    await Promise.all([
      supabase.from('categories').select('id, name, sort_order, parent_id, is_published').order('sort_order'),
      supabase
        .from('products')
        .select('id, name, slug, price, unit, price_display_mode, category_id, images')
        .is('deleted_at', null)
        .eq('is_published', true),
    ]);

  if (categoryError) throw new Error(`Could not load the catalogue: ${categoryError.message}`);
  if (productError) throw new Error(`Could not load the catalogue: ${productError.message}`);

  const rows = (categories ?? []) as CategoryRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));

  const hits: CatalogueHit[] = (products ?? []).map((row) => {
    const category = row.category_id ? byId.get(row.category_id) : undefined;
    const parent = category?.parent_id ? byId.get(category.parent_id) : undefined;
    const first = parseProductImages(row.images)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: row.price,
      unit: row.unit,
      priceDisplayMode: row.price_display_mode,
      categoryId: row.category_id,
      categoryName: category?.name ?? null,
      parentCategoryName: parent?.name ?? null,
      thumb: first ? productImageUrl(first.path, 400) : null,
    };
  });
  hits.sort(
    (a, b) =>
      compareNullableName(a.categoryName, b.categoryName) || a.name.localeCompare(b.name, 'en'),
  );

  const published = rows.filter((row) => row.is_published);
  const parentIds = new Set(published.map((row) => row.parent_id).filter((id): id is string => Boolean(id)));
  const counts = new Map<string, number>();
  for (const hit of hits) {
    if (!hit.categoryId) continue;
    counts.set(hit.categoryId, (counts.get(hit.categoryId) ?? 0) + 1);
  }

  const ranges = published
    .filter((row) => !parentIds.has(row.id) || (counts.get(row.id) ?? 0) > 0)
    .map((row) => {
      const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
      return {
        id: row.id,
        name: row.name,
        groupName: parent?.name ?? null,
        productCount: counts.get(row.id) ?? 0,
        groupSort: parent?.sort_order ?? row.sort_order ?? 0,
        sortOrder: row.sort_order ?? 0,
      };
    })
    .sort((a, b) => a.groupSort - b.groupSort || a.sortOrder - b.sortOrder)
    .map(({ groupSort: _groupSort, sortOrder: _sortOrder, ...range }) => range);

  return { products: hits, ranges };
}

/** Uncategorised products sort after every named range. */
function compareNullableName(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, 'en');
}
