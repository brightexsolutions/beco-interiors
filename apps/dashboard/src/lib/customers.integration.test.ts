import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';
import { ensureTestUser } from './__tests__/ensure-test-user';
import {
  fetchCustomer,
  fetchCustomerHistory,
  fetchCustomers,
  findCustomerByPhone,
  insertCustomer,
  linkQuoteToCustomer,
  searchCustomerRecords,
  softDeleteCustomer,
  updateCustomerRecord,
} from './customer-records';

config({ path: new URL('../../../../.env.local', import.meta.url).pathname, quiet: true });

/**
 * The customer record against the local stack (D130): create, the duplicate
 * phone guard, edit under the lock, soft delete by an admin only, search,
 * and linking from a quote. Each call is made as a real signed-in role, so
 * RLS is what allows or refuses it. Fixtures are prefixed "ZZ Cust Int" and
 * use 07991xxxxx numbers nothing real carries.
 */

const PREFIX = 'ZZ Cust Int';
const PASSWORD = 'zz-integration-test-pass';
type Client = SupabaseClient<Database>;
// The helpers take the app's server client type; a signed in supabase-js
// client is the same API.
const as = (client: Client) => client as never;

const service = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const signInAs = async (email: string): Promise<{ client: Client; userId: string }> => {
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.user) throw new Error(`sign in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
};

const fields = (over: Partial<Parameters<typeof insertCustomer>[2]> = {}) => ({
  name: `${PREFIX} Achieng`,
  phone: '0799 300 001',
  email: null,
  company: null,
  kraPin: null,
  location: null,
  clientType: null,
  notes: null,
  ...over,
});

const cleanup = async () => {
  const sb = service();
  await sb.from('orders').delete().ilike('customer_name', `${PREFIX}%`);
  await sb.from('quotes').delete().ilike('customer_name', `${PREFIX}%`);
  await sb.from('customers').delete().ilike('name', `${PREFIX}%`);
};

let sales: { client: Client; userId: string };
let admin: { client: Client; userId: string };
let pm: { client: Client; userId: string };

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain('127.0.0.1');
  await cleanup();
  const sb = service();
  for (const [email, fullName, role] of [
    ['zz-int-cust-sales@beco.co.ke', 'ZZ Cust Sales', 'beco_sales'],
    ['zz-int-cust-admin@beco.co.ke', 'ZZ Cust Admin', 'beco_admin'],
    ['zz-int-cust-pm@beco.co.ke', 'ZZ Cust PM', 'beco_product_manager'],
  ] as const) {
    await ensureTestUser(sb, { email, password: PASSWORD, fullName, role });
  }
  sales = await signInAs('zz-int-cust-sales@beco.co.ke');
  admin = await signInAs('zz-int-cust-admin@beco.co.ke');
  pm = await signInAs('zz-int-cust-pm@beco.co.ke');
});

afterAll(cleanup);

describe('customers: create and the duplicate phone guard', () => {
  it('creates a customer as the salesperson, readable straight back', async () => {
    const result = await insertCustomer(as(sales.client), sales.userId, fields({ kraPin: 'A123456789Z', clientType: 'designer' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const record = await fetchCustomer(as(sales.client), result.id);
    expect(record).toMatchObject({
      name: `${PREFIX} Achieng`,
      phone: '0799 300 001',
      kraPin: 'A123456789Z',
      clientType: 'designer',
      createdBy: sales.userId,
    });
  });

  it('refuses the same number in another format, pointing at the existing customer', async () => {
    const result = await insertCustomer(as(sales.client), sales.userId, fields({ name: `${PREFIX} Twin`, phone: '+254799300001' }));
    expect(result).toMatchObject({ ok: false, reason: 'duplicate', existing: { name: `${PREFIX} Achieng` } });
    const found = await findCustomerByPhone(as(sales.client), '254 799 300 001');
    expect(found?.name).toBe(`${PREFIX} Achieng`);
  });

  it('does not let the product manager create one, though it reads the list', async () => {
    const result = await insertCustomer(as(pm.client), pm.userId, fields({ name: `${PREFIX} PM`, phone: '0799300009' }));
    expect(result.ok).toBe(false);
    const list = await fetchCustomers(as(pm.client), { search: `${PREFIX} Achieng` });
    expect(list.map((c) => c.name)).toContain(`${PREFIX} Achieng`);
  });

  it('refuses a KRA PIN of the wrong shape at the database, whatever the form allowed', async () => {
    const result = await insertCustomer(as(sales.client), sales.userId, fields({ name: `${PREFIX} Pin`, phone: '0799300008', kraPin: 'A1234Z' }));
    expect(result).toMatchObject({ ok: false, reason: 'error' });
  });
});

describe('customers: edit under the lock', () => {
  it('saves with the current lock, refuses a stale one, and refuses another customer\'s number', async () => {
    const created = await insertCustomer(as(sales.client), sales.userId, fields({ name: `${PREFIX} Edit`, phone: '0799300002' }));
    if (!created.ok) throw new Error('fixture');
    const saved = await updateCustomerRecord(as(sales.client), created.id, created.updatedAt, fields({ name: `${PREFIX} Edit`, phone: '0799300002', company: 'ZZ Kitchens' }));
    expect(saved.ok).toBe(true);
    expect((await fetchCustomer(as(sales.client), created.id))?.company).toBe('ZZ Kitchens');

    const stale = await updateCustomerRecord(as(sales.client), created.id, created.updatedAt, fields({ name: `${PREFIX} Edit`, phone: '0799300002' }));
    expect(stale).toEqual({ ok: false, reason: 'stale' });

    if (!saved.ok) return;
    const clash = await updateCustomerRecord(as(sales.client), created.id, saved.updatedAt, fields({ name: `${PREFIX} Edit`, phone: '0799300001' }));
    expect(clash).toMatchObject({ ok: false, reason: 'duplicate', existing: { name: `${PREFIX} Achieng` } });
  });
});

describe('customers: soft delete', () => {
  it('is refused for a salesperson and done by an admin, releasing the number', async () => {
    const created = await insertCustomer(as(sales.client), sales.userId, fields({ name: `${PREFIX} Gone`, phone: '0799300003' }));
    if (!created.ok) throw new Error('fixture');

    const bySales = await softDeleteCustomer(as(sales.client), created.id);
    expect(bySales.ok).toBe(false);
    expect(await fetchCustomer(as(sales.client), created.id)).not.toBeNull();

    expect(await softDeleteCustomer(as(admin.client), created.id)).toEqual({ ok: true });
    expect(await fetchCustomer(as(sales.client), created.id)).toBeNull();
    expect(await fetchCustomer(as(admin.client), created.id)).toBeNull();

    const again = await insertCustomer(as(sales.client), sales.userId, fields({ name: `${PREFIX} Back`, phone: '0799300003' }));
    expect(again.ok).toBe(true);

    const { data: trail } = await service()
      .from('audit_log')
      .select('action')
      .eq('entity_type', 'customers')
      .eq('entity_id', created.id);
    expect((trail ?? []).map((row) => row.action)).toEqual(expect.arrayContaining(['create', 'delete']));
  });
});

describe('customers: search and list', () => {
  it('finds by name, by phone in any format, by KRA PIN and by company', async () => {
    const byName = await searchCustomerRecords(as(sales.client), `${PREFIX} Ach`);
    expect(byName.map((c) => c.name)).toContain(`${PREFIX} Achieng`);
    const byPhone = await searchCustomerRecords(as(sales.client), '+254 799 300 001');
    expect(byPhone.map((c) => c.name)).toEqual([`${PREFIX} Achieng`]);
    const byPin = await searchCustomerRecords(as(sales.client), 'a123456789');
    expect(byPin.map((c) => c.name)).toContain(`${PREFIX} Achieng`);
    const byCompany = await searchCustomerRecords(as(sales.client), 'ZZ Kitchens');
    expect(byCompany.map((c) => c.name)).toContain(`${PREFIX} Edit`);
  });

  it('filters by client type and sorts by name', async () => {
    const designers = await fetchCustomers(as(sales.client), { search: PREFIX, clientType: 'designer' });
    expect(designers.map((c) => c.name)).toEqual([`${PREFIX} Achieng`]);
    const byName = await fetchCustomers(as(sales.client), { search: PREFIX, sort: 'name' });
    const names = byName.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('customers: linking from a quote', () => {
  it('raises a counter quote for a picked customer, relinks it, and shows it in the history', async () => {
    const achieng = await findCustomerByPhone(as(sales.client), '0799300001');
    const other = await insertCustomer(as(sales.client), sales.userId, fields({ name: `${PREFIX} Other`, phone: '0799300004' }));
    if (!achieng || !other.ok) throw new Error('fixture');

    const { data: reference, error } = await sales.client.rpc('create_counter_quote', {
      p_customer_name: 'typed, ignored',
      p_customer_phone: '0700000000',
      p_source: 'walk_in',
      p_items: [{ description: 'ZZ cutting', quantity: 1, unit_price: 1500 }],
      p_customer_id: achieng.id,
    });
    expect(error).toBeNull();
    const { data: quote } = await sales.client
      .from('quotes')
      .select('id, customer_id, customer_name, customer_phone, updated_at')
      .eq('reference_number', reference!)
      .single();
    expect(quote).toMatchObject({ customer_id: achieng.id, customer_name: `${PREFIX} Achieng`, customer_phone: '0799 300 001' });

    const history = await fetchCustomerHistory(as(sales.client), achieng.id);
    expect(history.quotes.map((q) => q.reference)).toContain(reference);

    const stale = await linkQuoteToCustomer(as(sales.client), quote!.id, other.id, '2000-01-01T00:00:00Z');
    expect(stale.error?.code).toBe('PT409');

    const linked = await linkQuoteToCustomer(as(sales.client), quote!.id, other.id, quote!.updated_at);
    expect(linked.error).toBeNull();
    const after = await fetchCustomerHistory(as(sales.client), other.id);
    expect(after.quotes.map((q) => q.reference)).toEqual([reference]);
    const { data: snapshot } = await sales.client.from('quotes').select('customer_name').eq('id', quote!.id).single();
    expect(snapshot?.customer_name).toBe(`${PREFIX} Achieng`);

    const byPm = await linkQuoteToCustomer(as(pm.client), quote!.id, achieng.id, quote!.updated_at);
    expect(byPm.error?.code).toBe('42501');
  });

  it('a counter quote typed for a new number creates that customer, and a known number only links', async () => {
    const { data: fresh, error } = await sales.client.rpc('create_counter_quote', {
      p_customer_name: `${PREFIX} Walk In`,
      p_customer_phone: '+254 799 300 005',
      p_source: 'walk_in',
      p_items: [{ description: 'ZZ cutting', quantity: 1, unit_price: 1500 }],
    });
    expect(error).toBeNull();
    const created = await findCustomerByPhone(as(sales.client), '0799300005');
    expect(created?.name).toBe(`${PREFIX} Walk In`);
    const { data: freshQuote } = await sales.client.from('quotes').select('customer_id').eq('reference_number', fresh!).single();
    expect(freshQuote?.customer_id).toBe(created?.id);

    await sales.client.rpc('create_counter_quote', {
      p_customer_name: `${PREFIX} Renamed`,
      p_customer_phone: '0799300005',
      p_source: 'phone',
      p_items: [{ description: 'ZZ cutting', quantity: 1, unit_price: 1500 }],
    });
    expect((await findCustomerByPhone(as(sales.client), '0799300005'))?.name).toBe(`${PREFIX} Walk In`);
  });

  it('refuses a soft deleted customer for a new quote', async () => {
    const gone = await insertCustomer(as(sales.client), sales.userId, fields({ name: `${PREFIX} Gone Two`, phone: '0799300006' }));
    if (!gone.ok) throw new Error('fixture');
    await softDeleteCustomer(as(admin.client), gone.id);
    const { error } = await sales.client.rpc('create_counter_quote', {
      p_customer_name: 'x',
      p_customer_phone: '0700000000',
      p_source: 'walk_in',
      p_items: [{ description: 'ZZ cutting', quantity: 1, unit_price: 1500 }],
      p_customer_id: gone.id,
    });
    expect(error?.message).toMatch(/no longer on file/);
  });
});
