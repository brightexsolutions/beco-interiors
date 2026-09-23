import { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Every category, published or not: an admin has to see a draft range to
 * publish it. `product_count` and `child_count` decide whether Delete is
 * offered, since neither a range with stock in it nor a group with children
 * under it can be removed without orphaning something.
 */
export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  isPublished: boolean;
  productCount: number;
  childCount: number;
  updatedAt: string;
}

/** A group with the ranges filed under it, for the tree the admin walks. */
export interface CategoryGroupRow extends CategoryRow {
  children: CategoryRow[];
}

const ROW_COLUMNS =
  'id,name,slug,description,meta_title,meta_description,parent_id,sort_order,is_published,updated_at,' +
  'parent:categories!categories_parent_id_fkey(name),' +
  'products(count)';

interface RawRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
  parent: { name: string } | { name: string }[] | null;
  products: { count: number }[] | null;
}

const parentNameOf = (parent: RawRow['parent']): string | null => {
  if (!parent) return null;
  return Array.isArray(parent) ? (parent[0]?.name ?? null) : parent.name;
};

const toRow = (raw: RawRow, childCount: number): CategoryRow => ({
  id: raw.id,
  name: raw.name,
  slug: raw.slug,
  description: raw.description,
  metaTitle: raw.meta_title,
  metaDescription: raw.meta_description,
  parentId: raw.parent_id,
  parentName: parentNameOf(raw.parent),
  sortOrder: raw.sort_order,
  isPublished: raw.is_published,
  productCount: raw.products?.[0]?.count ?? 0,
  childCount,
  updatedAt: raw.updated_at,
});

/** The whole taxonomy as a tree: every group, each with its own children.
 *  Two levels only, held up by the same trigger the storefront relies on. */
export async function fetchCategoryTree(supabase: SupabaseClient): Promise<CategoryGroupRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(ROW_COLUMNS)
    .order('sort_order');
  if (error) throw new Error(`Could not load categories: ${error.message}`);

  const rows = (data ?? []) as unknown as RawRow[];
  const childCountOf = new Map<string, number>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    childCountOf.set(row.parent_id, (childCountOf.get(row.parent_id) ?? 0) + 1);
  }

  const bySlugRow = rows.map((raw) => toRow(raw, childCountOf.get(raw.id) ?? 0));
  const childrenOf = new Map<string, CategoryRow[]>();
  for (const row of bySlugRow) {
    if (!row.parentId) continue;
    childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row]);
  }

  return bySlugRow
    .filter((row) => !row.parentId)
    .map((group) => ({ ...group, children: childrenOf.get(group.id) ?? [] }));
}

export async function fetchCategoryBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from('categories')
    .select(ROW_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load that category: ${error.message}`);
  if (!data) return null;
  const raw = data as unknown as RawRow;
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', raw.id);
  return toRow(raw, count ?? 0);
}

export interface CategoryParentOption {
  id: string;
  name: string;
}

/** Groups a new range can be filed under: top level categories with no
 *  parent of their own. A group that already has a parent cannot appear
 *  here, the depth trigger would refuse it anyway. */
export async function fetchCategoryGroupOptions(
  supabase: SupabaseClient,
  excludeId?: string,
): Promise<CategoryParentOption[]> {
  let query = supabase.from('categories').select('id,name').is('parent_id', null).order('name');
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load ranges: ${error.message}`);
  return (data ?? []) as CategoryParentOption[];
}
