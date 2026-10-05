import { jpegResponse } from '@/lib/og/card';
import { renderCatalogueCard } from '@/lib/og/catalogue';
import { getBlogPostBySlug } from '@/lib/blog';

/** A post's share card, from its cover. Cached for the hour the post is. */
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return new Response('Not found', { status: 404 });
  const card = await renderCatalogueCard(
    post.cover_image?.path,
    { eyebrow: post.category ?? 'Journal', title: post.title },
    'blog',
  );
  return jpegResponse(card, 3600);
}
