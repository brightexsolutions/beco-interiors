import { afterEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ order: orderMock }) }),
  }),
}));

const { getPublishedClients } = await import('../clients');

afterEach(() => orderMock.mockReset());

describe('getPublishedClients', () => {
  it('returns the rows on a successful read', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'a', name: 'Art Caffe', slug: 'art-caffe', logo: null, project: null, sector: null }],
      error: null,
    });
    const clients = await getPublishedClients();
    expect(clients).toHaveLength(1);
    expect(clients[0]?.name).toBe('Art Caffe');
  });

  it('returns an empty list on a Supabase error, so a credential strip never breaks its page', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'timeout' } });
    expect(await getPublishedClients()).toEqual([]);
  });

  it('returns an empty list when data is null with no error', async () => {
    orderMock.mockResolvedValue({ data: null, error: null });
    expect(await getPublishedClients()).toEqual([]);
  });
});
