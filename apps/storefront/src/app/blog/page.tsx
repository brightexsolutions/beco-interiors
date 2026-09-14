import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { EmptyState } from '@beco/ui';
import { BlogSidebar } from '@/components/blog-sidebar';
import { PageHeader } from '@/components/page-header';
import { StoneSlider } from '@/components/stone-slider';
import { blogCategoryFacets, getPublishedBlogPosts, type BlogPostSummary } from '@/lib/blog';
import { getPublishedProducts, primaryImage, stoneSlidesFrom } from '@/lib/products';

export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Search> },
): Promise<Metadata> {
  const category = one((await searchParams).category);
  return {
    title: 'Blog',
    description:
      'Buying guides and material notes from Beco: what sintered stone is, where it works, and how to source interior materials in Nairobi.',
    // Same rule the shop's own facets follow, D29: a filtered view
    // canonicalises to the base and carries noindex, so a category link
    // cannot generate a second indexable copy of the same list.
    alternates: { canonical: '/blog' },
    ...(category ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<Search> }) {
  const category = one((await searchParams).category);
  const [allPosts, products] = await Promise.all([getPublishedBlogPosts(), getPublishedProducts()]);
  const posts = category ? allPosts.filter((p) => p.category === category) : allPosts;
  const promoImage = products.map(primaryImage).find((img) => img !== undefined);
  const stoneSlides = stoneSlidesFrom(products);

  return (
    <main className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 py-16 sm:py-20">
      {/* Grid rather than PageHeader's own aside slot, the same fix and the
          same reason as the About page: a short one-line aside bottom-aligns
          against the heading correctly, a 360px image does not. Reported
          directly as blank space the article grid below could start from
          instead. */}
      <div className="mb-14 grid gap-x-12 gap-y-8 lg:grid-cols-[1fr_18rem] lg:items-start">
        <PageHeader
          eyebrow="Notes from Beco"
          title="The blog."
          lede="Buying guides and material notes, written from the same catalogue and prices the shop uses, not a separate marketing voice."
        />
        {stoneSlides.length > 1 ? (
          <StoneSlider slides={stoneSlides} className="hidden lg:block" />
        ) : null}
      </div>

      <div className="grid gap-16 lg:grid-cols-[1fr_20rem]">
        <div>
          {posts.length === 0 ? (
            <EmptyState
              title={category ? `Nothing in ${category} yet` : 'Nothing published yet'}
              description={
                category
                  ? 'Try another category, or see everything published so far.'
                  : 'The first articles are on their way.'
              }
              action={
                category ? (
                  <Link href="/blog" className="font-ui text-sm font-semibold text-warm-red-deep underline-offset-4 hover:underline">
                    Show every article
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
              {posts.map((post) => (
                <li key={post.slug}>
                  <BlogCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <BlogSidebar
          categories={blogCategoryFacets(allPosts)}
          activeCategory={category || undefined}
          promoImage={promoImage}
          className="lg:sticky lg:top-32 lg:self-start"
        />
      </div>
    </main>
  );
}

function BlogCard({ post }: { post: BlogPostSummary }) {
  return (
    <article className="group">
      <Link
        href={`/blog/${post.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-neutral-100 after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15"
      >
        {post.cover_image ? (
          <Image
            src={post.cover_image.path}
            alt={post.cover_image_alt ?? ''}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[600ms] ease-brand group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : null}
      </Link>

      <div className="pt-4">
        {post.category ? (
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {post.category}
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-2xl leading-tight text-charcoal">
          <Link
            href={`/blog/${post.slug}`}
            className="relative inline-block after:absolute after:inset-0 focus:outline-none focus-visible:underline focus-visible:decoration-warm-red focus-visible:underline-offset-4"
          >
            {post.title}
          </Link>
        </h2>
        {post.excerpt ? (
          <p className="mt-2 max-w-[42ch] text-base text-neutral-700">{post.excerpt}</p>
        ) : null}
        {post.reading_time ? (
          <p className="mt-3 font-ui text-sm text-neutral-500">
            {post.reading_time} min read
          </p>
        ) : null}
      </div>
    </article>
  );
}
