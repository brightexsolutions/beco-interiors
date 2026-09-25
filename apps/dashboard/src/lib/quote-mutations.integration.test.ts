import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const PREFIX = 'ZZ Mut';
const PASSWORD = 'zz-integration-test-pass';

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

let salesId: string;
let productId: string;
const quoteIds: string[] = [];
const authUserIds: string[] = [];

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  const sb = service();

  await sb.from('quotes').delete().ilike('customer_name', `${PREFIX}%`);
  await sb.from('products').delete().eq('slug', 'zz-int-mut-product');
  const { data: existingUsers } = await sb.from('users').select('id').ilike('email', 'zz-int-mut-%');
  for (const u of existingUsers ?? []) await sb.auth.admin.deleteUser(u.id);

  const { data: salesAuth, error: salesErr } = await sb.auth.admin.createUser({
    email: 'zz-int-mut-sales@beco.co.ke',
    password: PASSWORD,
    email_confirm: true,
  });
  expect(salesErr).toBeNull();
  salesId = salesAuth!.user!.id;
  authUserIds.push(salesId);

  const { error: usersErr } = await sb.from('users').insert({
    id: salesId,
    email: 'zz-int-mut-sales@beco.co.ke',
    full_name: 'ZZ Mut Sales',
    role: 'beco_sales',
    must_change_password: false,
  });
  expect(usersErr).toBeNull();

  const { data: product, error: productErr } = await sb
    .from('products')
    .insert({
      name: 'ZZ Mut Integration Slab',
      slug: 'zz-int-mut-product',
      price: 65000,
      price_display_mode: 'fixed',
      is_published: true,
      unit: 'per slab',
    })
    .select('id')
    .single();
  expect(productErr).toBeNull();
  productId = product!.id;
});

afterAll(async () => {
  const sb = service();
  await sb.from('quotes').delete().ilike('customer_name', `${PREFIX}%`);
  if (productId) await sb.from('products').delete().eq('id', productId);
  for (const id of authUserIds) await sb.auth.admin.deleteUser(id);
});

describe('create_counter_quote', () => {
  it('writes created_by and assigned_to as the salesperson, and keeps list_price from the product', async () => {
    const { client, userId } = await signInAs('zz-int-mut-sales@beco.co.ke');
    const { data: reference, error } = await client.rpc('create_counter_quote', {
      p_customer_name: `${PREFIX} Walk In`,
      p_customer_phone: '0722000010',
      p_source: 'walk_in',
      p_items: [{ product_id: productId, quantity: 1.5, unit_price: 60000 }],
    });
    expect(error, error?.message).toBeNull();
    expect(reference).toMatch(/^BEC-Q-/);

    const { data: quote } = await client
      .from('quotes')
      .select('id, created_by, assigned_to, status, source')
      .eq('reference_number', reference!)
      .single();
    quoteIds.push(quote!.id);
    expect(quote!.created_by).toBe(userId);
    expect(quote!.assigned_to).toBe(userId);
    expect(quote!.status).toBe('reviewing');
    expect(quote!.source).toBe('walk_in');

    const { data: items } = await client
      .from('quote_items')
      .select('list_price, unit_price, quantity')
      .eq('quote_id', quote!.id);
    expect(items).toHaveLength(1);
    expect(Number(items![0]!.list_price)).toBe(65000);
    expect(Number(items![0]!.unit_price)).toBe(60000);
    expect(Number(items![0]!.quantity)).toBe(1.5);
  });

  it('refuses a stale line edit rather than overwriting', async () => {
    const { client } = await signInAs('zz-int-mut-sales@beco.co.ke');
    const { data: reference } = await client.rpc('create_counter_quote', {
      p_customer_name: `${PREFIX} Stale`,
      p_customer_phone: '0722000011',
      p_source: 'phone',
      p_items: [{ product_id: productId, quantity: 1, unit_price: 65000 }],
    });
    const { data: quote } = await client
      .from('quotes')
      .select('id, updated_at')
      .eq('reference_number', reference!)
      .single();
    quoteIds.push(quote!.id);
    const { data: items } = await client.from('quote_items').select('id').eq('quote_id', quote!.id).single();

    const { error } = await client.rpc('update_quote_line', {
      p_quote_id: quote!.id,
      p_line_id: items!.id,
      p_quantity: 2,
      p_unit_price: 65000,
      p_expected_updated_at: '1999-01-01T00:00:00.000Z',
    });
    expect(error?.message).toMatch(/changed while you were editing/i);
  });

  it('adds a later catalogue product onto an existing quote', async () => {
    const { client } = await signInAs('zz-int-mut-sales@beco.co.ke');
    const { data: reference } = await client.rpc('create_counter_quote', {
      p_customer_name: `${PREFIX} Later Item`,
      p_customer_phone: '0722000012',
      p_source: 'walk_in',
      p_items: [{ product_id: productId, quantity: 1, unit_price: 65000 }],
    });
    const { data: quote } = await client
      .from('quotes')
      .select('id, updated_at')
      .eq('reference_number', reference!)
      .single();
    quoteIds.push(quote!.id);

    const { error } = await client.rpc('add_catalogue_quote_line', {
      p_quote_id: quote!.id,
      p_product_id: productId,
      p_quantity: 0.5,
      p_unit_price: 65000,
      p_expected_updated_at: quote!.updated_at,
    });
    expect(error, error?.message).toBeNull();

    const { data: items } = await client
      .from('quote_items')
      .select('product_id, quantity, description')
      .eq('quote_id', quote!.id)
      .order('sort_order');
    expect(items).toHaveLength(2);
    expect(items![1]!.product_id).toBe(productId);
    expect(Number(items![1]!.quantity)).toBe(0.5);
    expect(items![1]!.description).toBe('ZZ Mut Integration Slab');
  });

  it('adds two catalogue products under one lock', async () => {
    const { client } = await signInAs('zz-int-mut-sales@beco.co.ke');
    const { data: reference } = await client.rpc('create_counter_quote', {
      p_customer_name: `${PREFIX} Batch Items`,
      p_customer_phone: '0722000013',
      p_source: 'walk_in',
      p_items: [{ product_id: productId, quantity: 1, unit_price: 65000 }],
    });
    const { data: quote } = await client
      .from('quotes')
      .select('id, updated_at')
      .eq('reference_number', reference!)
      .single();
    quoteIds.push(quote!.id);

    const { error } = await client.rpc('add_catalogue_quote_lines', {
      p_quote_id: quote!.id,
      p_items: [
        { product_id: productId, quantity: 0.5, unit_price: 65000 },
        { product_id: productId, quantity: 1, unit_price: 65000 },
      ],
      p_expected_updated_at: quote!.updated_at,
    });
    expect(error, error?.message).toBeNull();

    const { data: items } = await client
      .from('quote_items')
      .select('id')
      .eq('quote_id', quote!.id);
    expect(items).toHaveLength(3);
  });
});
