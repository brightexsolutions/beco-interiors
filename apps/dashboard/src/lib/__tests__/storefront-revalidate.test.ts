import { afterEach, describe, expect, it, vi } from 'vitest';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (...a: Parameters<typeof revalidatePath>) => revalidatePath(...a) }));

const { revalidateStorefront, revalidateCategory } = await import('../storefront-revalidate');

afterEach(() => {
  revalidatePath.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('revalidateStorefront', () => {
  it('always refreshes the dashboard catalogue list', async () => {
    await revalidateStorefront({ productSlug: 'limestone-ivory' });
    expect(revalidatePath).toHaveBeenCalledWith('/products');
  });

  it('posts tags and paths to the storefront when the secret is set', async () => {
    vi.stubEnv('STOREFRONT_URL', 'http://localhost:3000');
    vi.stubEnv('REVALIDATE_SECRET', 's3cret');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await revalidateStorefront({
      productSlug: 'limestone-ivory-renamed',
      formerSlug: 'limestone-ivory',
      categorySlug: '12mm-sintered-stones',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/revalidate');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer s3cret');
    const body = JSON.parse(String(init.body)) as { tags: string[]; paths: string[] };
    expect(body.tags).toEqual([
      'product:limestone-ivory-renamed',
      'product:limestone-ivory',
      'category:12mm-sintered-stones',
    ]);
    expect(body.paths).toContain('/product/limestone-ivory-renamed');
    expect(body.paths).toContain('/shop/12mm-sintered-stones');
  });

  it('skips the HTTP call when the secret is missing, so local saves still work', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await revalidateStorefront({ productSlug: 'limestone-ivory' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('revalidateCategory', () => {
  it('busts the shop index, the range itself, the former slug and the parent group', async () => {
    vi.stubEnv('STOREFRONT_URL', 'http://localhost:3000');
    vi.stubEnv('REVALIDATE_SECRET', 's3cret');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await revalidateCategory({
      categorySlug: 'bamboo-veneer',
      formerSlug: 'bamboo-veneer-panels',
      parentSlug: 'wall-panels',
    });

    expect(revalidatePath).toHaveBeenCalledWith('/categories');
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      paths: string[];
    };
    expect(body.paths).toEqual([
      '/shop',
      '/shop/bamboo-veneer',
      '/shop/bamboo-veneer-panels',
      '/shop/wall-panels',
    ]);
  });

  it('leaves out the former slug and the parent when neither applies', async () => {
    vi.stubEnv('STOREFRONT_URL', 'http://localhost:3000');
    vi.stubEnv('REVALIDATE_SECRET', 's3cret');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await revalidateCategory({ categorySlug: 'lighting' });

    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      paths: string[];
    };
    expect(body.paths).toEqual(['/shop', '/shop/lighting']);
  });
});

describe('revalidateStorefrontPaths', () => {
  it('refreshes the announcements list and posts the storefront root', async () => {
    vi.stubEnv('STOREFRONT_URL', 'http://localhost:3000');
    vi.stubEnv('REVALIDATE_SECRET', 's3cret');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { revalidateStorefrontPaths } = await import('../storefront-revalidate');
    await revalidateStorefrontPaths(['/']);
    expect(revalidatePath).toHaveBeenCalledWith('/announcements');
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      paths: string[];
    };
    expect(body.paths).toEqual(['/']);
  });
});
