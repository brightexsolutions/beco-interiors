import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { submitQuote } from './actions';

/**
 * The quote flow is the product, so it is proven against a real database
 * rather than a mock. There is no browser automation here by design (D23), so
 * this is where the whole submission path is actually verified.
 *
 * Runs against the LOCAL Supabase stack only. Never a hosted project.
 */
config({ path: new URL('../../../../../.env.local', import.meta.url).pathname, quiet: true });

const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

const created: string[] = [];

// This suite seeds its OWN products rather than reading whatever the catalogue
// happens to hold. A plain `supabase db reset` leaves the catalogue seeded,
// but a fresh stack or a half-applied reset does not, and reading `[0]` off an
// empty table with a `!` was how `pnpm vitest run` broke: a null deref with no
// hint that the local database simply had nothing in it. See the Codex M4 review.
const PRODUCT_SLUG = 'zz-int-quote-product';
const SLAB_SLUG = 'zz-int-quote-slab';
const productName = 'ZZ Integration Test Stone';

beforeAll(async () => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL, 'local Supabase must be running').toContain(
    '127.0.0.1',
  );
  const sb = service();
  // Clean up anything a previous crashed run left behind, then seed fresh.
  await sb.from('products').delete().in('slug', [PRODUCT_SLUG, SLAB_SLUG]);
  const { error } = await sb.from('products').insert([
    { name: productName, slug: PRODUCT_SLUG, unit: 'per piece', is_published: true },
    { name: 'ZZ Integration Test Slab', slug: SLAB_SLUG, unit: 'per slab', is_published: true },
  ]);
  expect(error, 'seeding the test products failed').toBeNull();
});

afterAll(async () => {
  const sb = service();
  if (created.length > 0) await sb.from('quotes').delete().in('id', created);
  await sb.from('products').delete().in('slug', [PRODUCT_SLUG, SLAB_SLUG]);
});

const productSlug = PRODUCT_SLUG;
const slabSlug = SLAB_SLUG;

const validSubmission = (over: Record<string, unknown> = {}) => ({
  customerName: 'Test Buyer',
  customerPhone: '0722000111',
  items: [{ slug: productSlug, quantity: 3 }],
  ...over,
});

describe('submitQuote', () => {
  it('writes a quote and its items, and mints a reference', async () => {
    const result = await submitQuote(validSubmission());
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;

    expect(result.reference).toMatch(/^BEC-Q-\d+$/);

    const sb = service();
    const { data: quote } = await sb
      .from('quotes')
      .select('id,customer_name,customer_phone,source,status')
      .eq('reference_number', result.reference)
      .single();
    created.push(quote!.id);

    // The row changed. That is the proof, not that the action returned ok.
    expect(quote).toMatchObject({
      customer_name: 'Test Buyer',
      source: 'web',
      status: 'new',
    });

    const { data: items } = await sb
      .from('quote_items')
      .select('description,quantity,unit_price')
      .eq('quote_id', quote!.id);
    expect(items).toHaveLength(1);
    // The description comes from the DATABASE, not from the request.
    expect(items![0]!.description).toBe(productName);
    expect(Number(items![0]!.quantity)).toBe(3);
    // POA means unpriced until a salesperson prices it.
    expect(Number(items![0]!.unit_price)).toBe(0);
  });

  it('arrives unowned, so it can be claimed or assigned', async () => {
    const result = await submitQuote(validSubmission());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { data } = await service()
      .from('quotes')
      .select('id,created_by,assigned_to')
      .eq('reference_number', result.reference)
      .single();
    created.push(data!.id);
    expect(data!.created_by).toBeNull();
    expect(data!.assigned_to).toBeNull();
  });

  it('refuses a submission with no name', async () => {
    const result = await submitQuote(validSubmission({ customerName: '' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.customerName).toBeTruthy();
  });

  it('refuses a phone number that is not Kenyan', async () => {
    const result = await submitQuote(validSubmission({ customerPhone: '12345' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.customerPhone).toBeTruthy();
  });

  it('refuses an empty list', async () => {
    const result = await submitQuote(validSubmission({ items: [] }));
    expect(result.ok).toBe(false);
  });

  it('ignores a product slug that is not published, rather than inventing a line', async () => {
    const result = await submitQuote(
      validSubmission({ items: [{ slug: 'no-such-stone-at-all', quantity: 1 }] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/none of those products/i);
  });

  it('never takes a description or a price from the request', async () => {
    // A crafted request tries to put its own text and figure on the line.
    const result = await submitQuote(
      validSubmission({
        items: [
          {
            slug: productSlug,
            quantity: 1,
            description: 'Free marble, 100 slabs',
            unit_price: 1,
            list_price: 1,
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sb = service();
    const { data: quote } = await sb
      .from('quotes')
      .select('id')
      .eq('reference_number', result.reference)
      .single();
    created.push(quote!.id);
    const { data: items } = await sb
      .from('quote_items')
      .select('description,unit_price')
      .eq('quote_id', quote!.id);
    expect(items![0]!.description).toBe(productName);
    expect(items![0]!.description).not.toContain('Free marble');
    expect(Number(items![0]!.unit_price)).toBe(0);
  });

  it('records installation and samples, which are how Beco actually sells', async () => {
    const result = await submitQuote(
      validSubmission({ wantsInstallation: true, wantsSamples: true, fulfilment: 'delivery' }),
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;

    const { data } = await service()
      .from('quotes')
      .select('id,wants_installation,wants_samples,fulfilment')
      .eq('reference_number', result.reference)
      .single();
    created.push(data!.id);
    expect(data).toMatchObject({
      wants_installation: true,
      wants_samples: true,
      fulfilment: 'delivery',
    });
  });

  it('defaults both to false rather than null, so a report can count them', async () => {
    const result = await submitQuote(validSubmission());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { data } = await service()
      .from('quotes')
      .select('id,wants_installation,wants_samples')
      .eq('reference_number', result.reference)
      .single();
    created.push(data!.id);
    expect(data!.wants_installation).toBe(false);
    expect(data!.wants_samples).toBe(false);
  });
});

describe('fractional slab quantities, end to end through the real form path', () => {
  // Migration 23 and its pgTAP tests cover submit_quote directly. This proves
  // the FULL path a browser actually uses still reaches that behaviour:
  // webQuoteSubmissionSchema must accept a half slab rather than reject it
  // before the database is ever asked.
  it('carries a half slab quantity through validation and into the row', async () => {
    const result = await submitQuote(
      validSubmission({ items: [{ slug: slabSlug, quantity: 1.5 }] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sb = service();
    const { data: quote } = await sb
      .from('quotes')
      .select('id')
      .eq('reference_number', result.reference)
      .single();
    created.push(quote!.id);

    const { data: items } = await sb
      .from('quote_items')
      .select('quantity')
      .eq('quote_id', quote!.id);
    expect(Number(items![0]!.quantity)).toBe(1.5);
  });

  it('rejects an arbitrary fraction before it ever reaches the database', async () => {
    const result = await submitQuote(
      validSubmission({ items: [{ slug: slabSlug, quantity: 1.37 }] }),
    );
    expect(result.ok).toBe(false);
  });
});
