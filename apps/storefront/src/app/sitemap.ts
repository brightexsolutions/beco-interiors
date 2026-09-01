import type { MetadataRoute } from 'next';
import { getCategoriesWithProducts, getProductSlugs } from '@/lib/products';

const BASE = 'https://www.beco.co.ke';

/**
 * Generated from the database, so it lists what is actually published rather
 * than what someone remembered to add.
 *
 * Categories come from `getCategoriesWithProducts`, which filters to those
 * that actually hold something. Per D27 an empty category is noindexed and
 * kept out of the sitemap until the import lands products in it, and that flip
 * is automatic because fifteen Drive folders are still empty.
 *
 * `/quote` is deliberately absent: it is a personal working list, not a page
 * for search results, and it carries noindex to match.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, slugs] = await Promise.all([
    getCategoriesWithProducts(),
    getProductSlugs(),
  ]);

  return [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/shop`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.7 },
    ...categories.map((c) => ({
      url: `${BASE}/shop/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...slugs.map((slug) => ({
      url: `${BASE}/product/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
