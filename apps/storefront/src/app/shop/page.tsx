import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, buttonClasses } from '@beco/ui';
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
    <main className="mx-auto max-w-[1380px] px-6 py-16">
      <header className="mb-12">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-8 bg-warm-red" />
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Everything in stock
          </p>
        </div>
        <h1 className="mt-4 max-w-[16ch] font-display text-5xl leading-[1.05] text-charcoal">
          Interior finishing materials.
        </h1>
        <p className="mt-4 max-w-[62ch] text-base text-neutral-700">
          {products.length} products, held in Nairobi. Add what the project needs to a list and
          we will price the whole thing at once.
        </p>
      </header>

      {categories.length > 1 ? (
        <nav aria-label="Categories" className="mb-12 flex flex-wrap gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.slug}`}
              className="inline-flex min-h-11 items-center rounded-[2px] border border-neutral-300 px-5 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-charcoal transition-colors hover:border-charcoal"
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
