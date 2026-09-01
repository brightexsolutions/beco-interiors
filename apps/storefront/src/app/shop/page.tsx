import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, buttonClasses } from '@beco/ui';
import { PageHeader } from '@/components/page-header';
import { ProductGrid } from '@/components/product-grid';
import { getPublishedProducts, getCategoriesWithProducts } from '@/lib/products';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Shop interior finishing materials',
  description:
    'Sintered stone slabs, panels, lighting and accessories, stocked in Nairobi. Browse the range and request a quote.',
  alternates: { canonical: '/shop' },
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    getPublishedProducts(),
    getCategoriesWithProducts(),
  ]);

  return (
    <main className="mx-auto max-w-[1380px] px-6 py-20 lg:py-24">
      <PageHeader
        className="mb-14"
        eyebrow="Everything in stock"
        title="Interior finishing materials."
        lede={`${products.length} products, held in Nairobi. Add what the project needs to a list and we will price the whole thing at once.`}
      />

      {categories.length > 1 ? (
        <nav aria-label="Categories" className="mb-14 flex flex-wrap gap-x-8 gap-y-3 border-y border-neutral-200 py-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.slug}`}
              className="inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:text-warm-red-deep"
            >
              {c.name}
              <span className="ml-2 font-normal text-neutral-500">{c.product_count}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title="The range is being photographed"
          description="Our team can advise on specification and pricing directly in the meantime."
          action={
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
          }
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </main>
  );
}
