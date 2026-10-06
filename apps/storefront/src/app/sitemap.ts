import type { MetadataRoute } from 'next';
import { getBlogSitemapEntries } from '@/lib/blog';
import { getIndexableCategories, getProductSitemapEntries, getPublicTeam } from '@/lib/products';
import { SITE_URL } from '@/lib/seo';

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
 * Products and posts carry `lastModified` from their own rows, so Google
 * recrawls a repriced slab without being asked and leaves the rest alone
 * (D107). Pages whose change date nothing records carry none: a made-up date
 * is worse than no date, since Google stops trusting the field.
 *
 * /team is here only once an agent is actually published, for the same reason
 * and by the same rule as an empty category.
 *
 * `/quote` is deliberately absent: it is a personal working list, not a page
 * for search results, and it carries noindex to match.
 */
export const revalidate = 3600;

const BASE = SITE_URL;

const dateOf = (value: string | null | undefined): Date | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, team, posts] = await Promise.all([
    getIndexableCategories(),
    getProductSitemapEntries(),
    getPublicTeam(),
    getBlogSitemapEntries(),
  ]);

  const newestProduct = products
    .map((p) => dateOf(p.updated_at))
    .filter((d): d is Date => d !== undefined)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${BASE}/shop`,
      changeFrequency: 'weekly',
      priority: 0.9,
      ...(newestProduct ? { lastModified: newestProduct } : {}),
    },
    // The flat list of everything, D119. Indexable unfiltered, noindex with a search or sort.
    { url: `${BASE}/shop/all`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/gallery`, changeFrequency: 'monthly', priority: 0.7 },
    ...(posts.length > 0
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
    ...products.map((p) => {
      const lastModified = dateOf(p.updated_at);
      return {
        url: `${BASE}/product/${p.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
        ...(lastModified ? { lastModified } : {}),
      };
    }),
    ...posts.map((p) => {
      const lastModified = dateOf(p.published_at);
      return {
        url: `${BASE}/blog/${p.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
        ...(lastModified ? { lastModified } : {}),
      };
    }),
  ];
}
