import type { MetadataRoute } from 'next';

/**
 * The dashboard and Studio answer on their own subdomains and are excluded
 * there as well as here, per the security rules.
 *
 * `/quote` is a personal working list rather than a page for search
 * results, and says so with its own noindex. It is not disallowed here: a
 * disallowed page cannot be fetched, so its noindex is never read, and X's
 * crawler will not draw a link preview for a URL robots.txt blocks.
 *
 * `/og/` is allowed explicitly for the same reason: it holds the share
 * cards, and a scraper that honours robots.txt must be able to fetch them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/og/'], disallow: ['/design-system', '/api/'] }],
    sitemap: 'https://www.beco.co.ke/sitemap.xml',
    host: 'https://www.beco.co.ke',
  };
}
