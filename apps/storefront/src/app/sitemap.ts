import type { MetadataRoute } from 'next';
import { getBlogPostSlugs } from '@/lib/blog';
import { getIndexableCategories, getProductSlugs, getPublicTeam } from '@/lib/products';

const BASE = 'https://www.beco.co.ke';

/**
 * Generated from the database, so it lists what is actually published rather
 * than what someone remembered to add.
 *
 * Categories come from `getIndexableCategories`, which asks the question of
 * the whole SUBTREE: a range group holds no products of its own, so counting
 * only its own row would have listed twenty five slabs while leaving the page
 * above them out. Per D27 an empty category is noindexed and kept out of the
 * sitemap until the import lands products in it, and that flip is automatic
 * because most Drive folders are still empty.
 *
 * /team is here only once an agent is actually published, for the same reason
 * and by the same rule as an empty category.
 *
 * `/quote` is deliberately absent: it is a personal working list, not a page
 * for search results, and it carries noindex to match.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, slugs, team, blogSlugs] = await Promise.all([
    getIndexableCategories(),
    getProductSlugs(),
    getPublicTeam(),
    getBlogPostSlugs(),
  ]);

  return [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/shop`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/gallery`, changeFrequency: 'monthly', priority: 0.7 },
    ...(blogSlugs.length > 0
      ? [{ url: `${BASE}/blog`, changeFrequency: 'monthly' as const, priority: 0.6 }]
      : []),
    ...(team.length > 0
      ? [{ url: `${BASE}/team`, changeFrequency: 'monthly' as const, priority: 0.5 }]
      : []),
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
    ...blogSlugs.map((slug) => ({
      url: `${BASE}/blog/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
