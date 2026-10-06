import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Metadata } from 'next';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Built as production builds it. Static pages compute their metadata at
// import, so this has to be in place before any page module loads.
vi.hoisted(() => {
  process.env.VERCEL_ENV = 'production';
});

const SITE = 'https://www.beco.co.ke';

vi.mock('@/lib/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/products')>();
  const category = {
    id: 'c1', name: '12mm Sintered Stones', slug: '12mm-sintered-stones',
    description: 'Sintered stone is made by compacting natural mineral particles under very high pressure and heat. '.repeat(4),
    source_path: null, parent_id: 'p1', product_count: 3, children: [], total_count: 3,
  };
  return {
    ...actual,
    getPublicTeam: vi.fn(async () => [{ id: 't1' }]),
    getCategoryWithTree: vi.fn(async (slug: string) =>
      slug === 'hinges'
        ? { category: { ...category, id: 'h', name: 'Hinges', slug: 'hinges', description: null }, parent: null, ancestors: [], children: [] }
        : { category, parent: { ...category, id: 'p1', name: 'Sintered Stone', slug: 'sintered-stone' }, ancestors: [], children: [] }),
    categoryIsIndexable: vi.fn(async (slug: string) => slug !== 'hinges'),
    getProductBySlug: vi.fn(async (slug: string) => {
      if (slug === 'amber-jade') {
        return {
          name: 'Amber Jade', slug: 'amber-jade', meta_title: null, meta_description: null,
          short_description: 'Warm taupe, greige and amber tones run in soft drifts across a matt slab.',
          category: { name: '12mm Sintered Stones', slug: '12mm-sintered-stones', description: null },
          images: [{ role: 'slab', path: '12mm-sintered-stones/amber-jade/slab-0', alt: 'x', width: 1600, height: 3200 }],
        };
      }
      if (slug === 'black-handles') {
        return {
          name: 'Black Handles', slug: 'black-handles', meta_title: null, meta_description: null, short_description: null,
          category: { name: 'Handles', slug: 'handles', description: null }, images: [],
        };
      }
      return null;
    }),
    getCanonicalProductSlug: vi.fn(async () => null),
  };
});

vi.mock('@/lib/blog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/blog')>();
  return {
    ...actual,
    getBlogPostBySlug: vi.fn(async (slug: string) =>
      slug === 'sintered-stone-buying-guide'
        ? {
            slug, title: 'A buyer\'s guide to sintered stone', excerpt: 'What to look for in a sintered stone slab before you buy one for a Nairobi kitchen, from thickness and finish to edges and joins.',
            cover_image: { path: '12mm-sintered-stones/sandstone-beige/slab-0', width: 1600, height: 900 },
            cover_image_alt: 'A kitchen worktop in sintered stone', category: 'Guides', reading_time: 6,
            published_at: '2026-09-01T08:00:00.000Z', body: '', tags: [], target_term: null,
            meta_title: null, meta_description: null, author: 'Beco Interiors',
          }
        : null),
  };
});

type Og = { url: string; title: string; description: string; siteName: string; type: string; images: { url: string; width: number; height: number; alt: string; type: string }[] };
type Tw = { card: string; title: string; images: { url: string; alt: string }[] };

const params = <T extends object>(value: T) => Promise.resolve(value);
const noSearch = { searchParams: params({}) };

/**
 * Every storefront page, how to get its metadata, and its canonical path.
 * The inventory test below fails when a page file exists that is not in
 * this list, so a new page cannot ship without a share card being checked.
 */
const PAGES: { file: string; path: string; load: () => Promise<Metadata> }[] = [
  { file: 'page.tsx', path: '/', load: async () => (await import('../page')).metadata },
  { file: 'shop/page.tsx', path: '/shop', load: async () => (await import('../shop/page')).metadata },
  { file: 'shop/all/page.tsx', path: '/shop/all', load: async () => (await import('../shop/all/page')).generateMetadata(noSearch) },
  {
    file: 'shop/[category]/page.tsx', path: '/shop/12mm-sintered-stones',
    load: async () => (await import('../shop/[category]/page')).generateMetadata({ params: params({ category: '12mm-sintered-stones' }), ...noSearch }),
  },
  {
    file: 'product/[slug]/page.tsx', path: '/product/amber-jade',
    load: async () => (await import('../product/[slug]/page')).generateMetadata({ params: params({ slug: 'amber-jade' }) }),
  },
  { file: 'gallery/page.tsx', path: '/gallery', load: async () => (await import('../gallery/page')).generateMetadata(noSearch) },
  { file: 'blog/page.tsx', path: '/blog', load: async () => (await import('../blog/page')).generateMetadata(noSearch) },
  {
    file: 'blog/[slug]/page.tsx', path: '/blog/sintered-stone-buying-guide',
    load: async () => (await import('../blog/[slug]/page')).generateMetadata({ params: params({ slug: 'sintered-stone-buying-guide' }) }),
  },
  { file: 'about/page.tsx', path: '/about', load: async () => (await import('../about/page')).metadata },
  { file: 'contact/page.tsx', path: '/contact', load: async () => (await import('../contact/page')).metadata },
  { file: 'team/page.tsx', path: '/team', load: async () => (await import('../team/page')).generateMetadata() },
  { file: 'quote/page.tsx', path: '/quote', load: async () => (await import('../quote/page')).metadata },
  { file: 'privacy/page.tsx', path: '/privacy', load: async () => (await import('../privacy/page')).metadata },
  { file: 'terms/page.tsx', path: '/terms', load: async () => (await import('../terms/page')).metadata },
];

/** Internal and noindex, nofollow: it inherits the root fallback card. */
const EXEMPT = ['design-system/page.tsx'];

const resolved = new Map<string, Metadata>();
beforeAll(async () => {
  for (const page of PAGES) resolved.set(page.path, await page.load());
}, 60_000);

const titleOf = (meta: Metadata): string => {
  const t = meta.title as string | { absolute: string };
  return typeof t === 'string' ? `${t} | Beco Interiors` : t.absolute;
};

describe('every storefront page states a complete share card', () => {
  it('covers every page file in the app', () => {
    const appDir = join(process.cwd(), 'apps/storefront/src/app');
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name === 'page.tsx') found.push(relative(appDir, full));
      }
    };
    walk(appDir);
    expect(found.sort()).toEqual([...PAGES.map((p) => p.file), ...EXEMPT].sort());
  });

  it.each(PAGES.map((p) => [p.path, p] as const))('%s has an absolute JPEG og:image with size and alt', (path) => {
    const meta = resolved.get(path)!;
    const og = meta.openGraph as unknown as Og;
    expect(og.images).toHaveLength(1);
    const [image] = og.images;
    expect(image!.url).toMatch(new RegExp(`^${SITE}/og/`));
    expect(image!.width).toBe(1200);
    expect(image!.height).toBe(630);
    expect(image!.type).toBe('image/jpeg');
    expect(image!.alt.length).toBeGreaterThan(10);
    expect(image!.url).not.toMatch(/\.webp|localhost|\/api\//);
  });

  it.each(PAGES.map((p) => [p.path, p] as const))('%s has canonical, og:url, site name and a large Twitter card', (path) => {
    const meta = resolved.get(path)!;
    const og = meta.openGraph as unknown as Og;
    const tw = meta.twitter as unknown as Tw;
    expect(meta.alternates?.canonical).toBe(path);
    expect(og.url).toBe(path === '/' ? `${SITE}/` : `${SITE}${path}`);
    expect(og.siteName).toBe('Beco Interiors');
    expect(og.title).toBe(titleOf(meta));
    expect(og.description).toBe(meta.description);
    expect(tw.card).toBe('summary_large_image');
    expect(tw.images[0]!.url).toBe(og.images[0]!.url);
    expect(tw.images[0]!.alt).toBe(og.images[0]!.alt);
  });

  it.each(PAGES.map((p) => [p.path, p] as const))('%s has a search length title and description, without an em dash', (path) => {
    const meta = resolved.get(path)!;
    const title = titleOf(meta);
    const description = String(meta.description);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThanOrEqual(110);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(`${title} ${description} ${(meta.openGraph as unknown as Og).images[0]!.alt}`).not.toMatch(/\u2014/);
  });

  it('gives every page its own title and description', () => {
    const titles = PAGES.map((p) => titleOf(resolved.get(p.path)!));
    const descriptions = PAGES.map((p) => String(resolved.get(p.path)!.description));
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe('per page type', () => {
  const og = (path: string) => resolved.get(path)!.openGraph as unknown as Og;

  it('a product card is drawn from the product, named for its own range', () => {
    expect(og('/product/amber-jade').images[0]!.url).toBe(`${SITE}/og/product/amber-jade`);
    expect(og('/product/amber-jade').images[0]!.alt).toContain('Amber Jade');
    expect(titleOf(resolved.get('/product/amber-jade')!)).toBe('Amber Jade, 12mm Sintered Stones | Beco Interiors');
  });

  it('a non stone product is no longer called sintered stone', async () => {
    const { generateMetadata } = await import('../product/[slug]/page');
    const meta = await generateMetadata({ params: params({ slug: 'black-handles' }) });
    expect(titleOf(meta)).toBe('Black Handles in Nairobi | Beco Interiors');
    expect(String(meta.description)).not.toMatch(/sintered/i);
    expect((meta.openGraph as unknown as Og).images[0]!.url).toBe(`${SITE}/og/product/black-handles`);
  });

  it('a range card is drawn from the range and the range is indexable', () => {
    expect(og('/shop/12mm-sintered-stones').images[0]!.url).toBe(`${SITE}/og/range/12mm-sintered-stones`);
    expect(resolved.get('/shop/12mm-sintered-stones')!.robots).toBeUndefined();
  });

  it('an empty range keeps its card but is noindex', async () => {
    const { generateMetadata } = await import('../shop/[category]/page');
    const meta = await generateMetadata({ params: params({ category: 'hinges' }), ...noSearch });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
    expect((meta.openGraph as unknown as Og).images[0]!.url).toBe(`${SITE}/og/range/hinges`);
    expect(String(meta.description).length).toBeGreaterThanOrEqual(110);
  });

  it('a filtered range is noindex and canonical to the bare range', async () => {
    const { generateMetadata } = await import('../shop/[category]/page');
    const meta = await generateMetadata({ params: params({ category: '12mm-sintered-stones' }), searchParams: params({ q: 'white' }) });
    expect(meta.robots).toMatchObject({ index: false });
    expect(meta.alternates?.canonical).toBe('/shop/12mm-sintered-stones');
    expect((meta.openGraph as unknown as Og).url).toBe(`${SITE}/shop/12mm-sintered-stones`);
  });

  it('a blog post is an article with its cover card and the cover alt', () => {
    const post = og('/blog/sintered-stone-buying-guide');
    expect(post.type).toBe('article');
    expect(post.images[0]!.url).toBe(`${SITE}/og/blog/sintered-stone-buying-guide`);
    expect(post.images[0]!.alt).toBe('A kitchen worktop in sintered stone');
    expect((post as unknown as { publishedTime: string }).publishedTime).toBe('2026-09-01T08:00:00.000Z');
  });

  it('pages without a photograph use their own section card', () => {
    expect(og('/').images[0]!.url).toBe(`${SITE}/og/home`);
    expect(og('/about').images[0]!.url).toBe(`${SITE}/og/about`);
    expect(og('/contact').images[0]!.url).toBe(`${SITE}/og/contact`);
    expect(og('/gallery').images[0]!.url).toBe(`${SITE}/og/gallery`);
    expect(og('/privacy').images[0]!.url).toBe(`${SITE}/og/legal`);
  });

  it('the quote list stays out of search but still previews', () => {
    expect(resolved.get('/quote')!.robots).toMatchObject({ index: false, follow: true });
    expect(og('/quote').images[0]!.url).toBe(`${SITE}/og/quote`);
  });
});
