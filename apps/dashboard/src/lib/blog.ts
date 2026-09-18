import type { createServerClient } from '@beco/supabase-client';
import type { Json } from '@beco/types';

type SupabaseClient = ReturnType<typeof createServerClient>;

export type StaffPostStatus = 'draft' | 'published';

export interface BlogCover {
  path: string;
  width: number;
  height: number;
  blur?: string;
}

export interface StaffBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImage: BlogCover | null;
  coverImageAlt: string | null;
  category: string | null;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  targetTerm: string | null;
  readingTime: number | null;
  status: StaffPostStatus;
  publishedAt: string | null;
  author: string;
  generatedByModel: string | null;
  generationPrompt: string | null;
  updatedAt: string;
}

export interface BlogListFilters {
  search?: string | undefined;
  status?: StaffPostStatus | undefined;
}

export const slugFromTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const readingTimeMinutes = (body: string): number => {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

export const parseCover = (value: Json | null): BlogCover | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const path = typeof value.path === 'string' ? value.path : null;
  const width = typeof value.width === 'number' ? value.width : null;
  const height = typeof value.height === 'number' ? value.height : null;
  if (!path || !width || !height) return null;
  return {
    path,
    width,
    height,
    blur: typeof value.blur === 'string' ? value.blur : undefined,
  };
};

const tagsOf = (value: Json): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const mapPost = (row: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image: Json | null;
  cover_image_alt: string | null;
  category: string | null;
  tags: Json;
  meta_title: string | null;
  meta_description: string | null;
  target_term: string | null;
  reading_time: number | null;
  status: StaffPostStatus;
  published_at: string | null;
  author: string;
  generated_by_model: string | null;
  generation_prompt: string | null;
  updated_at: string;
}): StaffBlogPost => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt,
  body: row.body,
  coverImage: parseCover(row.cover_image),
  coverImageAlt: row.cover_image_alt,
  category: row.category,
  tags: tagsOf(row.tags),
  metaTitle: row.meta_title,
  metaDescription: row.meta_description,
  targetTerm: row.target_term,
  readingTime: row.reading_time,
  status: row.status,
  publishedAt: row.published_at,
  author: row.author,
  generatedByModel: row.generated_by_model,
  generationPrompt: row.generation_prompt,
  updatedAt: row.updated_at,
});

const COLUMNS =
  'id, title, slug, excerpt, body, cover_image, cover_image_alt, category, tags, meta_title, meta_description, target_term, reading_time, status, published_at, author, generated_by_model, generation_prompt, updated_at';

export async function fetchBlogPosts(
  supabase: SupabaseClient,
  filters: BlogListFilters = {},
): Promise<StaffBlogPost[]> {
  let query = supabase.from('blog_posts').select(COLUMNS).order('updated_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) {
    const term = filters.search.replace(/[%]/g, '');
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,target_term.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPost);
}

export async function fetchBlogPost(supabase: SupabaseClient, id: string): Promise<StaffBlogPost | null> {
  const { data, error } = await supabase.from('blog_posts').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPost(data) : null;
}

export function coverPreviewUrl(cover: BlogCover | null): string | null {
  if (!cover) return null;
  if (cover.path.startsWith('/') || cover.path.startsWith('http')) return cover.path;
  const host = (process.env.NEXT_PUBLIC_IMAGE_HOST ?? '').replace(/\/$/, '');
  return host ? `${host}/${cover.path}-800.webp` : `/${cover.path}-800.webp`;
}

export function blogMutationMessage(error: { message: string; code?: string }): string {
  if (error.code === '23505') return 'That slug is already in use.';
  if (/row-level security|permission/i.test(error.message)) {
    return 'You do not have permission to write the blog.';
  }
  return error.message;
}
