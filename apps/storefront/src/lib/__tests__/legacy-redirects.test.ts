import { describe, expect, it } from 'vitest';
import { GONE, LEGACY_REDIRECTS, isGone, legacyQueryRedirect, shopSearchFor } from '../legacy-redirects';

const NEW_PAGES = new Set(['/', '/shop', '/quote', '/about', '/contact', '/team', '/gallery', '/blog', '/privacy', '/terms', '/sitemap.xml']);

describe('LEGACY_REDIRECTS', () => {
  it('sends every old route to a page that exists, never to another old route', () => {
    for (const rule of LEGACY_REDIRECTS) {
      const base = rule.destination.split('?')[0]!;
      const ok = NEW_PAGES.has(base) || base.startsWith('/shop/') || base.startsWith('/blog/');
      expect(ok, `${rule.source} -> ${rule.destination}`).toBe(true);
      expect(rule.source.startsWith('/')).toBe(true);
    }
  });

  it('has no duplicate sources, so the first match is the only match', () => {
    const sources = LEGACY_REDIRECTS.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('never redirects a route the new site owns', () => {
    const owned = ['/', '/shop', '/quote', '/about', '/contact', '/gallery', '/team', '/blog', '/privacy', '/terms', '/product/:slug', '/shop/:category', '/blog/:slug'];
    for (const rule of LEGACY_REDIRECTS) expect(owned).not.toContain(rule.source);
  });

  it('maps the WooCommerce shapes Beco\'s old site would have carried', () => {
    const find = (source: string) => LEGACY_REDIRECTS.find((r) => r.source === source)?.destination;
    expect(find('/product-category/handles')).toBe('/shop/handles');
    expect(find('/product-category/sintered-stone')).toBe('/shop/sintered-stone');
    expect(find('/product-category/lighting')).toBe('/shop');
    expect(find('/product-category/:path*')).toBe('/shop');
    expect(find('/cart')).toBe('/quote');
    expect(find('/about-us')).toBe('/about');
    expect(find('/contact-us')).toBe('/contact');
    expect(find('/:year(\\d{4})/:month(\\d{2})/:slug')).toBe('/blog/:slug');
  });
});

describe('GONE', () => {
  it('answers the WordPress-only paths and nothing a visitor would type', () => {
    for (const path of ['/wp-admin', '/wp-admin/edit.php', '/wp-login.php', '/xmlrpc.php', '/wp-json/wp/v2/posts', '/wp-content/uploads/2024/01/x.jpg', '/feed', '/feed/', '/category/news/feed', '/wp-sitemap.xml', '/wp-sitemap-posts-post-1.xml', '/product-sitemap.xml']) {
      expect(isGone(path), path).toBe(true);
    }
    for (const path of ['/', '/shop', '/shop/handles', '/product/amber-jade', '/blog/one', '/sitemap.xml', '/robots.txt', '/api/health', '/feedback']) {
      expect(isGone(path), path).toBe(false);
    }
    expect(GONE.length).toBeGreaterThan(10);
  });
});

describe('legacyQueryRedirect', () => {
  it('keeps a search term and drops a post id', () => {
    expect(legacyQueryRedirect(new URLSearchParams('s=black handles'))).toBe('/shop/all?q=black%20handles');
    expect(legacyQueryRedirect(new URLSearchParams('s='))).toBe('/shop');
    expect(legacyQueryRedirect(new URLSearchParams('p=123'))).toBe('/');
    expect(legacyQueryRedirect(new URLSearchParams('page_id=7'))).toBe('/');
    expect(legacyQueryRedirect(new URLSearchParams('utm_source=x'))).toBeNull();
  });
});

describe('shopSearchFor', () => {
  it('turns an unknown product slug into a shop search for its words', () => {
    expect(shopSearchFor('calacatta-gold-slab')).toBe('/shop/all?q=calacatta%20gold');
    expect(shopSearchFor('ht-8350-black-gold-handle.html')).toBe('/shop/all?q=ht%208350%20black%20gold');
    expect(shopSearchFor('---')).toBe('/shop');
  });
});

/**
 * The old site's real category URLs, as Search Console listed them indexed on
 * 6 October 2026. Each must reach its own range, not fall through to /shop,
 * which is what the WPC wall panels page (the old site's second best page by
 * clicks) was doing.
 */
describe('the old site\'s indexed category URLs', () => {
  const find = (path: string) => LEGACY_REDIRECTS.find((r) => r.source === path)?.destination;
  const cases: Array<[string, string]> = [
    ['/product-category/sintered-stones', '/shop/sintered-stone'],
    ['/product-category/sintered-stones/bold-marble-designs', '/shop/sintered-stone'],
    ['/product-category/sintered-stones/plain-neutral-designs', '/shop/sintered-stone'],
    ['/product-category/outdoor-decking-cladding', '/shop/wall-panels'],
    ['/product-category/outdoor-decking-cladding/wpc-wall-panels', '/shop/wall-panels'],
    ['/product-category/outdoor-decking-cladding/wpc-wall-panels/page/:page', '/shop/wall-panels'],
    ['/product-category/outdoor-decking-cladding/wpc-wall-panels/composite-cladding', '/shop/wall-panels'],
    ['/product-category/outdoor-decking-cladding/wpc-wall-panels/solid-carbon-panels', '/shop/wall-panels'],
    ['/product-category/furniture-fittings-accessories/handles', '/shop/handles'],
    ['/product-category/furniture-fittings-accessories/malpha-hinges', '/shop/hinges'],
    ['/product-category/furniture-fittings-accessories/sofa-legs', '/shop/furniture-legs'],
    ['/product-category/furniture-fittings-accessories/push-to-open-systems', '/shop/hardware'],
    ['/product-category/furniture-fittings-accessories/skirting-accessories', '/shop/wall-panel-accessories'],
    ['/product-category/furniture-fittings-accessories/wireless-charging-ports', '/shop/office-accessories'],
    ['/product-category/lighting/:path*', '/shop'],
  ];
  it.each(cases)('%s reaches %s', (path, destination) => {
    expect(find(path)).toBe(destination);
  });

  it('lists every nested category before the catch all, so it wins', () => {
    const catchAll = LEGACY_REDIRECTS.findIndex((r) => r.source === '/product-category/:path*');
    for (const [path] of cases) {
      const at = LEGACY_REDIRECTS.findIndex((r) => r.source === path);
      expect(at, path).toBeGreaterThanOrEqual(0);
      expect(at, path).toBeLessThan(catchAll);
    }
  });

  it('points the old Yoast sitemap at the new one, and no longer answers it 410', () => {
    expect(find('/sitemap_index.xml')).toBe('/sitemap.xml');
    expect(isGone('/sitemap_index.xml')).toBe(false);
  });
});

