import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses } from '@beco/ui';
import { blurProps, type CatalogueProduct } from '@/lib/products';

/**
 * The signature scroll section, per D43: Bookmatch Open, then Slab to Surface.
 *
 * A bookmatched pair parts along its own mirror seam and the finished room is
 * behind it. That gesture could only belong to a stone company: it is the
 * thing the material actually does, and it is why slabs are sold in pairs.
 *
 * Deliberately NOT the competitor's technique. elegantfittings.co.ke scrubs a
 * numbered frame sequence onto a canvas, which is dozens of full width images
 * downloaded before anything can paint, and is incompatible with an LCP under
 * 2.0s on a Nairobi mobile connection. This is two photographs and a
 * transform. It is also built from the `bookmatch` and `application` roles the
 * import pipeline already resolves, so it scales to every stone that has them
 * with no new design work.
 *
 * Their rooms are AI generated. Beco's are real installations, which is the
 * more valuable asset and the reason to show a room at all.
 */
export function SlabToSurface({ product }: { product: CatalogueProduct | undefined }) {
  if (!product) return null;
  const bookmatch = product.images?.find((i) => i.role === 'bookmatch');
  const room = product.images?.find((i) => i.role === 'application');
  if (!bookmatch || !room) return null;

  return (
    <section
      aria-label="From slab to surface"
      // Tall, because the parting needs scroll distance to happen across.
      // The stage's own progress through this height drives every layer.
      className="beco-stage relative h-[200vh] lg:h-[240vh]"
    >
      <div className="sticky top-20 flex h-[calc(100vh-5rem)] items-center overflow-hidden bg-charcoal">
        <div className="mx-auto grid w-full max-w-[1380px] items-center gap-8 px-6 lg:grid-cols-[1.75fr_1fr] lg:gap-16">

          {/* --- The frame. Fixed, so nothing reflows, and sized to sit
                  inside the viewport with the caption beside it. --- */}
          <div className="relative h-[46vh] w-full overflow-hidden lg:h-[min(80vh,48rem)]">
            {/* The room, CONTAINED. A full bleed cover crop of an interior
                shows a corner of a worktop and reads as an abstract, which
                defeats the point of revealing a room at all. Contained on
                charcoal it is legible, and the letterboxing reads as a frame
                rather than as a mistake. */}
            <div className="beco-room absolute inset-0">
              <Image
                src={room.path}
                alt={room.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                {...blurProps(room)}
                className="object-contain"
              />
            </div>

            {/* --- The bookmatched pair, as two halves of one photograph
                    meeting at the centre. Each holds the image at the frame's
                    full width and offset, so together they are seamless and
                    apart they are a matched pair. --- */}
            <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
              <div className="beco-part-left relative h-full w-full will-change-transform">
                <Image
                  src={bookmatch.path}
                  alt=""
                  fill
                  sizes="30vw"
                  className="object-cover"
                  style={{ objectPosition: 'left center' }}
                />
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              <div className="beco-part-right relative h-full w-full will-change-transform">
                <Image
                  src={bookmatch.path}
                  alt={bookmatch.alt}
                  fill
                  sizes="30vw"
                  className="object-cover"
                  style={{ objectPosition: 'right center' }}
                />
              </div>
            </div>
          </div>

          {/* --- The right hand column carries two states in the same place:
                  the opening, while the pair is still closed, and the caption
                  once the room is behind it. Stacked rather than sequential,
                  so neither shifts the layout as it hands over. --- */}
          <div className="relative flex min-h-[24rem] items-center text-high-vis-white lg:min-h-[30rem]">

          <div className="beco-stage-intro absolute inset-0 flex flex-col justify-center">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Bookmatched
              </p>
            </div>
            <p className="mt-5 max-w-[12ch] font-display text-4xl leading-[1.08] sm:text-5xl">
              Two slabs. One block.
            </p>
            <p className="mt-4 max-w-[38ch] text-base leading-[1.65] text-neutral-300">
              Cut in sequence and mirrored, so the veining meets at the join and carries on
              across it. {product.name}, 12mm.
            </p>
            {/* Says what to do, because a pinned section that gives no cue is
                the one that reads as the page having stopped. */}
            <p className="mt-8 flex items-center gap-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              <span aria-hidden className="inline-block h-4 w-px animate-pulse bg-neutral-500 motion-reduce:animate-none" />
              Scroll to open it
            </p>
          </div>

          <div className="beco-stage-caption absolute inset-0 flex flex-col justify-center">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Slab to surface
              </p>
            </div>
            <p className="mt-5 max-w-[14ch] font-display text-4xl leading-[1.08] sm:text-5xl">
              It opens along the seam.
            </p>
            <p className="mt-4 max-w-[40ch] text-base leading-[1.65] text-neutral-300">
              {product.name}, bookmatched. Two slabs cut from the same block and mirrored, so
              the veining runs on across the join.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={`/product/${product.slug}`}
                className={buttonClasses({ variant: 'primary' })}
              >
                See {product.name}
              </Link>
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white underline-offset-8 hover:underline"
              >
                All bookmatched stone
              </Link>
            </div>
          </div>

          </div>
        </div>
      </div>
    </section>
  );
}
