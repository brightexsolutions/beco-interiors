import type { MetadataRoute } from 'next';

// Admin surfaces are excluded from indexing in TWO places, not either:
// this robots.txt and the X-Robots-Tag header in next.config.ts.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
