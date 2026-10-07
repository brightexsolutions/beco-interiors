import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

/**
 * `executePlan` moving a photograph off a supplier named R2 key, against the
 * LOCAL database, D104 amended 7 October. R2 is replaced by a recorder, and
 * the download cache by nothing, so no object is written anywhere and no file
 * lands on disk: what is proven is which keys the run writes and what the
 * product row says afterwards. Its own range and stone, prefixed, so no real
 * catalogue row is touched.
 */
const uploads: string[] = [];
vi.mock('./storage', () => ({
  createStorage: () => ({ upload: async (key: string) => { uploads.push(key); return key; } }),
}));
vi.mock('./cache', () => ({ readCache: () => null, writeCache: () => {} }));

config({ path: new URL('../../../.env.local', import.meta.url).pathname, quiet: true });

const { buildPlan } = await import('./plan');
const { executePlan } = await import('./run');

const RANGE = 'ZZ INT REKEY RANGE';
const FILE_ID = 'zz-int-rekey-file-1';
const PATH = `${RANGE}/HEIXIN 12MM/ZZ INT REKEY STONE/SLAB.jpg`;
const PHOTO = readFileSync(new URL('./__tests__/fixtures/hinge-1181-silver-on-white.jpg', import.meta.url));

const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const runIds: string[] = [];
let productId = '';

const cleanUp = async () => {
  const sb = service();
  await sb.from('import_files').delete().eq('drive_file_id', FILE_ID);
  await sb.from('products').delete().ilike('slug', 'zz-int-rekey-%');
  await sb.from('categories').delete().ilike('slug', 'zz-int-rekey-%');
  if (runIds.length) await sb.from('import_runs').delete().in('id', runIds);
};

const plan = () =>
  buildPlan(
    [{ id: FILE_ID, path: PATH, md5: 'md5-zz-int-rekey', size: PHOTO.byteLength, modifiedTime: '2026-10-07T00:00:00Z' }],
    [],
    // Seen before, unchanged: nothing would be downloaded but for the re-key.
    [{ driveFileId: FILE_ID, path: PATH, md5: 'md5-zz-int-rekey', role: null, productId: null }],
  );

const source = { listAll: async () => [], listFolders: async () => [], download: vi.fn(async () => PHOTO) };

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  await cleanUp();
  const sb = service();
  const range = await sb.from('categories')
    .insert({ slug: 'zz-int-rekey-range', name: 'ZZ Int Rekey Range', is_published: true, source_path: RANGE })
    .select('id').single();
  expect(range.error).toBeNull();
  // The stone as a pre-amendment import left it: key and alt naming Heixin.
  const product = await sb.from('products').insert({
    slug: 'zz-int-rekey-stone', name: 'ZZ Int Rekey Stone', category_id: range.data!.id, is_published: true,
    price_display_mode: 'poa', source_path: `${RANGE}/HEIXIN 12MM/ZZ INT REKEY STONE`,
    images: [{
      role: 'slab', path: 'heixin-12mm/zz-int-rekey-stone/slab-0', alt: 'Zz Int Rekey Stone, Heixin 12mm, slab',
      width: 10, height: 10, blur: '', avgColor: '', dominantColor: '', lightness: 0, uniformBackground: false,
      sort: 0, driveFileId: FILE_ID,
    }],
  }).select('id').single();
  expect(product.error).toBeNull();
  productId = product.data!.id as string;
});

afterAll(cleanUp);

describe('executePlan re-keys a supplier named photograph', () => {
  it('writes new derivatives under the plan\'s key and points the product at them', async () => {
    const p = plan();
    expect(p.files[0]!.needsDownload).toBe(false);
    const result = await executePlan(p, source);
    runIds.push(result.runId);

    expect(result.failures).toEqual([]);
    expect(source.download).toHaveBeenCalledTimes(1);
    expect(uploads.length).toBeGreaterThan(0);
    for (const key of uploads) expect(key).toMatch(/^zz-int-rekey-range\/zz-int-rekey-stone\/slab-0-\d+\.(webp|avif)$/);

    const { data } = await service().from('products').select('images,name,slug').eq('id', productId).single();
    const images = data!.images as Array<{ path: string; alt: string; driveFileId: string }>;
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      path: 'zz-int-rekey-range/zz-int-rekey-stone/slab-0',
      alt: 'Zz Int Rekey Stone, Zz Int Rekey Range, slab',
      driveFileId: FILE_ID,
    });
    // Name and slug are the dashboard's once the row exists, D54.
    expect(data!.name).toBe('ZZ Int Rekey Stone');
    expect(data!.slug).toBe('zz-int-rekey-stone');
  });

  it('changes nothing on a second run, the key being clean now', async () => {
    uploads.length = 0;
    source.download.mockClear();
    const before = await service().from('products').select('images,updated_at').eq('id', productId).single();
    const result = await executePlan(plan(), source);
    runIds.push(result.runId);
    expect(source.download).not.toHaveBeenCalled();
    expect(uploads).toEqual([]);
    const after = await service().from('products').select('images,updated_at').eq('id', productId).single();
    expect(before.error).toBeNull();
    expect(after.data!.updated_at).toBe(before.data!.updated_at);
    expect(after.data).toEqual(before.data);
  });
});
