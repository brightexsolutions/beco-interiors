import { describe, expect, it, vi } from 'vitest';
import { fetchNewQuoteCount } from '../nav-counts';

const clientReturning = (result: { count: number | null; error: unknown }) => {
  const is = vi.fn(async () => result);
  const eq = vi.fn(() => ({ is }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as Parameters<typeof fetchNewQuoteCount>[0], from, select, eq, is };
};

describe('fetchNewQuoteCount', () => {
  it('counts new, undeleted quotes with a head-only exact count', async () => {
    const c = clientReturning({ count: 4, error: null });
    expect(await fetchNewQuoteCount(c.client, 'beco_sales')).toBe(4);
    expect(c.from).toHaveBeenCalledWith('quotes');
    expect(c.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(c.eq).toHaveBeenCalledWith('status', 'new');
    expect(c.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('does not query at all for a role that cannot open Quotes', async () => {
    const c = clientReturning({ count: 9, error: null });
    expect(await fetchNewQuoteCount(c.client, 'beco_product_manager')).toBe(0);
    expect(await fetchNewQuoteCount(c.client, 'beco_editor')).toBe(0);
    expect(c.from).not.toHaveBeenCalled();
  });

  it('reads a failed count as zero rather than breaking the shell', async () => {
    const c = clientReturning({ count: null, error: { message: 'boom' } });
    expect(await fetchNewQuoteCount(c.client, 'beco_admin')).toBe(0);
  });
});
