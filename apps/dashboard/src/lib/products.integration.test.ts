import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const PREFIX = 'zz-int-cat';
const PASSWORD = 'zz-integration-test-pass';
const RUN = `${PREFIX}-${Date.now().toString(36)}`;

const service = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const signInAs = async (email: string) => {
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) throw new Error(`sign in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
};

let pmId: string;
let salesId: string;
let productId: string;
const authUserIds: string[] = [];

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  const sb = service();
    await sb.from('products').delete().eq('slug', `${PREFIX}-ivory`);
  await sb.from('products').delete().eq('slug', `${PREFIX}-ivory-renamed`);
  await sb.from('products').delete().eq('slug', `${PREFIX}-created`);
  const { data: existingUsers } = await sb.from('users').select('id').ilike('email', `${PREFIX}-%`);
  for (const u of existingUsers ?? []) await sb.auth.admin.deleteUser(u.id);

  const pmAuth = await sb.auth.admin.createUser({
    email: `${RUN}-pm@beco.co.ke`,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(pmAuth.error).toBeNull();
  pmId = pmAuth.data.user!.id;
  authUserIds.push(pmId);

  const salesAuth = await sb.auth.admin.createUser({
    email: `${RUN}-sales@beco.co.ke`,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(salesAuth.error).toBeNull();
  salesId = salesAuth.data.user!.id;
  authUserIds.push(salesId);

  expect(
    (
      await sb.from('users').insert([
        { id: pmId, email: `${RUN}-pm@beco.co.ke`, full_name: 'ZZ Cat PM', role: 'beco_product_manager', must_change_password: false },
        { id: salesId, email: `${RUN}-sales@beco.co.ke`, full_name: 'ZZ Cat Sales', role: 'beco_sales', must_change_password: false },
      ])
    ).error,
  ).toBeNull();

  const product = await sb
    .from('products')
    .insert({
      name: 'ZZ Cat Ivory',
      slug: `${PREFIX}-ivory`,
      price: 75000,
      price_display_mode: 'fixed',
      is_published: true,
      unit: 'per slab',
      availability: 'in_stock',
      meta_title: null,
    })
    .select('id')
    .single();
  expect(product.error).toBeNull();
  productId = product.data!.id;
});

afterAll(async () => {
  const sb = service();
  await sb.from('products').delete().in('slug', [`${PREFIX}-ivory`, `${PREFIX}-ivory-renamed`, `${PREFIX}-created`]);
  for (const id of authUserIds) await sb.auth.admin.deleteUser(id);
});

describe('catalogue writes against local Postgres', () => {
  it('lets a product manager set stock, SEO and rename, and records the old slug', async () => {
    const { client } = await signInAs(`${RUN}-pm@beco.co.ke`);
    const current = await client.from('products').select('updated_at').eq('id', productId).single();
    const written = await client
      .from('products')
      .update({
        stock_quantity: 1.5,
        low_stock_threshold: 2,
        meta_title: 'ZZ Cat Ivory in Nairobi',
        slug: `${PREFIX}-ivory-renamed`,
      })
      .eq('id', productId)
      .eq('updated_at', current.data!.updated_at)
      .select('slug, meta_title, stock_quantity')
      .maybeSingle();
    expect(written.error).toBeNull();
    expect(written.data?.slug).toBe(`${PREFIX}-ivory-renamed`);
    expect(written.data?.meta_title).toBe('ZZ Cat Ivory in Nairobi');
    expect(Number(written.data?.stock_quantity)).toBe(1.5);

    const slugs = await service().from('product_slugs').select('slug').eq('product_id', productId);
    const values = (slugs.data ?? []).map((row) => row.slug);
    expect(values).toContain(`${PREFIX}-ivory`);
    expect(values).toContain(`${PREFIX}-ivory-renamed`);
  });

  it('refuses a salesperson stock write', async () => {
    const { client } = await signInAs(`${RUN}-sales@beco.co.ke`);
    const written = await client.from('products').update({ stock_quantity: 99 }).eq('id', productId).select('id');
    expect(written.data ?? []).toEqual([]);
  });

  it('lets a product manager create an unpublished draft', async () => {
    const { client } = await signInAs(`${RUN}-pm@beco.co.ke`);
    const category = await service().from('categories').select('id').eq('is_published', true).limit(1).maybeSingle();
    expect(category.data?.id).toBeTruthy();
    const written = await client
      .from('products')
      .insert({
        name: 'ZZ Cat Created',
        slug: `${PREFIX}-created`,
        category_id: category.data!.id,
        unit: 'per slab',
        price: 70000,
        price_display_mode: 'fixed',
        is_published: false,
        images: [],
        specs: {},
      })
      .select('slug, is_published')
      .maybeSingle();
    expect(written.error).toBeNull();
    expect(written.data?.slug).toBe(`${PREFIX}-created`);
    expect(written.data?.is_published).toBe(false);
  });

  it('keeps a quote line after the product is soft-deleted', async () => {
    const sb = service();
    const quote = await sb
      .from('quotes')
      .insert({ customer_name: 'ZZ Cat Buyer', customer_phone: '0722000000', source: 'walk_in' })
      .select('id')
      .single();
    expect(quote.error).toBeNull();
    const line = await sb.from('quote_items').insert({
      quote_id: quote.data!.id,
      product_id: productId,
      description: 'ZZ Cat Ivory',
      quantity: 1,
      unit_price: 75000,
      list_price: 75000,
    });
    expect(line.error).toBeNull();

    const { client } = await signInAs(`${RUN}-pm@beco.co.ke`);
    const current = await client.from('products').select('updated_at').eq('id', productId).single();
    const deleted = await client
      .from('products')
      .update({ deleted_at: new Date().toISOString(), is_published: false })
      .eq('id', productId)
      .eq('updated_at', current.data!.updated_at)
      .select('id')
      .maybeSingle();
    expect(deleted.error).toBeNull();
    expect(deleted.data?.id).toBe(productId);

    const kept = await sb.from('quote_items').select('unit_price, product_id').eq('quote_id', quote.data!.id).single();
    expect(kept.data?.product_id).toBe(productId);
    expect(Number(kept.data?.unit_price)).toBe(75000);

    await sb.from('quotes').delete().eq('id', quote.data!.id);
  });
});
