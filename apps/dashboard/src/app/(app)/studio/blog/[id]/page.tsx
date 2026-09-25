import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeading } from '@/components/page-heading';
import { ShellPageLabel } from '@/components/shell-context';
import { BlogEditor } from '@/components/blog-editor';
import { fetchBlogPost } from '@/lib/blog';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Edit article',
  robots: { index: false, follow: false },
};

export default async function BlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePath('/studio/blog');
  const { id } = await params;
  const supabase = await getSupabase();
  const post = await fetchBlogPost(supabase, id);
  if (!post) notFound();

  return (
    <>
      <ShellPageLabel label={post.title || 'Edit article'} />
      <PageHeading eyebrow="Studio" title={post.title} />
      <BlogEditor post={post} defaultAuthor={session.fullName} />
    </>
  );
}
