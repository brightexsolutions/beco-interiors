import type { SupabaseClient } from '@supabase/supabase-js';
import { singularNoun } from './plan';
import { slugify } from './slug';
import { containsSupplier, namesSomething, SUPPLIER_WORDS, withoutSupplier } from './supplier';

/**
 * The one-off correction for catalogues imported before supplier folders
 * were read through, D104 amended 7 October 2026.
 *
 * The importer now plans nothing that names a supplier, but it never renames
 * or refiles a product that already exists (D54), so the rows it made before
 * stay as they were: a published "Heixin 12mm" range holding seven stones,
 * alt text reading "Hanting Jade, Heixin 12mm, slab", a product whose slug is
 * `delfone-12mm`. This puts them right, in the database only:
 *
 *  - every product in a supplier range moves to the nearest range above it
 *    that is not a supplier's, and so does any range inside it
 *  - the supplier range is unpublished, never deleted, so its row and its
 *    audit history stay
 *  - its former URLs, held in `category_slugs`, point at that range, so
 *    /shop/heixin-12mm answers with a redirect to /shop/12mm-sintered-stones
 *  - a product name or slug carrying a supplier word loses it; the old slug
 *    stays in `product_slugs`, which the product page redirects from
 *  - alt text naming a supplier is rewritten: "Hanting Jade, 12mm Sintered
 *    Stones, slab"
 *
 * Image keys are NOT changed here: they name objects in R2, and renaming the
 * key without moving the object would break the photograph. The next import
 * re-keys them (`needsRekey` in run.ts). Every such key is listed as
 * remaining, so nothing is claimed that was not done.
 *
 * Pure planning, separate from writing, so the dry run prints exactly what a
 * real run does and a test can hold both to the same plan. Running it twice
 * changes nothing the second time.
 */

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  is_published: boolean;
  source_path: string | null;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  images: unknown;
  description?: string | null;
  short_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface Snapshot {
  categories: CategoryRow[];
  products: ProductRow[];
  categorySlugs: Array<{ slug: string; category_id: string }>;
  productSlugs: Array<{ slug: string; product_id: string }>;
}

interface CategoryRef { id: string; slug: string; name: string }

export interface SupplierCategoryFix {
  category: CategoryRef;
  /** The nearest range above it that is not a supplier's. */
  into: CategoryRef;
  unpublish: boolean;
}

export interface ProductFix {
  id: string;
  slug: string;
  move?: { from: CategoryRef; to: CategoryRef };
  rename?: { from: string; to: string };
  reslug?: { from: string; to: string; keepOldSlug: boolean };
  alts: Array<{ index: number; from: string; to: string }>;
  /** The full images array to write, when any alt changed. */
  images?: unknown[];
}

export interface HidePlan {
  categories: SupplierCategoryFix[];
  /** Ranges inside a supplier range, moved up with its products. */
  subRanges: Array<{ category: CategoryRef; from: CategoryRef; to: CategoryRef }>;
  /** Former category URLs pointed at the range that replaces them. */
  redirects: Array<{ slug: string; from: CategoryRef; to: CategoryRef }>;
  products: ProductFix[];
  /** Image keys still carrying a supplier word, re-keyed by the next import. */
  remainingKeys: Array<{ product: string; path: string }>;
  /** Copy a person wrote in the dashboard, never rewritten by a script. */
  remainingCopy: Array<{ product: string; field: string }>;
  /** Supplier ranges with nowhere to move to. */
  skipped: string[];
}

const ref = (c: CategoryRow): CategoryRef => ({ id: c.id, slug: c.slug, name: c.name });

const isSupplierCategory = (c: CategoryRow, words: readonly string[]): boolean =>
  containsSupplier(c.name, words) ||
  containsSupplier(c.slug, words) ||
  containsSupplier(c.source_path?.split('/').pop() ?? '', words);

/** What a product is called once the supplier word is out of its name. */
export const supplierFreeName = (name: string, categoryName: string | undefined, words: readonly string[] = SUPPLIER_WORDS): string => {
  const rest = withoutSupplier(name, words);
  if (namesSomething(rest)) return rest;
  return categoryName ? singularNoun(categoryName) : 'Product';
};

/** A slug no other product holds now or held before, `slug-2` onwards when it is taken. */
export const freeSlug = (wanted: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(wanted)) return wanted;
  for (let n = 2; ; n++) if (!taken.has(`${wanted}-${n}`)) return `${wanted}-${n}`;
};

export const planHideSuppliers = (snap: Snapshot, words: readonly string[] = SUPPLIER_WORDS): HidePlan => {
  const byId = new Map(snap.categories.map((c) => [c.id, c]));
  const supplier = new Set(snap.categories.filter((c) => isSupplierCategory(c, words)).map((c) => c.id));

  /** The nearest range above, or itself, that is not a supplier's. */
  const landing = (id: string | null): CategoryRow | undefined => {
    let current = id ? byId.get(id) : undefined;
    const seen = new Set<string>();
    while (current && supplier.has(current.id) && !seen.has(current.id)) {
      seen.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return current && !supplier.has(current.id) ? current : undefined;
  };

  const plan: HidePlan = {
    categories: [], subRanges: [], redirects: [], products: [], remainingKeys: [], remainingCopy: [], skipped: [],
  };

  for (const id of supplier) {
    const category = byId.get(id)!;
    const into = landing(id);
    if (!into) {
      plan.skipped.push(
        `${category.name} (${category.slug}) has no range above it that is not a supplier's, so nothing was moved. ` +
          'Unpublish or rename it in the dashboard.',
      );
      continue;
    }
    plan.categories.push({ category: ref(category), into: ref(into), unpublish: category.is_published });
    for (const child of snap.categories) {
      if (child.parent_id === id && !supplier.has(child.id)) {
        plan.subRanges.push({ category: ref(child), from: ref(category), to: ref(into) });
      }
    }
    for (const row of snap.categorySlugs) {
      if (row.category_id === id) plan.redirects.push({ slug: row.slug, from: ref(category), to: ref(into) });
    }
  }

  const taken = new Set([...snap.products.map((p) => p.slug), ...snap.productSlugs.map((s) => s.slug)]);
  const historyOf = new Map(snap.productSlugs.map((s) => [s.slug, s.product_id]));

  for (const p of snap.products) {
    const fix: ProductFix = { id: p.id, slug: p.slug, alts: [] };
    const current = p.category_id ? byId.get(p.category_id) : undefined;
    const target = p.category_id && supplier.has(p.category_id) ? landing(p.category_id) : current;
    if (current && target && current.id !== target.id) fix.move = { from: ref(current), to: ref(target) };

    const name = containsSupplier(p.name, words) ? supplierFreeName(p.name, target?.name, words) : p.name;
    if (name !== p.name) fix.rename = { from: p.name, to: name };

    if (containsSupplier(p.slug, words)) {
      const others = new Set([...taken].filter((s) => s !== p.slug && historyOf.get(s) !== p.id));
      const to = freeSlug(slugify(name), others);
      fix.reslug = { from: p.slug, to, keepOldSlug: historyOf.get(p.slug) !== p.id };
      taken.add(to);
    }

    if (Array.isArray(p.images)) {
      const images = p.images.map((entry: unknown, index: number) => {
        if (!entry || typeof entry !== 'object') return entry;
        const e = entry as Record<string, unknown>;
        if (typeof e.path === 'string' && containsSupplier(e.path, words)) {
          plan.remainingKeys.push({ product: fix.reslug?.to ?? p.slug, path: e.path });
        }
        if (typeof e.alt !== 'string' || !containsSupplier(e.alt, words)) return entry;
        const role = typeof e.role === 'string' ? e.role.replace('_', ' ') : '';
        const to = [name, target?.name, role].filter(Boolean).join(', ');
        fix.alts.push({ index, from: e.alt, to });
        return { ...e, alt: to };
      });
      if (fix.alts.length) fix.images = images;
    }

    for (const field of ['description', 'short_description', 'meta_title', 'meta_description'] as const) {
      const value = p[field];
      if (typeof value === 'string' && containsSupplier(value, words)) {
        plan.remainingCopy.push({ product: fix.reslug?.to ?? p.slug, field });
      }
    }

    if (fix.move || fix.rename || fix.reslug || fix.alts.length) plan.products.push(fix);
  }

  return plan;
};

/** Whether the plan writes anything at all. */
export const planIsEmpty = (plan: HidePlan): boolean =>
  !plan.categories.some((c) => c.unpublish) &&
  !plan.subRanges.length &&
  !plan.redirects.some((r) => r.from.id !== r.to.id) &&
  !plan.products.length;

/** Every change on its own line, for the dry run and the real run alike. */
export const describePlan = (plan: HidePlan): string[] => {
  const L: string[] = [];
  for (const c of plan.categories) {
    L.push(`RANGE      ${c.category.name} (${c.category.slug}): ` +
      `${c.unpublish ? 'unpublish' : 'already unpublished'}, its products file in ${c.into.name} (${c.into.slug})`);
  }
  for (const s of plan.subRanges) {
    L.push(`SUB RANGE  ${s.category.name} (${s.category.slug}): move from ${s.from.slug} to ${s.to.slug}`);
  }
  for (const r of plan.redirects) {
    L.push(`REDIRECT   /shop/${r.slug} to /shop/${r.to.slug}`);
  }
  for (const p of plan.products) {
    const head = `PRODUCT    ${p.slug}:`;
    if (p.move) L.push(`${head} move from ${p.move.from.slug} to ${p.move.to.slug}`);
    if (p.rename) L.push(`${head} rename "${p.rename.from}" to "${p.rename.to}"`);
    if (p.reslug) {
      L.push(`${head} slug ${p.reslug.from} to ${p.reslug.to}, /product/${p.reslug.from} redirects` +
        `${p.reslug.keepOldSlug ? ' (old slug recorded now)' : ''}`);
    }
    for (const a of p.alts) L.push(`${head} alt [${a.index}] "${a.from}" to "${a.to}"`);
  }
  for (const s of plan.skipped) L.push(`SKIPPED    ${s}`);
  for (const k of plan.remainingKeys) L.push(`REMAINING  image key ${k.path} (${k.product}), re-keyed by the next import`);
  for (const c of plan.remainingCopy) L.push(`REMAINING  ${c.product} ${c.field} names a supplier: edit it in the dashboard`);
  return L;
};

/** Reads everything the plan needs, with the service role, deleted products left out. */
export const readSnapshot = async (sb: SupabaseClient): Promise<Snapshot> => {
  const [categories, products, categorySlugs, productSlugs] = await Promise.all([
    sb.from('categories').select('id,slug,name,parent_id,is_published,source_path'),
    sb.from('products')
      .select('id,slug,name,category_id,images,description,short_description,meta_title,meta_description')
      .is('deleted_at', null),
    sb.from('category_slugs').select('slug,category_id'),
    sb.from('product_slugs').select('slug,product_id'),
  ]);
  for (const [label, res] of [['categories', categories], ['products', products],
    ['category_slugs', categorySlugs], ['product_slugs', productSlugs]] as const) {
    if (res.error) throw new Error(`could not read ${label}: ${res.error.message}`);
  }
  return {
    categories: (categories.data ?? []) as CategoryRow[],
    products: (products.data ?? []) as ProductRow[],
    categorySlugs: (categorySlugs.data ?? []) as Snapshot['categorySlugs'],
    productSlugs: (productSlugs.data ?? []) as Snapshot['productSlugs'],
  };
};

const must = async (what: string, run: PromiseLike<{ error: { message: string } | null }>): Promise<void> => {
  const { error } = await run;
  if (error) throw new Error(`${what}: ${error.message}`);
};

/**
 * Writes the plan. Products first, so a range is never unpublished while
 * stones still sit in it; then the ranges inside, the redirects, and last
 * the unpublish. Each write stands alone and is safe to repeat, so a run
 * stopped half way is finished by running it again.
 */
export const applyHidePlan = async (sb: SupabaseClient, plan: HidePlan): Promise<void> => {
  for (const p of plan.products) {
    const update: Record<string, unknown> = {};
    if (p.move) update.category_id = p.move.to.id;
    if (p.rename) update.name = p.rename.to;
    if (p.reslug) update.slug = p.reslug.to;
    if (p.images) update.images = p.images;
    if (p.reslug?.keepOldSlug) {
      await must(`could not keep ${p.reslug.from} as a redirect`, sb
        .from('product_slugs')
        .upsert({ slug: p.reslug.from, product_id: p.id }, { onConflict: 'slug', ignoreDuplicates: true }));
    }
    await must(`could not update product ${p.slug}`, sb.from('products').update(update).eq('id', p.id));
  }
  for (const s of plan.subRanges) {
    await must(`could not move range ${s.category.slug}`,
      sb.from('categories').update({ parent_id: s.to.id }).eq('id', s.category.id));
  }
  for (const r of plan.redirects) {
    await must(`could not redirect ${r.slug}`,
      sb.from('category_slugs').update({ category_id: r.to.id }).eq('slug', r.slug));
  }
  for (const c of plan.categories) {
    if (!c.unpublish) continue;
    await must(`could not unpublish ${c.category.slug}`,
      sb.from('categories').update({ is_published: false }).eq('id', c.category.id));
  }
};
