import Link from 'next/link';
import { RailTrack } from '@/components/rail-track';
import type { CatalogueProduct } from '@/lib/products';

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
 *
 * The advance and the arrow controls both live in `RailTrack`, a small client
 * component, so this file, the section chrome and the heading, stays server
 * rendered. See D57 and D59.
 */

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

          <RailTrack products={products} />

          {/* The progress bar is gone with the pin it measured. What replaced
              it is a plain instruction, because the row now moves on its own
              and the useful thing to say is that you can stop it. */}
          <div className="mx-auto mt-6 w-full max-w-[1380px] px-6">
            <p className="hidden font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 lg:block">
              Hover to hold a stone still, or use the arrows to move through the range
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
