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
      {
        id: 'c1',
        name: 'Achieng Otieno',
        phone: '0722333730',
        email: 'a@example.com',
        company: null,
        kra_pin: null,
        quote_count: 2,
        last_activity_at: '2026-09-25T00:00:00Z',
      },
    ],
    error: null,
  });
});

describe('searchCustomers', () => {
  it('gates on the Quotes route, since only the roles that raise quotes pick a customer', async () => {
    await searchCustomers('Achieng');
    expect(requirePath).toHaveBeenCalledWith('/quotes');
  });

  it('does not query for fewer than two characters', async () => {
    expect(await searchCustomers(' a ')).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('reads the customer records, most recently active first, and maps them', async () => {
    const matches = await searchCustomers('Achieng');
    expect(from).toHaveBeenCalledWith('customer_overview');
    expect(String((or.mock.calls[0] as unknown as [string])[0])).toContain('name.ilike."%Achieng%"');
    expect(order).toHaveBeenCalledWith('last_activity_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(8);
    expect(matches).toEqual([expect.objectContaining({ id: 'c1', name: 'Achieng Otieno', quoteCount: 2 })]);
  });

  it('says so plainly when the database refuses', async () => {
    limit.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(searchCustomers('Achieng')).rejects.toThrow('Customer search is not available right now.');
  });
});
