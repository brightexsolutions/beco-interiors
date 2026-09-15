import { createClient } from '@supabase/supabase-js';

/**
 * Read with the ANON key, so `blog_read_published` is the authority on what
 * is visible here, the same pattern `lib/products.ts` uses: an unpublished
 * or soft deleted row is invisible because the database says so, not
 * because a query remembered to filter status = 'published'.
 */
export interface BlogCoverImage {
  path: string;
  width: number;
  height: number;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: BlogCoverImage | null;
  cover_image_alt: string | null;
  category: string | null;
  reading_time: number | null;
  published_at: string | null;
}

export interface BlogPost extends BlogPostSummary {
  body: string;
  tags: string[];
  target_term: string | null;
  meta_title: string | null;
  meta_description: string | null;
  author: string;
}

const anon = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

const SUMMARY_COLUMNS =
  'slug,title,excerpt,cover_image,cover_image_alt,category,reading_time,published_at';

export const getPublishedBlogPosts = async (): Promise<BlogPostSummary[]> => {
  const { data, error } = await anon()
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .order('published_at', { ascending: false });
  if (error) throw new Error(`could not load blog posts: ${error.message}`);
  return (data ?? []) as unknown as BlogPostSummary[];
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  const { data, error } = await anon()
    .from('blog_posts')
    .select(
      `${SUMMARY_COLUMNS},body,tags,target_term,meta_title,meta_description,author`,
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`could not load blog post: ${error.message}`);
  if (!data) return null;
  return data as unknown as BlogPost;
};

export interface BlogCategoryFacet {
  name: string;
  count: number;
}

/** Pure, so the sidebar's category list is testable without a database.
    Counts stay against the FULL list even when a caller has already
    filtered `posts`, the same reason the shop's facet counts never drop
    to zero under their own filter. */
export const blogCategoryFacets = (posts: { category: string | null }[]): BlogCategoryFacet[] => {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (!post.category) continue;
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getBlogPostSlugs = async (): Promise<string[]> => {
  const { data, error } = await anon().from('blog_posts').select('slug');
  if (error) throw new Error(`could not load blog post slugs: ${error.message}`);
  return (data ?? []).map((r) => r.slug as string);
};
