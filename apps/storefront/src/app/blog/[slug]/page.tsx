import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown, { type Components } from 'react-markdown';
import { BlogSidebar } from '@/components/blog-sidebar';
import {
  blogCategoryFacets, getBlogPostBySlug, getBlogPostSlugs, getPublishedBlogPosts,
  type BlogPost,
} from '@/lib/blog';
import { getPublishedProducts, primaryImage } from '@/lib/products';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getBlogPostSlugs()).map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return {};

  return {
    // The override columns win, so a post can be tuned without a deploy,
    // the same rule product pages already follow.
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: post.cover_image
      ? {
          images: [
            {
              url: post.cover_image.path,
              width: post.cover_image.width,
              height: post.cover_image.height,
            },
          ],
        }
      : undefined,
  };
}

/** `text-base leading-[1.65] text-neutral-700 lg:text-lg`, the same body copy
    treatment `/shop/[category]` gives its own long form buying guidance,
    so an article reads like the rest of the site rather than like a
    markdown renderer's default. */
const MARKDOWN_COMPONENTS: Components = {
  h2: ({ children }) => (
    <h2 className="mt-10 font-display text-2xl leading-tight text-charcoal first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 font-display text-xl leading-tight text-charcoal">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-base leading-[1.65] text-neutral-700 lg:text-lg">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-[1.65] text-neutral-700 lg:text-lg">
      {children}
    </ul>
  ),
  a: ({ href, children }) => (
    <Link
      href={href ?? '#'}
      className="font-semibold text-charcoal underline decoration-warm-red underline-offset-4 hover:text-warm-red-deep"
    >
      {children}
    </Link>
  ),
};

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const [post, allPosts, products] = await Promise.all([
    getBlogPostBySlug(slug), getPublishedBlogPosts(), getPublishedProducts(),
  ]);
  if (!post) notFound();

  const published = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;
  const promoImage = products.map(primaryImage).find((img) => img !== undefined);

  return (
    <main className="mx-auto max-w-[1380px] px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 font-ui text-sm text-neutral-500">
          <li><Link href="/" className="hover:text-charcoal">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/blog" className="hover:text-charcoal">Blog</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-charcoal">{post.title}</li>
        </ol>
      </nav>

      {/* Widened from a flat 68ch container to a real column, reported
          directly: the title and the cover image were capped at the same
          measure as a paragraph needs, which is narrower than either one
          benefits from. Only the PROSE itself, in the div below, keeps the
          68ch cap the design rules set for body copy; the column around it
          is free to use the room a sidebar leaves it. */}
      <div className="grid gap-16 lg:grid-cols-[1fr_20rem]">
        <article>
          {post.category ? (
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {post.category}
            </p>
          ) : null}
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-charcoal sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 font-ui text-sm text-neutral-500">
            {post.author}
            {published ? <> &middot; {published}</> : null}
            {post.reading_time ? <> &middot; {post.reading_time} min read</> : null}
          </p>

          {post.cover_image ? (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-neutral-100">
              <Image
                src={post.cover_image.path}
                alt={post.cover_image_alt ?? ''}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="mt-2 max-w-[68ch]">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{post.body}</ReactMarkdown>
          </div>
        </article>

        <BlogSidebar
          categories={blogCategoryFacets(allPosts)}
          promoImage={promoImage}
          className="lg:sticky lg:top-32 lg:self-start"
        />
      </div>

      <BlogPostingSchema post={post} />
    </main>
  );
}

export function BlogPostingSchema({ post }: { post: BlogPost }) {
  const url = `https://www.beco.co.ke/blog/${post.slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.cover_image
      ? { image: [new URL(post.cover_image.path, 'https://www.beco.co.ke').toString()] }
      : {}),
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: SITE.name },
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.beco.co.ke/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.beco.co.ke/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
