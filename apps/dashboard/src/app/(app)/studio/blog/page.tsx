import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { BlogFilters } from '@/components/blog-filters';
import { BlogResults } from '@/components/blog-results';
import { NewBlogFab } from '@/components/new-blog';
import { fetchBlogPosts, type BlogListFilters } from '@/lib/blog';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Blog',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function BlogListPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/studio/blog');
  const params = await searchParams;
  const statusRaw = one(params.status);
  const filters: BlogListFilters = {
    search: one(params.search) || undefined,
    status: statusRaw === 'draft' || statusRaw === 'published' ? statusRaw : undefined,
  };
  const supabase = await getSupabase();
  const posts = await fetchBlogPosts(supabase, filters);

  return (
    <>
      <PageHeading eyebrow="Studio" title="Blog" />
      <div className="mb-4">
        <BlogFilters />
      </div>
      <div className="pb-24">
        <BlogResults posts={posts} />
      </div>
      <NewBlogFab />
    </>
  );
}
