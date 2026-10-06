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
  categoryName: string | null;
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

interface CategoryRow {
  id: string;
  name: string;
  sort_order?: number;
  parent_id: string | null;
}

/**
 * Ranges for the quote picker: every category that holds products of its
 * own, plus every empty leaf, so a counter salesperson can open Handles
 * even when the first page of published products is all stone. A range
 * that has sub ranges AND its own products (12mm Sintered Stones beside
 * Heixin 12mm) is listed too, named for what it holds directly.
 */
export async function listCatalogueRanges(): Promise<CatalogueRange[]> {
  await requirePath('/quotes');
  const supabase = await getSupabase();

  const [{ data: categories, error: categoryError }, { data: products, error: productError }] =
    await Promise.all([
      supabase
        .from('categories')
        .select('id, name, sort_order, parent_id')
        .eq('is_published', true)
        .order('sort_order'),
      supabase.from('products').select('category_id').is('deleted_at', null).eq('is_published', true),
    ]);

  if (categoryError) throw new Error(`Could not load ranges: ${categoryError.message}`);
  if (productError) throw new Error(`Could not load ranges: ${productError.message}`);

  const rows = (categories ?? []) as CategoryRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const parentIds = new Set(rows.map((row) => row.parent_id).filter((id): id is string => Boolean(id)));
  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    if (!product.category_id) continue;
    counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
  }

  return rows
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
}

/**
 * Live catalogue for the counter flow. Published, not deleted.
 * An empty term returns products across every range, not a first page of
 * stone. A range id narrows to that Drive folder. Typing matches a product
 * name or a range name, so "handle" finds the hardware rather than nothing.
 */
export async function searchCatalogue(term: string, rangeId?: string | null): Promise<CatalogueHit[]> {
  await requirePath('/quotes');
  const q = term.replace(/[%_,()"\\]/g, '').trim().slice(0, 80);
  const range = rangeId?.trim() || null;

  const supabase = await getSupabase();
  let request = supabase
    .from('products')
    .select('id, name, slug, price, unit, price_display_mode, images, categories(name)')
    .is('deleted_at', null)
    .eq('is_published', true)
    .order('name', { referencedTable: 'categories' })
    .order('name')
    .limit(200);

  if (range) {
    request = request.eq('category_id', range);
  }

  if (q.length > 0) {
    if (range) {
      request = request.ilike('name', `%${q}%`);
    } else {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('is_published', true);
      if (error) throw new Error(`Could not search products: ${error.message}`);

      const rows = (categories ?? []) as CategoryRow[];
      const byId = new Map(rows.map((row) => [row.id, row]));
      const needle = q.toLowerCase();
      const matchingIds = rows
        .filter((row) => {
          const parentName = row.parent_id ? byId.get(row.parent_id)?.name : undefined;
          return row.name.toLowerCase().includes(needle) || (parentName?.toLowerCase().includes(needle) ?? false);
        })
        .map((row) => row.id);

      request =
        matchingIds.length > 0
          ? request.or(`name.ilike.%${q}%,category_id.in.(${matchingIds.join(',')})`)
          : request.ilike('name', `%${q}%`);
    }
  }

  const { data, error } = await request;
  if (error) throw new Error(`Could not search products: ${error.message}`);

  return (data ?? []).map((row) => {
    const category = row.categories as { name: string } | { name: string }[] | null;
    const categoryName = Array.isArray(category) ? (category[0]?.name ?? null) : (category?.name ?? null);
    const first = parseProductImages(row.images)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: row.price,
      unit: row.unit,
      priceDisplayMode: row.price_display_mode,
      categoryName,
      thumb: first ? productImageUrl(first.path, 400) : null,
    };
  });
}
