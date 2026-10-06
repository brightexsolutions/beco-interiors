/**
 * The old WordPress site's URLs, carried over (D107).
 *
 * www.beco.co.ke ran a WooCommerce theme before this site, and Google still
 * lists its routes. The developer who submitted it left no record of them,
 * so this covers the shapes WordPress and WooCommerce give every site, and
 * `docs/SEO-MIGRATION.md` tells Beco how to add the exact URLs Search
 * Console shows. Every old route answers with a 301 to the page that now
 * does its job, so the signal the old page earned moves with it, or a 410
 * when there is nothing to move it to, so Google drops it quickly instead of
 * retrying a 404 for months.
 *
 * `next.config.ts` reads `LEGACY_REDIRECTS`; `proxy.ts` reads `GONE`. Both
 * are plain data so a test can hold them to the rule above.
 */

export interface LegacyRedirect {
  /** path-to-regexp, as Next's `redirects()` takes it. */
  source: string;
  destination: string;
}

/** Category slugs the old site is likely to have used, mapped to ours. */
const OLD_CATEGORY_TO_NEW: ReadonlyArray<[string, string]> = [
  ['sintered-stone', '/shop/sintered-stone'],
  ['sintered-stones', '/shop/sintered-stone'],
  ['stone', '/shop/sintered-stone'],
  ['slabs', '/shop/sintered-stone'],
  ['12mm-sintered-stone', '/shop/12mm-sintered-stones'],
  ['15mm-sintered-stone', '/shop/15mm-sintered-stones'],
  ['handles', '/shop/handles'],
  ['cabinet-handles', '/shop/handles'],
  ['knobs', '/shop/handles'],
  ['hardware', '/shop/hardware'],
  ['hinges', '/shop/hinges'],
  ['door-locks', '/shop/door-locks'],
  ['locks', '/shop/door-locks'],
  ['furniture-legs', '/shop/furniture-legs'],
  ['wall-panels', '/shop/wall-panels'],
  ['panels', '/shop/wall-panels'],
  ['acoustic-panels', '/shop/acoustic-wall-panels'],
  ['bamboo-panels', '/shop/bamboo-veneer-wall-panels'],
  ['spc-wall-panels', '/shop/spc-wall-panels'],
  ['flooring', '/shop/flooring'],
  ['spc-flooring', '/shop/spc-flooring'],
  ['accessories', '/shop/accessories'],
  ['kitchen-accessories', '/shop/kitchen-accessories'],
  ['office-accessories', '/shop/office-accessories'],
  ['floating-shelf-accessories', '/shop/floating-shelf-accessories'],
  ['lighting', '/shop'],
  ['lights', '/shop'],
];

/**
 * The old site's real category paths, from Search Console's indexed pages on
 * 6 October 2026. WooCommerce nested them, so the single slug list above
 * missed them all and they fell through to /shop: the WPC wall panels page,
 * the old site's second best page by clicks, among them. Each goes to the
 * range that does its job now. Lighting was retired (D103), so its pages go
 * to the shop. WPC panels go to the Wall Panels group, which holds every
 * panel Beco sells.
 */
const OLD_CATEGORY_PATHS: ReadonlyArray<[string, string]> = [
  ['sintered-stones/bold-marble-designs', '/shop/sintered-stone'],
  ['sintered-stones/plain-neutral-designs', '/shop/sintered-stone'],
  ['outdoor-decking-cladding', '/shop/wall-panels'],
  ['outdoor-decking-cladding/wpc-wall-panels', '/shop/wall-panels'],
  ['outdoor-decking-cladding/wpc-wall-panels/composite-cladding', '/shop/wall-panels'],
  ['outdoor-decking-cladding/wpc-wall-panels/solid-carbon-panels', '/shop/wall-panels'],
  ['furniture-fittings-accessories', '/shop/hardware'],
  ['furniture-fittings-accessories/handles', '/shop/handles'],
  ['furniture-fittings-accessories/malpha-hinges', '/shop/hinges'],
  ['furniture-fittings-accessories/sofa-legs', '/shop/furniture-legs'],
  ['furniture-fittings-accessories/push-to-open-systems', '/shop/hardware'],
  ['furniture-fittings-accessories/skirting-accessories', '/shop/wall-panel-accessories'],
  ['furniture-fittings-accessories/wireless-charging-ports', '/shop/office-accessories'],
  ['lighting/:path*', '/shop'],
];

export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  // The old site's real nested categories first, so they win over the
  // catch all below.
  ...OLD_CATEGORY_PATHS.flatMap(([path, destination]) => [
    { source: `/product-category/${path}`, destination },
    ...(path.endsWith(':path*') ? [] : [{ source: `/product-category/${path}/page/:page`, destination }]),
  ]),
  // The old Yoast sitemap Search Console still holds: point it at ours, so
  // Google walks from the sitemap it trusts to the new one.
  { source: '/sitemap_index.xml', destination: '/sitemap.xml' },
  // A single old page with no counterpart; it showed rooms, as the gallery does.
  { source: '/living-room-walk-through', destination: '/gallery' },

  // WooCommerce category and tag archives.
  ...OLD_CATEGORY_TO_NEW.map(([slug, destination]) => ({
    source: `/product-category/${slug}`,
    destination,
  })),
  ...OLD_CATEGORY_TO_NEW.map(([slug, destination]) => ({
    source: `/product-category/${slug}/page/:page`,
    destination,
  })),
  { source: '/product-category/:path*', destination: '/shop' },
  { source: '/product-tag/:path*', destination: '/shop' },
  { source: '/shop/page/:page', destination: '/shop' },
  { source: '/products', destination: '/shop' },
  { source: '/products/:path*', destination: '/shop' },
  { source: '/store', destination: '/shop' },
  { source: '/store/:path*', destination: '/shop' },
  { source: '/catalogue', destination: '/shop' },
  { source: '/catalog', destination: '/shop' },

  // WooCommerce's own pages. Nobody checks out here; they build a list and
  // ask for a quote.
  { source: '/cart', destination: '/quote' },
  { source: '/checkout', destination: '/quote' },
  { source: '/checkout/:path*', destination: '/quote' },
  { source: '/my-account', destination: '/quote' },
  { source: '/my-account/:path*', destination: '/quote' },
  { source: '/wishlist', destination: '/quote' },
  { source: '/request-a-quote', destination: '/quote' },
  { source: '/request-quote', destination: '/quote' },
  { source: '/get-a-quote', destination: '/quote' },
  { source: '/quotation', destination: '/quote' },

  // Pages WordPress themes name the same way everywhere.
  { source: '/home', destination: '/' },
  { source: '/index.php', destination: '/' },
  { source: '/sample-page', destination: '/' },
  { source: '/about-us', destination: '/about' },
  { source: '/aboutus', destination: '/about' },
  { source: '/who-we-are', destination: '/about' },
  { source: '/our-story', destination: '/about' },
  { source: '/company', destination: '/about' },
  { source: '/contact-us', destination: '/contact' },
  { source: '/contacts', destination: '/contact' },
  { source: '/showroom', destination: '/contact' },
  { source: '/visit-us', destination: '/contact' },
  { source: '/get-in-touch', destination: '/contact' },
  { source: '/our-team', destination: '/team' },
  { source: '/team-members', destination: '/team' },
  { source: '/meet-the-team', destination: '/team' },
  { source: '/projects', destination: '/gallery' },
  { source: '/projects/:path*', destination: '/gallery' },
  { source: '/portfolio', destination: '/gallery' },
  { source: '/portfolio/:path*', destination: '/gallery' },
  { source: '/our-work', destination: '/gallery' },
  { source: '/galleries', destination: '/gallery' },
  { source: '/gallery/:path+', destination: '/gallery' },
  { source: '/services', destination: '/about' },
  { source: '/services/:path*', destination: '/about' },
  { source: '/faq', destination: '/contact' },
  { source: '/faqs', destination: '/contact' },
  { source: '/privacy-policy', destination: '/privacy' },
  { source: '/terms-and-conditions', destination: '/terms' },
  { source: '/terms-conditions', destination: '/terms' },
  { source: '/terms-of-service', destination: '/terms' },

  // The WordPress blog's archives and permalinks.
  { source: '/news', destination: '/blog' },
  { source: '/news/:path*', destination: '/blog' },
  { source: '/articles', destination: '/blog' },
  { source: '/blog/page/:page', destination: '/blog' },
  { source: '/category/:path*', destination: '/blog' },
  { source: '/tag/:path*', destination: '/blog' },
  { source: '/author/:path*', destination: '/blog' },
  { source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug', destination: '/blog/:slug' },
  { source: '/:year(\\d{4})/:month(\\d{2})/:slug', destination: '/blog/:slug' },
  { source: '/:year(\\d{4})/:month(\\d{2})', destination: '/blog' },
  { source: '/:year(\\d{4})', destination: '/blog' },
];

/**
 * Paths that only ever existed because the site was WordPress. There is no
 * page to send them to, so they answer 410 Gone: a definite answer Google
 * acts on at once, where a 404 is retried for months.
 */
export const GONE: readonly RegExp[] = [
  /^\/wp-admin(\/|$)/,
  /^\/wp-login\.php$/,
  /^\/wp-register\.php$/,
  /^\/wp-cron\.php$/,
  /^\/wp-json(\/|$)/,
  /^\/wp-content(\/|$)/,
  /^\/wp-includes(\/|$)/,
  /^\/xmlrpc\.php$/,
  /^\/feed(\/|$)/,
  /^\/comments\/feed(\/|$)/,
  /\/feed\/?$/,
  /^\/wp-sitemap(-[a-z0-9-]+)?\.xml$/,
  /^\/[a-z0-9-]+-sitemap\.xml$/,
  /^\/readme\.html$/,
  /^\/license\.txt$/,
];

export const isGone = (pathname: string): boolean => GONE.some((pattern) => pattern.test(pathname));

/**
 * WordPress's `?p=123`, `?page_id=7` and `?s=search` shapes. The id means
 * nothing here, so they go to the home page or, for a search, to the shop
 * with the term kept.
 */
export const legacyQueryRedirect = (search: URLSearchParams): string | null => {
  if (search.has('s')) {
    const term = (search.get('s') ?? '').trim();
    return term ? `/shop/all?q=${encodeURIComponent(term)}` : '/shop';
  }
  if (search.has('p') || search.has('page_id') || search.has('cat') || search.has('product')) return '/';
  return null;
};

/**
 * A product slug the catalogue does not know, from an old URL. The nearest
 * useful page is the shop searched for the words in it, which is a soft
 * landing rather than a dead one: "/product/calacatta-gold-slab" lands on
 * the search for "calacatta gold slab".
 */
export const shopSearchFor = (slug: string): string => {
  const words = slug
    .toLowerCase()
    .replace(/\.(html?|php)$/, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !['slab', 'slabs', 'the', 'and', 'of', 'in', 'for', 'product', 'products'].includes(w))
    .slice(0, 4);
  return words.length > 0 ? `/shop/all?q=${encodeURIComponent(words.join(' '))}` : '/shop';
};
