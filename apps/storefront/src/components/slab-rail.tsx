import Image from 'next/image';
import Link from 'next/link';
import { blurProps, primaryImage, type CatalogueProduct } from '@/lib/products';

/**
 * The pinned rail, per D31.
 *
 * The section is tall, the frame inside it sticks for the duration, and the
 * track slides sideways across exactly the distance it overflows by. That
 * shows twelve stones in one screen, which a vertical grid cannot do without
 * pushing the rest of the page a long way down.
 *
 * The page scroll is never intercepted: this is a `position: sticky` frame and
 * a CSS scroll driven transform, so the scrollbar behaves normally and a fast
 * flick still reaches the footer. Where `animation-timeline` is unsupported
 * the track simply scrolls horizontally by hand, which is why it keeps
 * `overflow-x: auto` and snap points.
 *
 * On mobile the pin is dropped and it is a plain swipe row.
 */
export function SlabRail({ products }: { products: CatalogueProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-label="The full range" className="border-y border-neutral-200">
      {/* Tall on desktop, so the sticky frame has scroll distance to consume.
          Height is what sets how long the rail takes to cross. */}
      <div className="lg:h-[320vh]">
        <div className="lg:sticky lg:top-14 lg:flex lg:h-[calc(100vh-3.5rem)] lg:flex-col lg:justify-center">
          <div className="mx-auto w-full max-w-[1380px] px-6">
            <div className="flex flex-wrap items-end justify-between gap-6 pb-10 pt-20 lg:pt-0">
              <div className="beco-clip">
                <div className="beco-wipe">
                  <div className="flex items-center gap-4">
                    <span aria-hidden className="h-px w-8 bg-warm-red" />
                    <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      The full range
                    </p>
                  </div>
                  <h2 className="mt-4 max-w-[16ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-charcoal sm:text-5xl">
                    Every colour we hold.
                  </h2>
                </div>
              </div>
              <Link
                href="/shop"
                className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-4 hover:underline"
              >
                Browse all colours
              </Link>
            </div>
          </div>

          {/* overflow-x stays scrollable, so this is usable by hand wherever
              the scroll driven transform does not run. */}
          <div className="overflow-x-auto pb-20 lg:overflow-x-hidden lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="beco-rail-track flex w-max snap-x snap-mandatory gap-6 px-6 lg:snap-none">
              {products.map((product) => {
                const img = primaryImage(product);
                return (
                  <li key={product.id} className="w-[64vw] shrink-0 snap-center sm:w-[38vw] lg:w-[22vw]">
                    <Link href={`/product/${product.slug}`} className="group block">
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                        {img ? (
                          <Image
                            src={img.path}
                            alt={img.alt}
                            fill
                            sizes="(max-width: 640px) 64vw, (max-width: 1024px) 38vw, 22vw"
                            {...blurProps(img)}
                            className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.05] motion-reduce:transition-none"
                          />
                        ) : null}
                      </div>
                      <p className="mt-4 font-ui text-sm font-semibold uppercase tracking-[0.14em] text-charcoal">
                        {product.name}
                      </p>
                      <p className="mt-1 font-ui text-sm text-neutral-500">Sintered stone</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
