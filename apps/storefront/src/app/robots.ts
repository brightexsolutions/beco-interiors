import type { MetadataRoute } from 'next';

/**
 * The dashboard and Studio answer on their own subdomains and are excluded
 * there as well as here, per the security rules. `/quote` is a personal
 * working list rather than a page for search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/quote', '/design-system', '/api/'] }],
    sitemap: 'https://www.beco.co.ke/sitemap.xml',
    host: 'https://www.beco.co.ke',
  };
}
