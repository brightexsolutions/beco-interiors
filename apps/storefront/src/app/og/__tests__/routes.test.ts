// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/products')>();
  return {
    ...actual,
    getProductBySlug: vi.fn(async (slug: string) =>
      slug === 'amber-jade'
        ? { name: 'Amber Jade', slug, category: { name: '12mm Sintered Stones' }, images: [{ role: 'slab', path: 'k/amber-jade/slab-0' }] }
        : null),
    getCategoryWithTree: vi.fn(async (slug: string) =>
      slug === 'hinges'
        ? { category: { id: 'h', name: 'Hinges', slug, children: [] }, parent: { name: 'Hardware' }, ancestors: [], children: [] }
        : null),
    getProductsInCategories: vi.fn(async () => []),
  };
});

vi.mock('@/lib/blog', () => ({
  getBlogPostBySlug: vi.fn(async (slug: string) =>
    slug === 'guide' ? { slug, title: 'A guide', category: null, cover_image: null } : null),
}));

// No image host in the test: every catalogue fetch fails, which is exactly
// the path that must still answer with a card.
vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 404 })));

const section = await import('../[section]/route');
const product = await import('../product/[slug]/route');
const range = await import('../range/[slug]/route');
const blog = await import('../blog/[slug]/route');

const ctx = <T extends object>(params: T) => ({ params: Promise.resolve(params) });
const req = new Request('https://www.beco.co.ke/og');

const expectCard = async (res: Response) => {
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/jpeg');
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 1200, 630]);
};

describe('/og routes', () => {
  it('prerenders exactly the known sections, and nothing else', () => {
    expect(section.dynamicParams).toBe(false);
    expect(section.generateStaticParams().map((p) => p.section)).toContain('home');
  });

  it('serves a section card, and 404s an unknown section', async () => {
    await expectCard(await section.GET(req, ctx({ section: 'contact' })));
    expect((await section.GET(req, ctx({ section: 'nope' }))).status).toBe(404);
  }, 30_000);

  it('serves a product card even when its photograph cannot be fetched', async () => {
    await expectCard(await product.GET(req, ctx({ slug: 'amber-jade' })));
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/k\/amber-jade\/slab-0-1600\.webp$/), expect.anything());
  }, 30_000);

  it('serves a range card for a range with no photographs yet', async () => {
    await expectCard(await range.GET(req, ctx({ slug: 'hinges' })));
  }, 30_000);

  it('serves a post card from the blog photograph when the post has no cover', async () => {
    await expectCard(await blog.GET(req, ctx({ slug: 'guide' })));
  }, 30_000);

  it('404s an unknown product, range or post rather than drawing a card for it', async () => {
    expect((await product.GET(req, ctx({ slug: 'x' }))).status).toBe(404);
    expect((await range.GET(req, ctx({ slug: 'x' }))).status).toBe(404);
    expect((await blog.GET(req, ctx({ slug: 'x' }))).status).toBe(404);
  });

  it('caches catalogue cards for the hour their pages are', () => {
    expect([product.revalidate, range.revalidate, blog.revalidate]).toEqual([3600, 3600, 3600]);
  });
});
