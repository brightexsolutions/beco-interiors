import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';
import { fetchOrders } from './orders';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const PREFIX = 'ZZ Ord';
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
let quoteId: string;
const authUserIds: string[] = [];

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  const sb = service();

  await sb.from('quotes').delete().ilike('customer_name', `${PREFIX}%`);
  await sb.from('orders').delete().ilike('customer_name', `${PREFIX}%`);
  await sb.from('products').delete().eq('slug', 'zz-int-ord-product');
  const { data: existingUsers } = await sb.from('users').select('id').ilike('email', 'zz-int-ord-%');
  for (const u of existingUsers ?? []) await sb.auth.admin.deleteUser(u.id);

  const { data: salesAuth, error: salesErr } = await sb.auth.admin.createUser({
    email: 'zz-int-ord-sales@beco.co.ke',
    password: PASSWORD,
    email_confirm: true,
  });
  expect(salesErr).toBeNull();
  salesId = salesAuth!.user!.id;
  authUserIds.push(salesId);

  const { error: usersErr } = await sb.from('users').insert({
    id: salesId,
    email: 'zz-int-ord-sales@beco.co.ke',
    full_name: 'ZZ Ord Sales',
    role: 'beco_sales',
    must_change_password: false,
  });
  expect(usersErr).toBeNull();

  const { data: product, error: productErr } = await sb
    .from('products')
    .insert({
      name: 'ZZ Ord Integration Slab',
      slug: 'zz-int-ord-product',
      price: 65000,
      price_display_mode: 'fixed',
      is_published: true,
      unit: 'per slab',
      stock_quantity: 8,
    })
    .select('id')
    .single();
  expect(productErr).toBeNull();
  productId = product!.id;
});

afterAll(async () => {
  const sb = service();
  await sb.from('quotes').delete().ilike('customer_name', `${PREFIX}%`);
  await sb.from('orders').delete().ilike('customer_name', `${PREFIX}%`);
  if (productId) await sb.from('products').delete().eq('id', productId);
  for (const id of authUserIds) await sb.auth.admin.deleteUser(id);
});

describe('convert_quote_to_order', () => {
  it('copies line prices and does not decrement stock', async () => {
    const sb = service();
    const { data: quote, error: quoteErr } = await sb
      .from('quotes')
      .insert({
        customer_name: `${PREFIX} Won`,
        customer_phone: '0700000999',
        source: 'walk_in',
        status: 'reviewing',
        assigned_to: salesId,
        created_by: salesId,
        subtotal: 65000,
        vat_amount: 0,
        total_amount: 65000,
      })
      .select('id')
      .single();
    expect(quoteErr).toBeNull();
    quoteId = quote!.id;

    const { error: lineErr } = await sb.from('quote_items').insert({
      quote_id: quoteId,
      product_id: productId,
      description: 'ZZ Ord Integration Slab',
      quantity: 1,
      list_price: 65000,
      unit_price: 60000,
    });
    expect(lineErr).toBeNull();

    const { error: winErr } = await sb
      .from('quotes')
      .update({ status: 'won', approved_at: new Date().toISOString(), approved_by: salesId })
      .eq('id', quoteId);
    expect(winErr).toBeNull();

    const { data: locked } = await sb.from('quotes').select('updated_at').eq('id', quoteId).single();
    const { client } = await signInAs('zz-int-ord-sales@beco.co.ke');
    const { data: reference, error } = await client.rpc('convert_quote_to_order', {
      p_quote_id: quoteId,
      p_expected_updated_at: locked!.updated_at,
    });
    expect(error, error?.message).toBeNull();
    expect(reference).toMatch(/^BEC-O-/);

    const { data: items } = await sb
      .from('order_items')
      .select('unit_price, orders!inner(reference_number)')
      .eq('orders.reference_number', reference as string);
    expect(items?.[0]?.unit_price).toBe(60000);

    const { data: product } = await sb.from('products').select('stock_quantity').eq('id', productId).single();
    expect(product?.stock_quantity).toBe(8);

    const listed = await fetchOrders(client, salesId, { owner: 'mine' });
    expect(listed.some((row) => row.referenceNumber === reference)).toBe(true);

    const { data: orderRow } = await sb
      .from('orders')
      .select('id, updated_at')
      .eq('reference_number', reference as string)
      .single();
    const { error: confirmErr } = await client.rpc('set_order_status', {
      p_order_id: orderRow!.id,
      p_status: 'confirmed',
      p_expected_updated_at: orderRow!.updated_at,
    });
    expect(confirmErr, confirmErr?.message).toBeNull();

    const { data: confirmed } = await sb.from('orders').select('updated_at, status').eq('id', orderRow!.id).single();
    expect(confirmed?.status).toBe('confirmed');
    const { error: paidErr } = await client.rpc('mark_order_paid', {
      p_order_id: orderRow!.id,
      p_expected_updated_at: confirmed!.updated_at,
    });
    expect(paidErr, paidErr?.message).toBeNull();
    const { data: paid } = await sb.from('orders').select('payment_status, paid_at').eq('id', orderRow!.id).single();
    expect(paid?.payment_status).toBe('paid');
    expect(paid?.paid_at).not.toBeNull();
  });
});
