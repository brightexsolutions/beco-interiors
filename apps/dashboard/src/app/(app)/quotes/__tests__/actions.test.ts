import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'sales-1',
  email: 'sam@beco.co.ke',
  fullName: 'Sam',
  role: 'beco_sales' as const,
  isActive: true,
  mustChangePassword: false,
}));

vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

const rpc = vi.fn();
const maybeSingle = vi.fn();
const getSupabase = vi.fn(async () => ({
  rpc,
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle }) }),
  }),
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => getSupabase() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const { claimQuote, updateQuoteLine, setQuoteStatus, createCounterQuote, addCatalogueLine, addCatalogueLines, updateQuoteLines, reopenQuote, linkQuoteCustomer, removeQuoteLine } = await import('../actions');

afterEach(() => {
  rpc.mockReset();
  maybeSingle.mockReset();
  requirePath.mockClear();
});

const lockForm = (over: Record<string, string> = {}) => {
  const form = new FormData();
  form.set('quoteId', '11111111-1111-4111-8111-111111111111');
  form.set('updatedAt', '2026-09-17T10:00:00.000Z');
  for (const [k, v] of Object.entries(over)) form.set(k, v);
  return form;
};

describe('quote actions', () => {
  it('re-checks the session on every write, not just the render', async () => {
    rpc.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({ data: { reference_number: 'BEC-Q-1' } });
    await claimQuote({}, lockForm());
    expect(requirePath).toHaveBeenCalledWith('/quotes');
  });

  it('refuses a stale lock with the salesperson-facing sentence', async () => {
    rpc.mockResolvedValue({ error: { code: 'PT409', message: 'This quote changed while you were editing' } });
    const result = await updateQuoteLine(
      {},
      lockForm({
        lineId: '11111111-1111-4111-8111-111111111111',
        quantity: '1',
        unitPrice: '65000',
      }),
    );
    expect(result.error).toMatch(/changed while you were editing/i);
  });

  it('requires a lost reason before calling the database', async () => {
    const result = await setQuoteStatus({}, lockForm({ status: 'lost' }));
    expect(result.error).toMatch(/why this quote was lost/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a web source on the counter path before touching the database', async () => {
    const form = new FormData();
    form.set('customerName', 'Achieng');
    form.set('customerPhone', '0722333730');
    form.set('source', 'web');
    form.set('items', JSON.stringify([{ description: 'Slab', quantity: 1, unitPrice: 65000 }]));
    const result = await createCounterQuote({}, form);
    expect(result.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('passes the picked customer to create_counter_quote, so the database snapshots the record (D130)', async () => {
    rpc.mockResolvedValue({ data: 'BEC-Q-9', error: null });
    const form = new FormData();
    form.set('customerName', 'Achieng');
    form.set('customerPhone', '0722333730');
    form.set('customerId', '44444444-4444-4444-8444-444444444444');
    form.set('source', 'walk_in');
    form.set('items', JSON.stringify([{ description: 'Slab', quantity: 1, unitPrice: 65000 }]));
    await expect(createCounterQuote({}, form)).rejects.toThrow('REDIRECT:/quotes/BEC-Q-9');
    expect(rpc).toHaveBeenCalledWith(
      'create_counter_quote',
      expect.objectContaining({ p_customer_id: '44444444-4444-4444-8444-444444444444' }),
    );
  });

  it('leaves the customer out when none was picked', async () => {
    rpc.mockResolvedValue({ data: 'BEC-Q-9', error: null });
    const form = new FormData();
    form.set('customerName', 'Achieng');
    form.set('customerPhone', '0722333730');
    form.set('source', 'walk_in');
    form.set('items', JSON.stringify([{ description: 'Slab', quantity: 1, unitPrice: 65000 }]));
    await expect(createCounterQuote({}, form)).rejects.toThrow('REDIRECT');
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty('p_customer_id');
  });

  it('links a quote to a customer through link_quote_customer under the lock (D130)', async () => {
    rpc.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({ data: { reference_number: 'BEC-Q-1' } });
    const result = await linkQuoteCustomer({}, lockForm({ customerId: '44444444-4444-4444-8444-444444444444' }));
    expect(result.ok).toBe('Customer linked.');
    expect(rpc).toHaveBeenCalledWith('link_quote_customer', {
      p_quote_id: '11111111-1111-4111-8111-111111111111',
      p_customer_id: '44444444-4444-4444-8444-444444444444',
      p_expected_updated_at: '2026-09-17T10:00:00.000Z',
    });
  });

  it('refuses a link with no customer before touching the database, and names a refused link plainly', async () => {
    const missing = await linkQuoteCustomer({}, lockForm());
    expect(missing.error).toBe('Pick a customer first');
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ error: { code: '42501', message: 'Not allowed' } });
    const refused = await linkQuoteCustomer({}, lockForm({ customerId: '44444444-4444-4444-8444-444444444444' }));
    expect(refused.error).toMatch(/do not have permission/i);
  });

  it('adds a catalogue product through add_catalogue_quote_line, not a free-typed name', async () => {
    rpc.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({ data: { reference_number: 'BEC-Q-1' } });
    const result = await addCatalogueLine(
      {},
      lockForm({
        productId: '22222222-2222-4222-8222-222222222222',
        quantity: '0.5',
        unitPrice: '89000',
      }),
    );
    expect(result.ok).toMatch(/added/i);
    expect(rpc).toHaveBeenCalledWith(
      'add_catalogue_quote_line',
      expect.objectContaining({
        p_product_id: '22222222-2222-4222-8222-222222222222',
        p_quantity: 0.5,
        p_unit_price: 89000,
      }),
    );
  });

  it('refuses a catalogue add with no product id before touching the database', async () => {
    const result = await addCatalogueLine({}, lockForm({ quantity: '1', unitPrice: '0' }));
    expect(result.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('adds several catalogue products through one add_catalogue_quote_lines call', async () => {
    rpc.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({ data: { reference_number: 'BEC-Q-1' } });
    const result = await addCatalogueLines(
      {},
      lockForm({
        items: JSON.stringify([
          { productId: '22222222-2222-4222-8222-222222222222', quantity: 0.5, unitPrice: 65000 },
          { productId: '33333333-3333-4333-8333-333333333333', quantity: 1, unitPrice: 89000 },
        ]),
      }),
    );
    expect(result.ok).toMatch(/2 items added/i);
    expect(rpc).toHaveBeenCalledWith(
      'add_catalogue_quote_lines',
      expect.objectContaining({
        p_items: [
          { product_id: '22222222-2222-4222-8222-222222222222', quantity: 0.5, unit_price: 65000 },
          { product_id: '33333333-3333-4333-8333-333333333333', quantity: 1, unit_price: 89000 },
        ],
      }),
    );
  });

  it('saves every dirty line through one update_quote_lines call', async () => {
    rpc.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({
      data: { reference_number: 'BEC-Q-1', updated_at: '2026-09-17T12:00:00.000Z' },
    });
    const result = await updateQuoteLines(
      {},
      lockForm({
        items: JSON.stringify([
          { lineId: '11111111-1111-4111-8111-111111111111', quantity: 3, unitPrice: 85000 },
          { lineId: '22222222-2222-4222-8222-222222222222', quantity: 0.5, unitPrice: 65000 },
        ]),
      }),
    );
    expect(result.ok).toMatch(/items saved/i);
    expect(result.updatedAt).toBe('2026-09-17T12:00:00.000Z');
    expect(rpc).toHaveBeenCalledWith(
      'update_quote_lines',
      expect.objectContaining({
        p_items: [
          { line_id: '11111111-1111-4111-8111-111111111111', quantity: 3, unit_price: 85000 },
          { line_id: '22222222-2222-4222-8222-222222222222', quantity: 0.5, unit_price: 65000 },
        ],
      }),
    );
  });

  it('refuses an empty line batch before touching the database', async () => {
    const result = await updateQuoteLines({}, lockForm({ items: '[]' }));
    expect(result.error).toMatch(/nothing to save/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('removes one line through remove_quote_line under the lock, and names it (D131)', async () => {
    rpc.mockResolvedValue({ data: 'Amber Jade', error: null });
    maybeSingle.mockResolvedValue({ data: { reference_number: 'BEC-Q-1' } });
    const result = await removeQuoteLine({}, lockForm({ lineId: '22222222-2222-4222-8222-222222222222' }));
    expect(requirePath).toHaveBeenCalledWith('/quotes');
    expect(rpc).toHaveBeenCalledWith('remove_quote_line', {
      p_quote_id: '11111111-1111-4111-8111-111111111111',
      p_line_id: '22222222-2222-4222-8222-222222222222',
      p_expected_updated_at: '2026-09-17T10:00:00.000Z',
    });
    expect(result).toEqual({ ok: 'Removed Amber Jade. Total updated.' });
  });

  it('refuses a removal with no line before touching the database', async () => {
    const result = await removeQuoteLine({}, lockForm({ lineId: 'not-a-line' }));
    expect(result.error).toBe('Pick the item to remove');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('passes the database refusal of a last line, or a colleague\'s quote, through as a sentence', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'P0001', message: 'A quote needs at least one item. Mark it lost instead.' },
    });
    const last = await removeQuoteLine({}, lockForm({ lineId: '22222222-2222-4222-8222-222222222222' }));
    expect(last.error).toBe('A quote needs at least one item. Mark it lost instead.');

    rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Not allowed' } });
    const other = await removeQuoteLine({}, lockForm({ lineId: '22222222-2222-4222-8222-222222222222' }));
    expect(other.error).toMatch(/do not have permission/i);
  });

  it('reopens a lost quote through reopen_quote', async () => {
    rpc.mockResolvedValue({ error: null });
    maybeSingle.mockResolvedValue({ data: { reference_number: 'BEC-Q-1' } });
    const result = await reopenQuote({}, lockForm());
    expect(result.ok).toMatch(/reopened/i);
    expect(rpc).toHaveBeenCalledWith(
      'reopen_quote',
      expect.objectContaining({
        p_quote_id: '11111111-1111-4111-8111-111111111111',
      }),
    );
  });
});

describe('markQuoteSharedWhatsApp', () => {
  it('refuses a document path that belongs to another quote, before touching the database', async () => {
    const { markQuoteSharedWhatsApp } = await import('../actions');
    getSupabase.mockClear();
    const result = await markQuoteSharedWhatsApp(
      'BEC-Q-00042',
      'quotes/BEC-Q-00043/3f2504e0-4f89-41d3-9a0c-0305e82c3301.pdf',
    );
    expect(result.error).toBe('That document does not belong to this quote.');
    expect(requirePath).toHaveBeenCalledWith('/quotes');
    expect(getSupabase).not.toHaveBeenCalled();
  });
});
