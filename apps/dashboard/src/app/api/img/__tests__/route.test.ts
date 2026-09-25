import { afterEach, describe, expect, it, vi } from 'vitest';

const getProductObject = vi.fn();
const isSafeR2Key = vi.fn((key: string) => key.length > 0 && !key.includes('..') && !key.startsWith('/'));
vi.mock('@/lib/product-storage', () => ({
  getProductObject: (...a: Parameters<typeof getProductObject>) => getProductObject(...a),
  isSafeR2Key: (...a: Parameters<typeof isSafeR2Key>) => isSafeR2Key(...a),
}));

const { GET } = await import('../[...path]/route');

afterEach(() => {
  getProductObject.mockReset();
  isSafeR2Key.mockClear();
});

describe('GET /api/img', () => {
  it('streams the webp when R2 has the key', async () => {
    getProductObject.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'image/webp',
    });
    const response = await GET(new Request('http://localhost/api/img/team/a/ab12-400.webp') as never, {
      params: Promise.resolve({ path: ['team', 'a', 'ab12-400.webp'] }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(getProductObject).toHaveBeenCalledWith('team/a/ab12-400.webp');
  });

  it('refuses a traversal key before touching storage', async () => {
    isSafeR2Key.mockReturnValue(false);
    const response = await GET(new Request('http://localhost/api/img/../secret') as never, {
      params: Promise.resolve({ path: ['..', 'secret'] }),
    });
    expect(response.status).toBe(400);
    expect(getProductObject).not.toHaveBeenCalled();
  });
});
