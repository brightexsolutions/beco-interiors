import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { BlogEditor } from '@/components/blog-editor';
import { requirePath } from '@/lib/session';

export const metadata: Metadata = {
  title: 'New article',
  robots: { index: false, follow: false },
};

export default async function NewBlogPage() {
  const session = await requirePath('/studio/blog');
  return (
    <>
      <PageHeading eyebrow="Studio" title="New article" />
      <BlogEditor post={null} defaultAuthor={session.fullName} />
    </>
  );
}
