import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * A range slug nothing published answers to: a former slug of a range
 * redirects there, permanently; anything else is a 404. The case that made
 * this real is /shop/heixin-12mm, retired with the supplier names on 7
 * October (D104 amended), whose stones now sit in /shop/12mm-sintered-stones.
 */
class Redirected extends Error {
  constructor(public url: string) { super(`redirect ${url}`); }
}
class NotFound extends Error {}

const canonical = vi.fn<(slug: string) => Promise<string | null>>();

vi.mock('next/navigation', () => ({
  permanentRedirect: (url: string) => { throw new Redirected(url); },
  notFound: () => { throw new NotFound(); },
}));

vi.mock('@/lib/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/products')>()),
  getCategoryWithTree: vi.fn(async () => null),
  getCategoryTree: vi.fn(async () => []),
  getCanonicalCategorySlug: (slug: string) => canonical(slug),
}));

const page = await import('../page');
const args = (category: string) => ({ params: Promise.resolve({ category }), searchParams: Promise.resolve({}) });

afterEach(() => canonical.mockReset());

describe('/shop/[category] for a slug no published range holds', () => {
  it('redirects a retired supplier range to the range its stones moved to', async () => {
    canonical.mockResolvedValue('12mm-sintered-stones');
    await expect(page.default(args('heixin-12mm'))).rejects.toMatchObject({ url: '/shop/12mm-sintered-stones' });
    await expect(page.generateMetadata(args('heixin-12mm'))).rejects.toMatchObject({ url: '/shop/12mm-sintered-stones' });
    expect(canonical).toHaveBeenCalledWith('heixin-12mm');
  });

  it('is a 404 when no range ever held the slug', async () => {
    canonical.mockResolvedValue(null);
    await expect(page.default(args('no-such-range'))).rejects.toBeInstanceOf(NotFound);
    await expect(page.generateMetadata(args('no-such-range'))).rejects.toBeInstanceOf(NotFound);
  });
});
