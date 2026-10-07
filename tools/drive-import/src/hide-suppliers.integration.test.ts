import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { applyHidePlan, planHideSuppliers, planIsEmpty, readSnapshot } from './hide-suppliers';
import { getCanonicalCategorySlug } from '../../../apps/storefront/src/lib/products';

/**
 * The one-off supplier correction against the LOCAL stack, end to end:
 * read, plan, write, read again, and the storefront's own redirect lookup.
 *
 * It runs with a supplier word of its own, never Heixin or Delfone, so it
 * touches only the rows it makes: the local catalogue mirrors production
 * after a real import, and a test must not be the thing that moves it.
 */
config({ path: new URL('../../../.env.local', import.meta.url).pathname, quiet: true });

const WORD = 'ZQXINTSUP';
const PREFIX = 'zz-int-sup';

const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const ids = { range: '', supplier: '', stone: '', named: '' };

const cleanUp = async () => {
  const sb = service();
  await sb.from('products').delete().ilike('slug', `${PREFIX}-%`);
  await sb.from('categories').delete().ilike('slug', `${PREFIX}-%-12mm`);
  await sb.from('categories').delete().ilike('slug', `${PREFIX}-%`);
};

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  await cleanUp();
  const sb = service();
  const range = await sb.from('categories')
    .insert({ slug: `${PREFIX}-range`, name: 'ZZ Int Sup Range', is_published: true })
    .select('id').single();
  expect(range.error).toBeNull();
  ids.range = range.data!.id as string;
  const supplier = await sb.from('categories')
    .insert({ slug: `${PREFIX}-zqxintsup-12mm`, name: 'Zqxintsup 12mm', parent_id: ids.range, is_published: true })
    .select('id').single();
  expect(supplier.error).toBeNull();
  ids.supplier = supplier.data!.id as string;

  const image = (path: string, alt: string) => ({ role: 'slab', path, alt, width: 1600, height: 1200, sort: 0, blur: 'x' });
  const products = await sb.from('products').insert([
    {
      slug: `${PREFIX}-ink`, name: 'ZZ Ink', category_id: ids.supplier, is_published: true, price_display_mode: 'poa',
      images: [image(`${PREFIX}-zqxintsup-12mm/${PREFIX}-ink/slab-0`, 'ZZ Ink, Zqxintsup 12mm, slab')],
    },
    {
      slug: `${PREFIX}-zqxintsup-9`, name: 'ZZ Int Sup Slate Blue', category_id: ids.range, is_published: false, price_display_mode: 'poa',
      images: [image(`${PREFIX}-range/${PREFIX}-zqxintsup-9/slab-0`, 'Zqxintsup 9, ZZ Int Sup Range, slab')],
    },
  ]).select('id,slug');
  expect(products.error).toBeNull();
  ids.stone = products.data!.find((p) => p.slug === `${PREFIX}-ink`)!.id as string;
  ids.named = products.data!.find((p) => p.slug !== `${PREFIX}-ink`)!.id as string;
});

afterAll(cleanUp);

describe('hiding supplier names, against the local database', () => {
  it('plans only the rows carrying its own word, and never a real catalogue row', async () => {
    const plan = planHideSuppliers(await readSnapshot(service()), [WORD]);
    expect(plan.categories.map((c) => c.category.id)).toEqual([ids.supplier]);
    expect(plan.products.map((p) => p.id).sort()).toEqual([ids.stone, ids.named].sort());
  });

  it('moves, renames, redirects and unpublishes, then finds nothing left to do', async () => {
    const sb = service();
    // Before: the supplier range is a real page, its slug resolves to itself.
    expect(await getCanonicalCategorySlug(`${PREFIX}-zqxintsup-12mm`)).toBeNull();

    await applyHidePlan(sb, planHideSuppliers(await readSnapshot(sb), [WORD]));

    const { data: stone } = await sb.from('products').select('category_id,images').eq('id', ids.stone).single();
    expect(stone!.category_id).toBe(ids.range);
    expect((stone!.images as Array<{ alt: string; path: string }>)[0]).toMatchObject({
      alt: 'ZZ Ink, ZZ Int Sup Range, slab',
      // The key is the next import's to move, with the photograph.
      path: `${PREFIX}-zqxintsup-12mm/${PREFIX}-ink/slab-0`,
    });

    const { data: named } = await sb.from('products').select('slug,name,images').eq('id', ids.named).single();
    expect(named!.slug).toBe(`${PREFIX}-slate-blue`);
    expect(named!.name).toBe('ZZ Int Sup Slate Blue');
    expect((named!.images as Array<{ alt: string }>)[0]!.alt).toBe('ZZ Int Sup Slate Blue, ZZ Int Sup Range, slab');
    const { data: history } = await sb.from('product_slugs').select('slug').eq('product_id', ids.named);
    expect(history!.map((h) => h.slug).sort()).toEqual([`${PREFIX}-slate-blue`, `${PREFIX}-zqxintsup-9`].sort());

    const { data: supplier } = await sb.from('categories').select('is_published').eq('id', ids.supplier).single();
    expect(supplier!.is_published).toBe(false);

    // The storefront's own lookup, as anon: the retired URL now answers for
    // the range its stones moved to.
    expect(await getCanonicalCategorySlug(`${PREFIX}-zqxintsup-12mm`)).toBe(`${PREFIX}-range`);

    expect(planIsEmpty(planHideSuppliers(await readSnapshot(sb), [WORD]))).toBe(true);
  });

  it('never resolves a former slug to a range the public cannot see', async () => {
    const sb = service();
    await sb.from('categories').update({ is_published: false }).eq('id', ids.range);
    expect(await getCanonicalCategorySlug(`${PREFIX}-zqxintsup-12mm`)).toBeNull();
    await sb.from('categories').update({ is_published: true }).eq('id', ids.range);
  });
});
