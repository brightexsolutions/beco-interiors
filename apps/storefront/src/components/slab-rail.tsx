import Image from 'next/image';
import Link from 'next/link';
import { blurProps, primaryImage, type CatalogueProduct } from '@/lib/products';

/**
 * The pinned rail, per D31.
 *
 * The section is tall, the frame inside it sticks for the duration, and the
 * track slides sideways across exactly the distance it overflows by. That
 * shows a dozen stones in one screen, which a vertical grid cannot do without
 * pushing the rest of the page a long way down.
 *
 * The cards are SPECIMENS, not thumbnails: each carries a charcoal plate with
 * the stone's name and its number in the set, a shadow that puts it above the
 * page, and a place in a staggered rhythm rather than a flat row. An earlier
 * version was a row of identical bare images, which read as a contact sheet
 * and made the whole pinned section feel like a grid that had been turned on
 * its side.
 *
 * The page scroll is never intercepted: this is `position: sticky` and a CSS
 * scroll driven transform, so the scrollbar behaves normally and a fast flick
 * still reaches the footer. Where `animation-timeline` is unsupported the
 * track stays a hand scrollable snap row rather than a dead frame.
 */

/** A repeating four step rhythm, so the row reads as composed, not aligned. */
const STAGGER = ['lg:mt-0', 'lg:mt-8', 'lg:mt-3', 'lg:mt-12'] as const;

export function SlabRail({ products }: { products: CatalogueProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-label="The full range" className="border-y border-neutral-200 bg-neutral-50">
      {/* Tall enough for the rail to cross, and no taller. D31 caps total
          pinned distance: a section that pins for three screens with nothing
          to say how long it lasts reads as the scroll being stuck. */}
      <div className="beco-rail-stage lg:h-[190vh]">
        <div className="lg:sticky lg:top-20 lg:flex lg:h-[calc(100vh-5rem)] lg:flex-col lg:justify-center">
          <div className="mx-auto w-full max-w-[1380px] px-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 pb-8 pt-16 lg:pt-0">
              <div className="beco-clip">
                <div className="beco-wipe">
                  <div className="flex items-center gap-4">
                    <span aria-hidden className="h-px w-8 bg-warm-red" />
                    <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      The full range
                    </p>
                  </div>
                  <h2 className="mt-4 max-w-[14ch] font-display text-4xl leading-[1.06] tracking-[-0.015em] text-charcoal sm:text-5xl">
                    Everything on the floor.
                  </h2>
                </div>
              </div>
              <Link
                href="/shop"
                className="pb-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-4 hover:underline"
              >
                Browse the range
              </Link>
            </div>
          </div>

          {/* overflow-x stays scrollable, so this is usable by hand wherever
              the scroll driven transform does not run. */}
          <div className="overflow-x-auto pb-16 lg:overflow-x-hidden lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="beco-rail-track flex w-max items-start gap-8 px-6 lg:gap-10">
              {products.map((product, i) => {
                const img = primaryImage(product);
                return (
                  <li
                    key={product.id}
                    className={`w-[68vw] shrink-0 sm:w-[40vw] lg:w-[min(23vw,19rem)] ${STAGGER[i % STAGGER.length]}`}
                  >
                    <Link href={`/product/${product.slug}`} className="group block">
                      {/* Fixed height rather than a fixed ratio, so the whole
                          card including its plate always fits the frame it is
                          pinned inside. */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 shadow-[0_16px_44px_rgba(16,24,32,0.14)] lg:aspect-auto lg:h-[min(44vh,25rem)]">
                        {img ? (
                          <Image
                            src={img.path}
                            alt={img.alt}
                            fill
                            sizes="(max-width: 640px) 68vw, (max-width: 1024px) 40vw, 25vw"
                            {...blurProps(img)}
                            className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.05] motion-reduce:transition-none"
                          />
                        ) : null}
                        {/* A near white stone on a white page reads as a
                            missing image without an edge. Pure White measures
                            100 lightness in the import pipeline. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                        />
                      </div>

                      {/* The plate. It is what makes this a specimen rather
                          than a thumbnail: it names the stone and says where
                          it sits in the set. */}
                      <div className="flex items-baseline justify-between gap-4 bg-charcoal px-5 py-4 text-high-vis-white transition-colors duration-300 group-hover:bg-neutral-950">
                        <div className="min-w-0">
                          <p className="truncate font-ui text-sm font-semibold uppercase tracking-[0.14em]">
                            {product.name}
                          </p>
                          {/* The product's REAL category. This line read
                              "Sintered stone, 12mm" on every card because it
                              was hardcoded, so a brass handle was labelled as
                              stone. On a site aimed at specifiers who will
                              check, that is not a typo, it is a wrong spec. */}
                          <p className="mt-1 truncate font-ui text-sm text-neutral-500">
                            {product.category?.name ?? 'In stock'}
                          </p>
                        </div>
                        <p className="shrink-0 font-ui text-sm font-semibold tabular-nums text-neutral-500">
                          {String(i + 1).padStart(2, '0')}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* How far through the pinned run we are. Without this the page
              simply stops moving and nothing says for how long. */}
          <div className="mx-auto mt-8 hidden w-full max-w-[1380px] px-6 lg:block">
            <div className="h-px w-full bg-neutral-200">
              <div className="beco-rail-progress h-full w-full origin-left scale-x-0 bg-charcoal" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
