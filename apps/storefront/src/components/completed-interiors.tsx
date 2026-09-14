import Image from 'next/image';
import Link from 'next/link';
// No Reveal import: this section's cards assemble via beco-wipe/beco-plate, the
// same physical language as the gallery, rather than the site's default fade.
import { blurProps, type CatalogueProduct } from '@/lib/products';
import type { ProductImage } from '@beco/types';

/**
 * Completed interiors, at three depths.
 *
 * The one section on the page built entirely from rooms rather than from
 * material, and the answer to the question a specifier is actually asking:
 * what does this look like once it is in.
 *
 * The effect is parallax at depth, per D31, and this is the section that
 * earns it. Five photographs in an offset grid, each drifting at one of three
 * rates, so the group reads as sitting at three distances rather than on one
 * flat plane. The frames never move and only the images inside them do, so
 * none of it costs layout.
 *
 * Each card ASSEMBLES on entry, the same physical language as the gallery
 * rather than the site's default fade and rise: the frame is drawn first and
 * stays put, the photograph wipes up into it from behind its own bottom edge,
 * and the caption rises out from under it a beat later. This section used to
 * lean on `Reveal` alone, which reads as basic beside the gallery's wipe and
 * the hero's orbit, for a section whose whole job is proving the range looks
 * considered once it is installed.
 *
 * Every room here is a real Beco installation. The competitor's equivalent
 * rooms are AI generated, which makes real projects the more valuable asset
 * and the reason to give them a section of their own.
 */
type Shot = { image: ProductImage; name: string; slug: string };

/** Frame, span and depth for each position in the offset grid. */
const LAYOUT = [
  { span: 'lg:col-span-7', frame: 'aspect-[4/3]', depth: 'beco-depth-1', offset: '' },
  { span: 'lg:col-span-5', frame: 'aspect-[3/4]', depth: 'beco-depth-3', offset: 'lg:mt-20' },
  { span: 'lg:col-span-4', frame: 'aspect-[3/4]', depth: 'beco-depth-2', offset: 'lg:-mt-8' },
  { span: 'lg:col-span-8', frame: 'aspect-[16/10]', depth: 'beco-depth-1', offset: 'lg:mt-16' },
] as const;

export function CompletedInteriors({ products }: { products: CatalogueProduct[] }) {
  // One room per product, so four different stones are shown rather than four
  // photographs of the same one.
  const shots: Shot[] = [];
  for (const product of products) {
    const room = product.images?.find((i) => i.role === 'application');
    if (room) shots.push({ image: room, name: product.name, slug: product.slug });
    if (shots.length === LAYOUT.length) break;
  }
  if (shots.length < 2) return null;

  return (
    <section className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 py-16 sm:py-22 lg:py-30">
      <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
        <div className="beco-clip">
          <div className="beco-wipe">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Completed interiors
              </p>
            </div>
            <h2 className="mt-4 max-w-[15ch] font-display text-4xl leading-[1.06] tracking-[-0.015em] text-charcoal sm:text-5xl">
              Once it is in, it stops being a sample.
            </h2>
          </div>
        </div>
        <p className="max-w-[42ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
          Real projects, photographed on site. A slab tells you the veining. A room tells you
          whether it works.
        </p>
      </div>

      <div className="mt-16 grid gap-x-8 gap-y-12 lg:grid-cols-12 lg:gap-x-10">
        {shots.map((shot, i) => {
          const { span, frame, depth, offset } = LAYOUT[i]!;
          return (
            <div key={shot.slug} className={`${span} ${offset}`}>
              <Link href={`/product/${shot.slug}`} className="group block">
                {/* The frame is drawn first and never moves, so nothing here
                    can shift layout. beco-clip is what the wipe rises from
                    behind, and the depth class stays on this same element so
                    the parallax still reads the photograph as a direct
                    descendant. */}
                <div
                  className={`beco-clip relative w-full overflow-hidden bg-neutral-100 ${frame}`}
                >
                  <div
                    className={`beco-wipe absolute inset-0 ${depth}`}
                    // Staggered by column rather than by index, so a wide
                    // card and the narrower one beside it settle a beat apart
                    // instead of in lockstep.
                    style={{ animationDelay: `${(i % 2) * 130}ms` }}
                  >
                    <Image
                      src={shot.image.path}
                      alt={shot.image.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      {...blurProps(shot.image)}
                      className="object-cover"
                    />
                  </div>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                  />
                </div>
                <div className="beco-plate mt-4 flex items-baseline justify-between gap-4">
                  <p className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-charcoal">
                    {shot.name}
                    <span
                      aria-hidden
                      className="ml-3 inline-block h-px w-0 align-middle bg-warm-red transition-all duration-500 ease-brand group-hover:w-8"
                    />
                  </p>
                  <p className="shrink-0 font-ui text-sm text-neutral-500">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
