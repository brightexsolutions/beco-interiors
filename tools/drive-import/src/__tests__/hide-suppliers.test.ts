import { describe, expect, it } from 'vitest';
import {
  applyHidePlan, describePlan, freeSlug, planHideSuppliers, planIsEmpty, supplierFreeName,
  type CategoryRow, type ProductRow, type Snapshot,
} from '../hide-suppliers';

/**
 * The one-off correction, against the shape production had on 7 October:
 * Heixin 12mm published under 12mm Sintered Stones holding seven stones, and
 * the Delfone product, renamed in the dashboard but still on its old slug.
 */
const cat = (id: string, slug: string, name: string, parent_id: string | null, source_path: string | null = null): CategoryRow =>
  ({ id, slug, name, parent_id, is_published: true, source_path });

const img = (path: string, alt: string, role = 'slab') => ({ role, path, alt, width: 1600, height: 1200, sort: 0, driveFileId: path });

const product = (id: string, slug: string, name: string, category_id: string, images: unknown[] = []): ProductRow =>
  ({ id, slug, name, category_id, images, description: null, short_description: null, meta_title: null, meta_description: null });

const STONES = ['Prada Green', 'Ink White', 'Hanting Jade', 'Appricot', 'Hermes Gold', 'Black Sandstone', 'Anakin'];
const slugOf = (name: string) => name.toLowerCase().replace(/ /g, '-');

const production = (): Snapshot => ({
  categories: [
    cat('sin', 'sintered-stone', 'Sintered Stone', null),
    cat('12', '12mm-sintered-stones', '12mm Sintered Stones', 'sin', '12MM SINTERED STONES'),
    cat('hx', 'heixin-12mm', 'Heixin 12mm', '12', '12MM SINTERED STONES/HEIXIN 12MM'),
  ],
  products: [
    ...STONES.map((name, i) => product(`s${i}`, slugOf(name), name, 'hx', [
      img(`heixin-12mm/${slugOf(name)}/slab-0`, `${name}, Heixin 12mm, slab`),
      img(`heixin-12mm/${slugOf(name)}/application-1`, `${name}, Heixin 12mm, application`, 'application'),
    ])),
    product('df', 'delfone-12mm', 'slate blue 12mm', '12', [
      img('12mm-sintered-stones/delfone-12mm/slab-0', 'Delfone 12mm, 12mm Sintered Stones, slab'),
    ]),
    product('aj', 'amber-jade', 'Amber Jade', '12', [img('12mm-sintered-stones/amber-jade/slab-0', 'Amber Jade, 12mm Sintered Stones, slab')]),
  ],
  categorySlugs: [
    { slug: 'sintered-stone', category_id: 'sin' },
    { slug: '12mm-sintered-stones', category_id: '12' },
    { slug: 'heixin-12mm', category_id: 'hx' },
  ],
  productSlugs: [
    ...STONES.map((name, i) => ({ slug: slugOf(name), product_id: `s${i}` })),
    { slug: 'delfone-12mm', product_id: 'df' },
    { slug: 'amber-jade', product_id: 'aj' },
  ],
});

/** Applies a plan to a snapshot in memory, the way the database would. */
const fakeDb = (snap: Snapshot) => {
  const calls: string[] = [];
  const table = (name: string) => {
    let values: Record<string, unknown> = {};
    const chain = {
      update(v: Record<string, unknown>) { values = v; return chain; },
      upsert(v: { slug: string; product_id: string }) {
        calls.push(`upsert ${name} ${v.slug}`);
        if (!snap.productSlugs.some((s) => s.slug === v.slug)) snap.productSlugs.push(v);
        return Promise.resolve({ error: null });
      },
      eq(column: string, value: string) {
        calls.push(`update ${name} ${column}=${value} ${JSON.stringify(Object.keys(values))}`);
        if (name === 'products') {
          const row = snap.products.find((p) => p.id === value)!;
          Object.assign(row, values);
          if (typeof values.slug === 'string' && !snap.productSlugs.some((s) => s.slug === values.slug)) {
            snap.productSlugs.push({ slug: values.slug, product_id: row.id });
          }
        }
        if (name === 'categories') Object.assign(snap.categories.find((c) => c.id === value)!, values);
        if (name === 'category_slugs') Object.assign(snap.categorySlugs.find((s) => s.slug === value)!, values);
        return Promise.resolve({ error: null });
      },
    };
    return chain;
  };
  return { sb: { from: table } as never, calls };
};

describe('planHideSuppliers against the 7 October production shape', () => {
  it('moves the seven stones to 12mm Sintered Stones, unpublishes Heixin 12mm and redirects its URL', () => {
    const plan = planHideSuppliers(production());
    expect(plan.categories).toEqual([{
      category: { id: 'hx', slug: 'heixin-12mm', name: 'Heixin 12mm' },
      into: { id: '12', slug: '12mm-sintered-stones', name: '12mm Sintered Stones' },
      unpublish: true,
    }]);
    expect(plan.redirects.map((r) => [r.slug, r.to.slug])).toEqual([['heixin-12mm', '12mm-sintered-stones']]);
    const moved = plan.products.filter((p) => p.move);
    expect(moved).toHaveLength(7);
    for (const p of moved) expect(p.move!.to.slug).toBe('12mm-sintered-stones');
  });

  it('rewrites every Heixin alt text to the stone, its new range and the shot', () => {
    const plan = planHideSuppliers(production());
    const hanting = plan.products.find((p) => p.slug === 'hanting-jade')!;
    expect(hanting.alts).toEqual([
      { index: 0, from: 'Hanting Jade, Heixin 12mm, slab', to: 'Hanting Jade, 12mm Sintered Stones, slab' },
      { index: 1, from: 'Hanting Jade, Heixin 12mm, application', to: 'Hanting Jade, 12mm Sintered Stones, application' },
    ]);
    // Only alt changes; every other field of the entry is carried as it was.
    expect(hanting.images![0]).toMatchObject({ path: 'heixin-12mm/hanting-jade/slab-0', width: 1600, role: 'slab' });
  });

  it('gives the Delfone product a slug from its own name and keeps the old one redirecting', () => {
    const plan = planHideSuppliers(production());
    const delfone = plan.products.find((p) => p.id === 'df')!;
    expect(delfone.rename).toBeUndefined();
    expect(delfone.reslug).toEqual({ from: 'delfone-12mm', to: 'slate-blue-12mm', keepOldSlug: false });
    expect(delfone.alts[0]!.to).toBe('slate blue 12mm, 12mm Sintered Stones, slab');
  });

  it('lists every image key still naming a supplier, rather than claiming it is gone', () => {
    const plan = planHideSuppliers(production());
    expect(plan.remainingKeys).toHaveLength(15);
    expect(plan.remainingKeys).toContainEqual({ product: 'slate-blue-12mm', path: '12mm-sintered-stones/delfone-12mm/slab-0' });
  });

  it('leaves a product with nothing to fix alone', () => {
    const plan = planHideSuppliers(production());
    expect(plan.products.find((p) => p.slug === 'amber-jade')).toBeUndefined();
  });

  it('prints one line per change, none of them an em dash', () => {
    const lines = describePlan(planHideSuppliers(production()));
    expect(lines).toContain('REDIRECT   /shop/heixin-12mm to /shop/12mm-sintered-stones');
    expect(lines).toContain('PRODUCT    hanting-jade: move from heixin-12mm to 12mm-sintered-stones');
    expect(lines).toContain('PRODUCT    delfone-12mm: slug delfone-12mm to slate-blue-12mm, /product/delfone-12mm redirects');
    expect(lines.join('\n')).not.toContain(String.fromCharCode(0x2014));
  });
});

describe('applyHidePlan', () => {
  it('writes products before the range is unpublished, and a second plan finds nothing to do', async () => {
    const snap = production();
    const { sb, calls } = fakeDb(snap);
    const plan = planHideSuppliers(snap);
    expect(planIsEmpty(plan)).toBe(false);
    await applyHidePlan(sb, plan);

    const unpublish = calls.findIndex((c) => c.startsWith('update categories id=hx'));
    const lastProduct = calls.map((c) => c.startsWith('update products')).lastIndexOf(true);
    expect(unpublish).toBeGreaterThan(lastProduct);

    expect(snap.categories.find((c) => c.id === 'hx')!.is_published).toBe(false);
    expect(snap.products.filter((p) => p.category_id === 'hx')).toEqual([]);
    expect(snap.categorySlugs.find((s) => s.slug === 'heixin-12mm')!.category_id).toBe('12');
    expect(snap.products.find((p) => p.id === 'df')!.slug).toBe('slate-blue-12mm');
    expect(snap.productSlugs).toContainEqual({ slug: 'delfone-12mm', product_id: 'df' });

    const again = planHideSuppliers(snap);
    expect(planIsEmpty(again)).toBe(true);
    expect(again.products).toEqual([]);
    expect(describePlan(again)[0]).toBe(
      'RANGE      Heixin 12mm (heixin-12mm): already unpublished, its products file in 12mm Sintered Stones (12mm-sintered-stones)',
    );
  });

  it('records the old slug when the history table never had it, so it still redirects', async () => {
    const snap = production();
    snap.productSlugs = snap.productSlugs.filter((s) => s.slug !== 'delfone-12mm');
    const { sb, calls } = fakeDb(snap);
    const plan = planHideSuppliers(snap);
    expect(plan.products.find((p) => p.id === 'df')!.reslug!.keepOldSlug).toBe(true);
    await applyHidePlan(sb, plan);
    expect(calls).toContain('upsert product_slugs delfone-12mm');
    expect(snap.productSlugs).toContainEqual({ slug: 'delfone-12mm', product_id: 'df' });
  });

  it('stops on the first refused write and names it', async () => {
    const plan = planHideSuppliers(production());
    const failing = { from: () => ({ update: () => ({ eq: async () => ({ error: { message: 'denied' } }) }), upsert: async () => ({ error: null }) }) };
    await expect(applyHidePlan(failing as never, plan)).rejects.toThrow(/could not update product prada-green: denied/);
  });
});

describe('the other shapes', () => {
  it('names a product called only for its supplier after its range', () => {
    expect(supplierFreeName('Delfone 12mm', '12mm Sintered Stones')).toBe('12mm Sintered Stone');
    expect(supplierFreeName('Heixin Statuario', '12mm Sintered Stones')).toBe('Statuario');
    expect(supplierFreeName('Delfone', undefined)).toBe('Product');
  });

  it('renames and reslugs a product whose name is only the supplier, avoiding a slug already taken', () => {
    const snap = production();
    snap.products.find((p) => p.id === 'df')!.name = 'Delfone 12mm';
    snap.products.push(product('x', '12mm-sintered-stone', 'Other', '12'));
    const fix = planHideSuppliers(snap).products.find((p) => p.id === 'df')!;
    expect(fix.rename).toEqual({ from: 'Delfone 12mm', to: '12mm Sintered Stone' });
    expect(fix.reslug!.to).toBe('12mm-sintered-stone-2');
  });

  it('never reuses a slug another product held before', () => {
    expect(freeSlug('statuario', new Set(['statuario', 'statuario-2']))).toBe('statuario-3');
    expect(freeSlug('statuario', new Set())).toBe('statuario');
  });

  it('moves a range inside a supplier range up with it, and a nested supplier range lands on the first real one', () => {
    const snap = production();
    snap.categories.push(cat('in', 'bookmatched', 'Bookmatched', 'hx'), cat('dx', 'delfone-15mm', 'Delfone 15mm', 'hx'));
    snap.products.push(product('n', 'nero', 'Nero', 'dx'));
    const plan = planHideSuppliers(snap);
    expect(plan.subRanges.map((s) => [s.category.slug, s.to.slug])).toEqual([['bookmatched', '12mm-sintered-stones']]);
    expect(plan.products.find((p) => p.id === 'n')!.move!.to.slug).toBe('12mm-sintered-stones');
  });

  it('skips a supplier range at the top, with nowhere to move to, and says so', () => {
    const snap: Snapshot = {
      categories: [cat('t', 'heixin', 'Heixin', null)],
      products: [product('p', 'ink', 'Ink', 't')],
      categorySlugs: [{ slug: 'heixin', category_id: 't' }],
      productSlugs: [],
    };
    const plan = planHideSuppliers(snap);
    expect(plan.categories).toEqual([]);
    expect(plan.redirects).toEqual([]);
    expect(plan.skipped[0]).toMatch(/Heixin \(heixin\) has no range above it/);
  });

  it('reports copy a person wrote that names a supplier, and leaves it for the dashboard', () => {
    const snap = production();
    snap.products.find((p) => p.id === 'aj')!.description = 'Imported from Heixin.';
    const plan = planHideSuppliers(snap);
    expect(plan.remainingCopy).toEqual([{ product: 'amber-jade', field: 'description' }]);
    expect(plan.products.find((p) => p.id === 'aj')).toBeUndefined();
  });
});
