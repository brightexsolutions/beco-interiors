import Image from 'next/image';
import Link from 'next/link';
import { ProductCard, EmptyState, buttonClasses } from '@beco/ui';
import { getPublishedProducts, primaryImage, blurProps } from '@/lib/products';

/**
 * The real catalogue, read from the database with the anon key.
 *
 * Server rendered, so the content is in the HTML for search engines rather
 * than assembled in a browser. See the seo-checklist skill.
 */
export const metadata = {
  title: 'Sintered stone in Nairobi',
  description:
    'Large format sintered stone slabs, stocked in Nairobi. Heat, scratch and stain resistant surfaces for kitchens, bathrooms and feature walls.',
};

export default async function CataloguePage() {
  const products = await getPublishedProducts();

  return (
    <main className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 py-16">
      <header className="mb-12">
        <div className="flex items-baseline gap-4">
          <span aria-hidden className="h-px w-8 bg-warm-red" />
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            12mm Sintered Stones
          </p>
        </div>
        <h1 className="mt-4 max-w-[16ch] font-display text-5xl leading-[1.05] text-charcoal">
          Surfaces that outlast the room.
        </h1>
        <p className="mt-4 max-w-[62ch] text-base text-neutral-700">
          {products.length} colours and finishes, stocked in Nairobi. Heat, scratch and stain
          resistant, in large format slabs for kitchens, bathrooms, feature walls and flooring.
        </p>
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
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const img = primaryImage(p);
            return (
              <ProductCard
                key={p.id}
                name={p.name}
                href={`/product/${p.slug}`}
                priceDisplayMode={p.price_display_mode}
                price={p.price}
                compareAtPrice={p.compare_at_price}
                unit={p.unit}
                availability={p.availability}
                badge={p.badge}
                image={
                  img ? (
                    <Image
                      src={img.path}
                      alt={img.alt}
                      width={img.width}
                      height={img.height}
                      // Explicit dimensions and a blur placeholder, so nothing
                      // reflows as the image arrives.
                      {...blurProps(img)}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="h-full w-full object-cover"
                    />
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
