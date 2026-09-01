import Image from 'next/image';
import { ProductCard, Reveal } from '@beco/ui';
import { QuickAddToQuote } from './quick-add-to-quote';
import { orderedImages, primaryImage, type CatalogueProduct, blurProps } from '@/lib/products';

/**
 * The grid, in one place, because it is the same on the home page, on /shop
 * and on every category. Duplicating it is how the card on one page quietly
 * stops matching the card on another.
 */
export function ProductGrid({ products }: { products: CatalogueProduct[] }) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => {
        const img = primaryImage(p);
        // Up to four frames, cycled on hover. More than that and the card
        // becomes a slideshow nobody asked to watch.
        const frames = orderedImages(p).slice(0, 4);
        return (
          <Reveal key={p.id} delay={(i % 4) * 60}>
            <ProductCard
              name={p.name}
              href={`/product/${p.slug}`}
              priceDisplayMode={p.price_display_mode}
              price={p.price}
              compareAtPrice={p.compare_at_price}
              unit={p.unit}
              availability={p.availability}
              badge={p.badge}
              action={
                <QuickAddToQuote
                  line={{ slug: p.slug, name: p.name, unit: p.unit, image: img?.path ?? null }}
                />
              }
              images={frames.map((f) => (
                <Image
                  key={f.path}
                  src={f.path}
                  alt=""
                  fill
                  {...blurProps(f)}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              ))}
              image={
                img ? (
                  <Image
                    src={img.path} alt={img.alt} width={img.width} height={img.height}
                    {...blurProps(img)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="h-full w-full object-cover"
                  />
                ) : undefined
              }
            />
          </Reveal>
        );
      })}
    </div>
  );
}
