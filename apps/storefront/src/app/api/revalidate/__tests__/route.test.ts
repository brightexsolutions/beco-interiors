import { afterEach, describe, expect, it, vi } from 'vitest';

const revalidatePath = vi.fn();
const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
  revalidateTag: (...a: unknown[]) => revalidateTag(...a),
}));

const { POST } = await import('../route');

afterEach(() => {
  revalidatePath.mockReset();
  revalidateTag.mockReset();
  vi.unstubAllEnvs();
});

const post = (body: unknown, secret?: string) =>
  POST(
    new Request('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/revalidate', () => {
  it('refuses a missing or wrong secret', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'right-secret');
    expect((await post({ tags: ['product:x'] })).status).toBe(401);
    expect((await post({ tags: ['product:x'] }, 'wrong-secret')).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('revalidates the product and category the dashboard named', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'right-secret');
    const res = await post(
      { tags: ['product:limestone-ivory', 'category:12mm-sintered-stones'], paths: ['/product/limestone-ivory', '/shop'] },
      'right-secret',
    );
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('product:limestone-ivory', 'max');
    expect(revalidateTag).toHaveBeenCalledWith('category:12mm-sintered-stones', 'max');
    expect(revalidatePath).toHaveBeenCalledWith('/product/limestone-ivory');
    expect(revalidatePath).toHaveBeenCalledWith('/shop');
  });

  it('ignores a path that is not site-relative, so this cannot be pointed at another host', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'right-secret');
    await post({ paths: ['https://example.com', '/shop'] }, 'right-secret');
    expect(revalidatePath).toHaveBeenCalledWith('/shop');
    expect(revalidatePath).not.toHaveBeenCalledWith('https://example.com');
  });
});
