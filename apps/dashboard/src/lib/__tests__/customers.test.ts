import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({ userId: 'u', role: 'beco_sales' }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...(a as [])) }));

const limit = vi.fn();
const order = vi.fn(() => ({ limit }));
const or = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ or }));
const from = vi.fn(() => ({ select }));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

const { searchCustomers } = await import('../customers');

beforeEach(() => {
  vi.clearAllMocks();
  limit.mockResolvedValue({
    data: [
      { customer_name: 'Achieng O.', customer_phone: '+254722333730', customer_email: null, company: null, created_at: '2026-09-25T00:00:00Z' },
      { customer_name: 'Achieng Otieno', customer_phone: '0722333730', customer_email: 'a@example.com', company: null, created_at: '2026-09-01T00:00:00Z' },
    ],
    error: null,
  });
});

describe('searchCustomers', () => {
  it('gates on the Quotes route, like every quote read', async () => {
    await searchCustomers('Achieng');
    expect(requirePath).toHaveBeenCalledWith('/quotes');
  });

  it('does not query for fewer than two characters', async () => {
    expect(await searchCustomers(' a ')).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('searches name, email and company by text, newest first, and merges one phone into one customer', async () => {
    const matches = await searchCustomers('Achieng');
    expect(from).toHaveBeenCalledWith('quotes');
    const filter = String((or.mock.calls[0] as unknown as [string])[0]);
    expect(filter).toContain('customer_name.ilike."%Achieng%"');
    expect(filter).toContain('company.ilike."%Achieng%"');
    expect(filter).not.toContain('customer_phone');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(matches).toEqual([
      expect.objectContaining({ name: 'Achieng O.', quoteCount: 2, email: 'a@example.com' }),
    ]);
  });

  it('adds a phone match on the national digits for a number, whatever prefix was typed', async () => {
    await searchCustomers('0722 333');
    const filter = String((or.mock.calls[0] as unknown as [string])[0]);
    expect(filter).toContain('customer_phone.ilike."%722333%"');
  });

  it('cannot be steered into a different filter by a comma', async () => {
    await searchCustomers('x,customer_phone.neq.0');
    const filter = String((or.mock.calls[0] as unknown as [string])[0]);
    expect(filter.split(',')).toHaveLength(3);
  });

  it('says so plainly when the database refuses', async () => {
    limit.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(searchCustomers('Achieng')).rejects.toThrow('Customer search is not available right now.');
  });
});
