import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '@beco/types';
import { ensureTestUser } from './__tests__/ensure-test-user';
import { mutationMessage } from './quote-errors';

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
  salesId = await ensureTestUser(sb, {
    email: 'zz-int-mut-sales@beco.co.ke',
    password: PASSWORD,
    fullName: 'ZZ Mut Sales',
    role: 'beco_sales',
  });
  authUserIds.push(salesId);
  authUserIds.push(
    await ensureTestUser(sb, {
      email: 'zz-int-mut-colleague@beco.co.ke',
      password: PASSWORD,
      fullName: 'ZZ Mut Colleague',
      role: 'beco_sales',
    }),
  );

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
  // create_counter_quote links or creates the customer record (D130).
  await sb.from('customers').delete().ilike('name', `${PREFIX}%`);
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
    // PT409, not 40001: PostgREST retries a serialization failure, and a
    // stale timestamp is stale on every retry, so 40001 hung this request.
    expect(error?.code).toBe('PT409');
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

describe('remove_quote_line on a web quote (D131)', () => {
  const anon = () =>
    createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });

  /** A real website submission: two lines, unassigned, unpriced. */
  const submitWebQuote = async (name: string, phone: string) => {
    const { data: reference, error } = await anon().rpc('submit_quote', {
      p_customer_name: `${PREFIX} ${name}`,
      p_customer_phone: phone,
      p_items: [
        { slug: 'zz-int-mut-product', quantity: 2 },
        { slug: 'zz-int-mut-product', quantity: 1 },
      ],
    });
    expect(error, error?.message).toBeNull();
    const { data: quote } = await service()
      .from('quotes')
      .select('id, updated_at, assigned_to, requested_items')
      .eq('reference_number', reference!)
      .single();
    quoteIds.push(quote!.id);
    const { data: items } = await service()
      .from('quote_items')
      .select('id, quantity')
      .eq('quote_id', quote!.id)
      .order('sort_order');
    return { reference: reference!, quote: quote!, items: items! };
  };

  const lockOf = async (client: ReturnType<typeof createClient<Database>>, quoteId: string) => {
    const { data } = await client.from('quotes').select('updated_at').eq('id', quoteId).single();
    return data!.updated_at;
  };

  it('a salesperson cannot remove a line until they claim the quote, then can, and the total follows', async () => {
    const web = await submitWebQuote('Phoned Back', '0722000020');
    expect(web.quote.assigned_to).toBeNull();
    expect(web.items).toHaveLength(2);
    const { client } = await signInAs('zz-int-mut-sales@beco.co.ke');

    const refused = await client.rpc('remove_quote_line', {
      p_quote_id: web.quote.id,
      p_line_id: web.items[1]!.id,
      p_expected_updated_at: web.quote.updated_at,
    });
    expect(refused.error?.code).toBe('42501');

    expect((await client.rpc('claim_quote', { p_quote_id: web.quote.id, p_expected_updated_at: web.quote.updated_at })).error).toBeNull();

    // Price both lines at list so the totals are real numbers.
    const priced = await client.rpc('update_quote_lines', {
      p_quote_id: web.quote.id,
      p_items: web.items.map((item) => ({ line_id: item.id, quantity: Number(item.quantity), unit_price: 65000 })),
      p_expected_updated_at: await lockOf(client, web.quote.id),
    });
    expect(priced.error, priced.error?.message).toBeNull();

    const removed = await client.rpc('remove_quote_line', {
      p_quote_id: web.quote.id,
      p_line_id: web.items[1]!.id,
      p_expected_updated_at: await lockOf(client, web.quote.id),
    });
    expect(removed.error, removed.error?.message).toBeNull();
    expect(removed.data).toBe('ZZ Mut Integration Slab');

    const { data: after } = await client
      .from('quotes')
      .select('total_amount, vat_amount, subtotal, requested_items')
      .eq('id', web.quote.id)
      .single();
    // 2 x 65,000 left, VAT inside at the configured rate.
    expect(Number(after!.total_amount)).toBe(130000);
    expect(Number(after!.subtotal) + Number(after!.vat_amount)).toBeCloseTo(130000, 2);
    // The salesperson reads the customer's request through the quote's own RLS.
    const request = after!.requested_items as { source: string; lines: { id: string }[] };
    expect(request.source).toBe('submission');
    expect(request.lines.map((line) => line.id)).toEqual(web.items.map((item) => item.id));

    const { data: audit } = await service()
      .from('audit_log')
      .select('action, before')
      .eq('entity_type', 'quote_items')
      .eq('entity_id', web.items[1]!.id)
      .eq('action', 'delete');
    expect(audit).toHaveLength(1);
    expect((audit![0]!.before as { quote_id: string }).quote_id).toBe(web.quote.id);
  });

  it('refuses the last line, a stale lock, and a colleague', async () => {
    const web = await submitWebQuote('Refusals', '0722000021');
    const { client } = await signInAs('zz-int-mut-sales@beco.co.ke');
    expect((await client.rpc('claim_quote', { p_quote_id: web.quote.id, p_expected_updated_at: web.quote.updated_at })).error).toBeNull();

    const stale = await client.rpc('remove_quote_line', {
      p_quote_id: web.quote.id,
      p_line_id: web.items[1]!.id,
      p_expected_updated_at: '1999-01-01T00:00:00.000Z',
    });
    // PT409, never 40001: PostgREST would retry a serialization failure forever.
    expect(stale.error?.code).toBe('PT409');

    const colleague = await signInAs('zz-int-mut-colleague@beco.co.ke');
    const theirs = await colleague.client.rpc('remove_quote_line', {
      p_quote_id: web.quote.id,
      p_line_id: web.items[1]!.id,
      p_expected_updated_at: await lockOf(client, web.quote.id),
    });
    expect(theirs.error?.code).toBe('42501');

    expect(
      (
        await client.rpc('remove_quote_line', {
          p_quote_id: web.quote.id,
          p_line_id: web.items[1]!.id,
          p_expected_updated_at: await lockOf(client, web.quote.id),
        })
      ).error,
    ).toBeNull();
    const last = await client.rpc('remove_quote_line', {
      p_quote_id: web.quote.id,
      p_line_id: web.items[0]!.id,
      p_expected_updated_at: await lockOf(client, web.quote.id),
    });
    expect(last.error?.message).toBe('A quote needs at least one item. Mark it lost instead.');
    const { data: left } = await client.from('quote_items').select('id').eq('quote_id', web.quote.id);
    expect(left).toHaveLength(1);
  });

  it('a won quote refuses every line change over HTTP, a lost one asks for a reopen, and a reopened one takes it (D132)', async () => {
    const web = await submitWebQuote('Closed Lines', '0722000022');
    const { client } = await signInAs('zz-int-mut-sales@beco.co.ke');
    expect((await client.rpc('claim_quote', { p_quote_id: web.quote.id, p_expected_updated_at: web.quote.updated_at })).error).toBeNull();
    // Priced at list, so D86 never gates and only the closed rule can refuse.
    const priced = await client.rpc('update_quote_lines', {
      p_quote_id: web.quote.id,
      p_items: web.items.map((item) => ({ line_id: item.id, quantity: Number(item.quantity), unit_price: 65000 })),
      p_expected_updated_at: await lockOf(client, web.quote.id),
    });
    expect(priced.error, priced.error?.message).toBeNull();

    const everyChange = async () => {
      const lock = await lockOf(client, web.quote.id);
      return Promise.all([
        client.rpc('update_quote_lines', {
          p_quote_id: web.quote.id,
          p_items: [{ line_id: web.items[0]!.id, quantity: 5, unit_price: 65000 }],
          p_expected_updated_at: lock,
        }),
        client.rpc('update_quote_line', {
          p_quote_id: web.quote.id,
          p_line_id: web.items[0]!.id,
          p_quantity: 5,
          p_unit_price: 65000,
          p_expected_updated_at: lock,
        }),
        client.rpc('add_catalogue_quote_lines', {
          p_quote_id: web.quote.id,
          p_items: [{ product_id: productId, quantity: 1 }],
          p_expected_updated_at: lock,
        }),
        client.rpc('add_catalogue_quote_line', {
          p_quote_id: web.quote.id,
          p_product_id: productId,
          p_quantity: 1,
          p_unit_price: 65000,
          p_expected_updated_at: lock,
        }),
        client.rpc('add_custom_quote_line', {
          p_quote_id: web.quote.id,
          p_description: 'ZZ Mut Delivery',
          p_quantity: 1,
          p_unit_price: 5000,
          p_expected_updated_at: lock,
        }),
        client.rpc('remove_quote_line', {
          p_quote_id: web.quote.id,
          p_line_id: web.items[1]!.id,
          p_expected_updated_at: lock,
        }),
      ]);
    };

    const toStatus = async (status: 'quoted' | 'won' | 'lost', reason = '') => {
      const { error } = await client.rpc('set_quote_status', {
        p_quote_id: web.quote.id,
        p_status: status,
        p_lost_reason: reason,
        p_expected_updated_at: await lockOf(client, web.quote.id),
      });
      expect(error, error?.message).toBeNull();
    };

    await toStatus('lost', 'Went elsewhere');
    for (const result of await everyChange()) {
      expect(result.error?.code).toBe('P0001');
      // The action layer passes the sentence through as the toast.
      expect(mutationMessage(result.error)).toBe('Reopen this quote to change its items');
    }

    expect((await client.rpc('reopen_quote', { p_quote_id: web.quote.id, p_expected_updated_at: await lockOf(client, web.quote.id) })).error).toBeNull();
    const reopened = await client.rpc('update_quote_lines', {
      p_quote_id: web.quote.id,
      p_items: [{ line_id: web.items[0]!.id, quantity: 3, unit_price: 65000 }],
      p_expected_updated_at: await lockOf(client, web.quote.id),
    });
    expect(reopened.error, reopened.error?.message).toBeNull();

    await toStatus('won');
    for (const result of await everyChange()) {
      expect(result.error?.code).toBe('P0001');
      expect(mutationMessage(result.error)).toBe('A won quote is closed');
    }

    const { data: lines } = await service()
      .from('quote_items')
      .select('id, quantity')
      .eq('quote_id', web.quote.id)
      .order('sort_order');
    expect(lines?.map((line) => line.id)).toEqual(web.items.map((item) => item.id));
    expect(Number(lines![0]!.quantity)).toBe(3);
  });

  it('anon cannot call it at all', async () => {
    const { error } = await anon().rpc('remove_quote_line', {
      p_quote_id: '11111111-1111-4111-8111-111111111111',
      p_line_id: '11111111-1111-4111-8111-111111111111',
      p_expected_updated_at: '2026-10-07T00:00:00.000Z',
    });
    expect(error).not.toBeNull();
  });
});
