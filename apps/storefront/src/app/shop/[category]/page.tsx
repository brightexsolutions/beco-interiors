import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, Reveal, CutoutReveal, buttonClasses } from '@beco/ui';
import { ProductGrid } from '@/components/product-grid';
import {
  getCategoryWithTree, getCategorySlugs, getProductsByCategory, getProductsInCategories,
  categoryIsIndexable, primaryImage, blurProps, type Category, type CatalogueProduct,
} from '@/lib/products';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getCategorySlugs()).map((category) => ({ category }));
}

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category: slug } = await params;
  const tree = await getCategoryWithTree(slug);
  if (!tree) return {};
  const { category } = tree;

  // Asked of the SUBTREE, so a group counts what is beneath it. The same
  // helper backs the sitemap, so the robots tag and the sitemap cannot
  // disagree about whether this page exists for search.
  const indexable = await categoryIsIndexable(slug);

  return {
    title: category.name,
    description:
      category.description?.slice(0, 155) ??
      `${category.name} stocked in Nairobi. Browse the range and request a quote from Beco Interiors.`,
    alternates: { canonical: `/shop/${category.slug}` },
    // D27: a category with nothing in it is thin content, so it stays out of
    // the index until the import gives it something to say. The flip is
    // automatic on published product count, because Drive folders are still
    // being filled and nobody should have to remember to come back.
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { category: slug } = await params;
  const tree = await getCategoryWithTree(slug);
  if (!tree) notFound();
  const { category, parent, children } = tree;

  // One route, two jobs. A group shows the ranges beneath it and everything
  // in them; a range shows its own products. Branching here rather than in two
  // routes keeps /shop/<anything> a single URL shape, which is what the
  // breadcrumbs, the sitemap and every existing link already assume.
  const isGroup = children.length > 0;
  const products = isGroup
    ? await getProductsInCategories([category.id, ...children.map((c) => c.id)])
    : await getProductsByCategory(slug);

  const cover = products.map(primaryImage).find((img) => img !== undefined);

  return (
    <main>
      {/* Split into two padded halves rather than one wrapper, so the cutout
          section below, which is full bleed with its own background, can sit
          BETWEEN them as a true edge to edge break instead of nesting inside
          a container that already caps the width and pads the sides, which
          would apply both twice. When nothing sits between them the two
          halves are plain stacked siblings and the page reads exactly as it
          did as one wrapper, per normal margin collapse. */}
      <div className="mx-auto max-w-[1380px] px-6 pt-16 sm:pt-20 lg:pt-24">
      <nav aria-label="Breadcrumb" className="mb-10">
        <ol className="flex flex-wrap items-center gap-2 font-ui text-sm text-neutral-500">
          <li><Link href="/" className="hover:text-charcoal">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/shop" className="hover:text-charcoal">Shop</Link></li>
          {parent ? (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/shop/${parent.slug}`} className="hover:text-charcoal">
                  {parent.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-charcoal">{category.name}</li>
        </ol>
      </nav>

      {/* --- The opening ran down the left at a capped measure with nothing
              opposite it, so a long description left half the screen blank.
              The photograph and the facts now hold the right hand column, and
              on a range with no photography the facts hold it alone. --- */}
      <header className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-8 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {parent ? parent.name : 'The range'}
            </p>
          </div>

          <h1 className="mt-5 max-w-[15ch] font-display text-5xl leading-[1.04] tracking-[-0.015em] text-charcoal sm:text-6xl">
            {category.name}
          </h1>

          {category.description ? (
            <div className="mt-6 max-w-[62ch] space-y-4 text-base leading-[1.65] text-neutral-700 lg:text-lg">
              {category.description.split('\n\n').map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
            <Link href="/contact" className={buttonClasses({ variant: 'outline' })}>
              Visit the showroom
            </Link>
          </div>
        </div>

        <aside className="lg:col-span-5">
          {cover ? (
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
              <Image
                src={cover.path}
                alt={cover.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                {...blurProps(cover)}
                className="object-cover"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
              />
            </div>
          ) : null}

          <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
            <Fact
              term={isGroup ? 'Ranges' : 'In stock'}
              value={
                isGroup
                  ? `${children.length}`
                  : products.length > 0
                    ? `${products.length} ${products.length === 1 ? 'colour' : 'colours'}`
                    : 'Being photographed'
              }
            />
            <Fact term="Collection" value="Urban Square, Industrial Area" />
            <Fact term="Advice" value={SITE.phone} href={SITE.phoneHref} />
          </dl>
        </aside>
      </header>

      {isGroup ? <ChildRanges parent={category} children={children} products={products} /> : null}
      </div>

      {/* The same cutout treatment as the home page's teaser for this range,
          added 4 September, but its own copy and no repeated stat: the fact
          block above already states the finish count, and stacking the same
          number under it a few hundred pixels later would read as filler
          rather than as new information. See D73. Gated on the slug, not on
          being a leaf: this is the one range with a cutout photograph today,
          not a treatment every range gets by default. Full bleed, a sibling
          of the two padded halves rather than nested in either. */}
      {category.slug === 'handles' ? (
        <CutoutReveal
          eyebrow="On the floor"
          title="Match it to the room."
          body="Bring a cabinet door or a paint chip and hold it against the finish in person. Matte black reads differently under a kitchen's own light than it does on a screen."
          image={
            <Image
              src="/cutouts/black-handle.webp"
              alt="A matte black cabinet handle"
              width={1257}
              height={1400}
              sizes="(max-width: 1024px) 70vw, 22rem"
              className="h-auto w-full"
            />
          }
          stats={[]}
          cta={{ label: 'Visit the showroom', href: '/contact' }}
          reverse
        />
      ) : null}

      <div className="mx-auto max-w-[1380px] px-6 pb-16 sm:pb-20 lg:pb-24">
      <div className="mt-16">
        {products.length === 0 ? (
          <EmptyState
            title="This range is coming soon"
            description="We are photographing it now. In the meantime our team can advise on
                         specification and pricing directly."
            action={
              <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
                Request a quote
              </Link>
            }
          />
        ) : (
          <>
            {isGroup ? (
              <h2 className="mb-8 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Everything in {category.name.toLowerCase()}
              </h2>
            ) : null}
            <ProductGrid products={products} />
          </>
        )}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.beco.co.ke/' },
              { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://www.beco.co.ke/shop' },
              // The group is a real level in the tree, so it is a real step in
              // the trail. Skipping it told search engines the taxonomy was
              // flatter than the navigation actually is.
              ...(parent
                ? [{
                    '@type': 'ListItem', position: 3, name: parent.name,
                    item: `https://www.beco.co.ke/shop/${parent.slug}`,
                  }]
                : []),
              {
                '@type': 'ListItem', position: parent ? 4 : 3, name: category.name,
                item: `https://www.beco.co.ke/shop/${category.slug}`,
              },
            ],
          }),
        }}
      />

      {/* ItemList over the grid, so the products on this page are stated as an
          ordered set rather than left to be inferred from the markup. */}
      {products.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: category.name,
              numberOfItems: products.length,
              itemListElement: products.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: p.name,
                url: `https://www.beco.co.ke/product/${p.slug}`,
              })),
            }),
          }}
        />
      ) : null}
      </div>
    </main>
  );
}

function Fact({ term, value, href }: { term: string; value: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {term}
      </dt>
      <dd className="text-right font-ui text-sm font-semibold text-charcoal">
        {href ? (
          <a href={href} className="underline-offset-4 hover:underline">{value}</a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/** The ranges under a group, each linking to its own page. */
function ChildRanges({
  parent, children, products,
}: {
  parent: Category;
  children: Category[];
  products: CatalogueProduct[];
}) {
  const coverFor = (child: Category) =>
    products
      .filter((p) => p.category?.slug === child.slug)
      .map(primaryImage)
      .find((img) => img !== undefined);

  return (
    <section className="mt-20 border-t border-neutral-200 pt-12">
      <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        Ranges in {parent.name.toLowerCase()}
      </h2>

      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {children.map((child, i) => {
          const cover = coverFor(child);
          return (
            <Reveal key={child.id} delay={(i % 4) * 60}>
              <Link href={`/shop/${child.slug}`} className="group block">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal">
                  {cover ? (
                    <Image
                      src={cover.path}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 25vw"
                      {...blurProps(cover)}
                      className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.04]"
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                  />
                </div>
                <p className="mt-4 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-charcoal">
                  {child.name}
                  <span
                    aria-hidden
                    className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                  />
                </p>
                <p className="mt-1 font-ui text-sm text-neutral-500">
                  {child.product_count > 0
                    ? `${child.product_count} in stock`
                    : 'Being photographed'}
                </p>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
