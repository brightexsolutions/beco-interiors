import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';
import { ensureTestUser } from './__tests__/ensure-test-user';
import { fetchProducts } from './products';
import { PRODUCT_WRITE_REFUSED_MESSAGE, STALE_PRODUCT_MESSAGE, writeProductPublished } from './product-publish';

/**
 * The editor's Publish and Unpublish control (D133), run as each role against
 * the LOCAL database: the write `setProductPublished` makes once its route
 * check and zod parse have passed. RLS decides who may write, the lock decides
 * whether the editor was looking at the current row, and the audit trigger
 * records it.
 */
config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const SLUG = 'zz-int-publish-draft';
const PASSWORD = 'zz-integration-test-pass';
const PM_EMAIL = 'zz-int-publish-pm@beco.co.ke';
const SALES_EMAIL = 'zz-int-publish-sales@beco.co.ke';


const service = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const signInAs = async (email: string) => {
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in failed for ${email}: ${error.message}`);
  return client;
};

const current = async () => {
  const { data } = await service().from('products').select('is_published, updated_at').eq('slug', SLUG).single();
  return data!;
};

let productId: string;
let pmId: string;

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  const sb = service();
  await sb.from('products').delete().eq('slug', SLUG);
  pmId = await ensureTestUser(sb, {
    email: PM_EMAIL,
    password: PASSWORD,
    fullName: 'ZZ Publish PM',
    role: 'beco_product_manager',
  });
  await ensureTestUser(sb, {
    email: SALES_EMAIL,
    password: PASSWORD,
    fullName: 'ZZ Publish Sales',
    role: 'beco_sales',
  });
  const inserted = await sb
    .from('products')
    .insert({
      name: 'ZZ Publish Draft',
      slug: SLUG,
      price: 64000,
      price_display_mode: 'fixed',
      is_published: false,
      unit: 'per slab',
      availability: 'in_stock',
      images: [],
      specs: {},
    })
    .select('id')
    .single();
  expect(inserted.error).toBeNull();
  productId = inserted.data!.id;
});

afterAll(async () => {
  await service().from('products').delete().eq('slug', SLUG);
});

describe('writeProductPublished against local Postgres', () => {
  it('publishes a draft as a product manager, writes only the flag, moves the lock and is audited', async () => {
    const before = await current();
    expect(before.is_published).toBe(false);
    const client = await signInAs(PM_EMAIL);

    const result = await writeProductPublished(client, { productId, updatedAt: before.updated_at, published: true });
    expect(result.error).toBeUndefined();
    if (result.error !== undefined) return;
    expect(result.slug).toBe(SLUG);

    const after = await current();
    expect(after.is_published).toBe(true);
    expect(after.updated_at).not.toBe(before.updated_at);
    expect(result.updatedAt).toBe(after.updated_at);

    const audit = await service()
      .from('audit_log')
      .select('user_id, action, before, after')
      .eq('entity_type', 'products')
      .eq('entity_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(audit.data?.action).toBe('update');
    expect(audit.data?.user_id).toBe(pmId);
    expect((audit.data?.before as { is_published: boolean }).is_published).toBe(false);
    expect((audit.data?.after as { is_published: boolean }).is_published).toBe(true);
  });

  it('shows up under the Published filter and leaves the Draft filter once published', async () => {
    const client = await signInAs(PM_EMAIL);
    const published = await fetchProducts(client, { search: 'ZZ Publish Draft', published: 'published' });
    const drafts = await fetchProducts(client, { search: 'ZZ Publish Draft', published: 'draft' });
    expect(published.map((row) => row.id)).toContain(productId);
    expect(drafts.map((row) => row.id)).not.toContain(productId);
  });

  it('refuses a stale lock with the stale-edit message and changes nothing', async () => {
    const before = await current();
    const client = await signInAs(PM_EMAIL);
    const result = await writeProductPublished(client, {
      productId,
      updatedAt: '2020-01-01T00:00:00+00:00',
      published: false,
    });
    expect(result.error).toBe(STALE_PRODUCT_MESSAGE);
    const after = await current();
    expect(after.is_published).toBe(before.is_published);
    expect(after.updated_at).toBe(before.updated_at);
  });

  it('refuses a salesperson, who cannot edit products, even with a fresh lock', async () => {
    const before = await current();
    const client = await signInAs(SALES_EMAIL);
    const result = await writeProductPublished(client, { productId, updatedAt: before.updated_at, published: false });
    expect(result.error).toBe(PRODUCT_WRITE_REFUSED_MESSAGE);
    const after = await current();
    expect(after.is_published).toBe(true);
    expect(after.updated_at).toBe(before.updated_at);
  });

  it('unpublishes as a product manager, and the draft filter finds it again', async () => {
    const before = await current();
    const client = await signInAs(PM_EMAIL);
    const result = await writeProductPublished(client, { productId, updatedAt: before.updated_at, published: false });
    expect(result.error).toBeUndefined();
    expect((await current()).is_published).toBe(false);

    const drafts = await fetchProducts(client, { search: 'ZZ Publish Draft', published: 'draft' });
    expect(drafts.map((row) => row.id)).toContain(productId);
  });

  it('refuses the old lock after an unpublish, so a second stale tab cannot flip it back', async () => {
    const client = await signInAs(PM_EMAIL);
    const stale = '2026-01-01T00:00:00+00:00';
    const result = await writeProductPublished(client, { productId, updatedAt: stale, published: true });
    expect(result.error).toBe(STALE_PRODUCT_MESSAGE);
    expect((await current()).is_published).toBe(false);
  });
});
