import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, buttonClasses } from '@beco/ui';
import { ProductGrid } from '@/components/product-grid';
import {
  getCategoryBySlug, getCategorySlugs, getProductsByCategory,
} from '@/lib/products';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getCategorySlugs()).map((category) => ({ category }));
}

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.name,
    description:
      category.description?.slice(0, 155) ??
      `${category.name} stocked in Nairobi. Browse the range and request a quote from Beco Interiors.`,
    alternates: { canonical: `/shop/${category.slug}` },
    // D27: a category with nothing in it is thin content, so it stays out of
    // the index until the import gives it something to say. The flip is
    // automatic on published product count, because fifteen Drive folders are
    // still empty and nobody should have to remember to come back.
    robots: category.product_count === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params }: Params) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await getProductsByCategory(slug);

  return (
    <main className="mx-auto max-w-[1380px] px-6 py-16">
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 font-ui text-sm text-neutral-500">
          <li><Link href="/" className="hover:text-charcoal">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/shop" className="hover:text-charcoal">Shop</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-charcoal">{category.name}</li>
        </ol>
      </nav>

      <header className="mb-12">
        <h1 className="max-w-[16ch] font-display text-5xl leading-[1.05] text-charcoal">
          {category.name}
        </h1>
        {category.description ? (
          <div className="mt-6 max-w-[68ch] space-y-4 text-base leading-[1.6] text-neutral-700">
            {category.description.split('\n\n').map((para) => <p key={para}>{para}</p>)}
          </div>
        ) : null}
      </header>

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
        <ProductGrid products={products} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.beco.co.ke/' },
              { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://www.beco.co.ke/shop' },
              {
                '@type': 'ListItem', position: 3, name: category.name,
                item: `https://www.beco.co.ke/shop/${category.slug}`,
              },
            ],
          }),
        }}
      />
    </main>
  );
}
