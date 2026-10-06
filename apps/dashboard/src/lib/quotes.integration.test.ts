import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';
import { ensureTestUser } from './__tests__/ensure-test-user';
import { fetchNewQuoteCount } from './nav-counts';
import { fetchQuotes } from './quotes';

/**
 * Against the real local database, with real signed-in sessions, because
 * `fetchQuotes` is a thin wrapper over RLS and a mock client would only
 * prove the mock behaves, not that D87's policy actually narrows the row
 * set. No browser automation, per D23: this is a server side query, not a
 * UI journey.
 */
config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

const PREFIX = 'ZZ Integration';
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
let adminId: string;
let productId: string;
const quoteIds: string[] = [];
const authUserIds: string[] = [];

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  const sb = service();

  // Clean up anything a previous crashed run left behind.
  await sb.from('quotes').delete().ilike('customer_name', `${PREFIX}%`);
  await sb.from('products').delete().eq('slug', 'zz-int-quotes-product');
  salesId = await ensureTestUser(sb, {
    email: 'zz-int-quotes-sales@beco.co.ke',
    password: PASSWORD,
    fullName: 'ZZ Sales',
    role: 'beco_sales',
  });
  adminId = await ensureTestUser(sb, {
    email: 'zz-int-quotes-admin@beco.co.ke',
    password: PASSWORD,
    fullName: 'ZZ Admin',
    role: 'beco_admin',
  });
  authUserIds.push(salesId, adminId);

  const { data: product, error: productErr } = await sb
    .from('products')
    .insert({ name: 'ZZ Integration Quotes Slab', slug: 'zz-int-quotes-product', price: 20000, price_display_mode: 'fixed', is_published: true })
    .select('id')
    .single();
  expect(productErr, 'seeding the test product failed').toBeNull();
  productId = product!.id;

  const { data: quotes, error: quotesErr } = await sb
    .from('quotes')
    .insert([
      { customer_name: `${PREFIX} Mine`, customer_phone: '0700000001', assigned_to: salesId, created_by: salesId, source: 'phone' },
      { customer_name: `${PREFIX} Unassigned`, customer_phone: '0700000002', source: 'web' },
      { customer_name: `${PREFIX} SomeoneElse`, customer_phone: '0700000003', assigned_to: adminId, created_by: adminId, source: 'walk_in' },
    ])
    .select('id, customer_name');
  expect(quotesErr, 'seeding the test quotes failed').toBeNull();
  for (const q of quotes ?? []) quoteIds.push(q.id);

  const mine = quotes!.find((q) => q.customer_name.endsWith('Mine'))!;
  await sb.from('quote_items').insert({
    quote_id: mine.id,
    product_id: productId,
    description: 'ZZ priced line',
    quantity: 1,
    list_price: 20000,
    unit_price: 20000,
  });
});

afterAll(async () => {
  const sb = service();
  if (quoteIds.length > 0) await sb.from('quotes').delete().in('id', quoteIds);
  if (productId) await sb.from('products').delete().eq('id', productId);
  for (const id of authUserIds) await sb.auth.admin.deleteUser(id);
});

/** Only this suite's own rows, so a result reflects what it seeded rather
 *  than whatever else the local database happens to hold. */
const own = (rows: Awaited<ReturnType<typeof fetchQuotes>>) => rows.filter((r) => r.customerName.startsWith(PREFIX));

describe('fetchQuotes', () => {
  it("a salesperson's 'mine' filter returns only their own assigned quote", async () => {
    const { client, userId } = await signInAs('zz-int-quotes-sales@beco.co.ke');
    const rows = own(await fetchQuotes(client, userId, { owner: 'mine' }));
    expect(rows.map((r) => r.customerName)).toEqual([`${PREFIX} Mine`]);
  });

  it("a salesperson's 'unassigned' filter returns the shared web queue, not their own", async () => {
    const { client, userId } = await signInAs('zz-int-quotes-sales@beco.co.ke');
    const rows = own(await fetchQuotes(client, userId, { owner: 'unassigned' }));
    expect(rows.map((r) => r.customerName)).toEqual([`${PREFIX} Unassigned`]);
  });

  it("an admin's 'all' filter sees every role's quotes, D87's read policy permits it", async () => {
    const { client, userId } = await signInAs('zz-int-quotes-admin@beco.co.ke');
    const rows = own(await fetchQuotes(client, userId, { owner: 'all' }));
    expect(rows.map((r) => r.customerName).sort()).toEqual(
      [`${PREFIX} Mine`, `${PREFIX} SomeoneElse`, `${PREFIX} Unassigned`].sort(),
    );
  });

  it('search narrows to a matching customer name', async () => {
    const { client, userId } = await signInAs('zz-int-quotes-admin@beco.co.ke');
    const rows = own(await fetchQuotes(client, userId, { owner: 'all', search: 'SomeoneElse' }));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.customerName).toBe(`${PREFIX} SomeoneElse`);
  });

  it('a comma in the search term cannot reshape the filter into an or clause', async () => {
    const { client, userId } = await signInAs('zz-int-quotes-admin@beco.co.ke');
    const rows = own(await fetchQuotes(client, userId, { owner: 'all', search: 'Mine,SomeoneElse' }));
    // If the comma survived it would OR two conditions together and match
    // both rows. Sanitized, it matches neither, which is the safe failure.
    expect(rows).toHaveLength(0);
  });

  it('computes value and isPriced from the real quote_items, not a stored total', async () => {
    const { client, userId } = await signInAs('zz-int-quotes-admin@beco.co.ke');
    const rows = own(await fetchQuotes(client, userId, { owner: 'all' }));
    const priced = rows.find((r) => r.customerName === `${PREFIX} Mine`)!;
    expect(priced.isPriced).toBe(true);
    expect(priced.value).toBe(20000);

    const unpriced = rows.find((r) => r.customerName === `${PREFIX} Unassigned`)!;
    expect(unpriced.isPriced).toBe(false);
  });
});

describe('fetchNewQuoteCount', () => {
  it('counts a new quote, and stops counting it once it is soft deleted or opened', async () => {
    const { client } = await signInAs('zz-int-quotes-sales@beco.co.ke');
    const before = await fetchNewQuoteCount(client, 'beco_sales');

    const sb = service();
    const { data: added } = await sb
      .from('quotes')
      .insert({ customer_name: `${PREFIX} Badge`, customer_phone: '0700000004', source: 'web' })
      .select('id')
      .single();
    quoteIds.push(added!.id);
    expect(await fetchNewQuoteCount(client, 'beco_sales')).toBe(before + 1);

    await sb.from('quotes').update({ status: 'reviewing' }).eq('id', added!.id);
    expect(await fetchNewQuoteCount(client, 'beco_sales')).toBe(before);

    await sb.from('quotes').update({ status: 'new', deleted_at: new Date().toISOString() }).eq('id', added!.id);
    expect(await fetchNewQuoteCount(client, 'beco_sales')).toBe(before);
  });
});
