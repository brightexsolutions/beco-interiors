import Image from 'next/image';
import Link from 'next/link';
import { blurProps, primaryImage, type CatalogueProduct } from '@/lib/products';

/**
 * The range rail, which runs itself.
 *
 * It used to be PINNED: the section was 190vh tall, the frame inside it stuck
 * for the duration, and a scroll driven transform slid the track sideways.
 * That is a well behaved effect and it read as a bug. A reader who does not
 * already know the trick sees the page seize, and the progress bar added to
 * explain how long it lasts was a label on the problem rather than a fix.
 *
 * So the pin is gone. The section is a normal height, the page never stops,
 * and the track drifts on its own: alive when it arrives rather than something
 * that has to be operated. It also works in Safari and Firefox now, where the
 * scroll driven version was a dead frame.
 *
 * It travels out and back rather than looping, because a seamless loop needs
 * the cards rendered twice and a specifier tabbing through would meet all
 * twelve stones and then meet them again.
 *
 * **It pauses on hover and on focus.** A row that keeps moving while you reach
 * for a card is an advertisement, not a catalogue. Hovering also drops every
 * other card back to 42%, so attention lands on the stone rather than on the
 * motion. See D57.
 *
 * The cards are SPECIMENS, not thumbnails: each carries a charcoal plate with
 * the stone's name and its number in the set, a shadow that puts it above the
 * page, and a place in a staggered rhythm rather than a flat row. An earlier
 * version was a row of identical bare images, which read as a contact sheet.
 *
 * Below lg there is no drift at all: the row is scrolled by hand, and
 * translating it there fought the reader's own finger.
 */

/** A repeating four step rhythm, so the row reads as composed, not aligned. */
const STAGGER = ['lg:mt-0', 'lg:mt-8', 'lg:mt-3', 'lg:mt-12'] as const;

export function SlabRail({ products }: { products: CatalogueProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section
      aria-label="The full range"
      className="overflow-hidden border-y border-neutral-200 bg-neutral-50"
    >
      <div className="py-16 lg:py-20">
        <div>
          <div className="mx-auto w-full max-w-[1380px] px-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 pb-10">
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

          {/* Hand scrollable below lg, where nothing drifts. The viewport is
              also what the pause on hover hangs off, so it has to wrap the
              track rather than be the track. */}
          <div className="beco-marquee-viewport overflow-x-auto pb-4 lg:overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="beco-marquee flex w-max items-start gap-8 px-6 lg:gap-10">
              {products.map((product, i) => {
                const img = primaryImage(product);
                return (
                  <li
                    key={product.id}
                    className={`beco-marquee-item beco-rail-card w-[68vw] shrink-0 will-change-transform sm:w-[40vw] lg:w-[min(23vw,19rem)] ${STAGGER[i % STAGGER.length]}`}
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

          {/* The progress bar is gone with the pin it measured. What replaced
              it is a plain instruction, because the row now moves on its own
              and the useful thing to say is that you can stop it. */}
          <div className="mx-auto mt-6 w-full max-w-[1380px] px-6">
            <p className="hidden font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 lg:block">
              Hover to hold a stone still
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
