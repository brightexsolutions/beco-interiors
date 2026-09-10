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
 *
 * ONE pinned structure across breakpoints, sized to the viewport. On a phone
 * the parting frame grows to fill whatever height is left after a compact
 * caption, and the lede and the secondary link drop, so the whole pinned
 * scene fits `100dvh` minus the header and never bleeds into the next
 * section. On desktop it is the two column stage. The scroll timeline is
 * Chromium only either way, and without it the section shows its finished
 * state, the room and its caption.
 */
export function SlabToSurface({ product }: { product: CatalogueProduct | undefined }) {
  if (!product) return null;
  const bookmatch = product.images?.find((i) => i.role === 'bookmatch');
  // The best room shot, not the first one filed. A wide frame of an actual
  // interior reads as a room; a tall or square crop of a worktop reads as an
  // abstract, which defeats the point of revealing a room. Constrained to a
  // 1.2 to 2.0 ratio so only a real landscape interior qualifies, then widest
  // of those. Falls back to any application shot if none fit.
  const rooms = [...(product.images ?? [])].filter((i) => i.role === 'application');
  const room =
    rooms
      .filter((i) => i.width / i.height >= 1.2 && i.width / i.height <= 2)
      .sort((a, b) => b.width - a.width)[0] ?? rooms[0];
  if (!bookmatch || !room) return null;

  return (
    <section
      aria-label="From slab to surface"
      // Tall, because the parting needs scroll distance to happen across. The
      // stage's own progress through this height drives every layer.
      className="beco-stage relative h-[200vh] lg:h-[240vh]"
    >
      <div className="sticky top-20 h-[calc(100dvh-5rem)] overflow-hidden bg-charcoal">
        <div className="mx-auto flex h-full w-full max-w-[1380px] flex-col justify-center gap-6 px-6 py-8 lg:grid lg:grid-cols-[1.75fr_1fr] lg:items-center lg:gap-16 lg:py-0">

          {/* --- The parting frame. Grows to fill the leftover height on a
                  phone; a fixed tall panel on desktop. Nothing reflows either
                  way because the frame's own box is set before its contents. --- */}
          <div className="relative w-full flex-1 overflow-hidden lg:h-[min(80vh,48rem)] lg:flex-none">
            {/* The room fills the frame. The selection above guarantees a
                landscape interior, so covering it crops a sliver off the long
                edge rather than reducing a room to a worktop corner. */}
            <div className="beco-room absolute inset-0">
              <Image
                src={room.path}
                alt={room.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                {...blurProps(room)}
                className="object-cover"
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
                  sizes="(max-width: 1024px) 50vw, 30vw"
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
                  sizes="(max-width: 1024px) 50vw, 30vw"
                  className="object-cover"
                  style={{ objectPosition: 'right center' }}
                />
              </div>
            </div>
          </div>

          {/* --- The caption column carries two states in the same place: the
                  opening, while the pair is still closed, and the caption once
                  the room is behind it. Stacked, so neither shifts the layout
                  as it hands over. Compact on a phone: min height for the
                  short version, the lede and the secondary link only appear
                  where there is room. --- */}
          <div className="relative flex min-h-[12.5rem] shrink-0 items-center text-high-vis-white lg:min-h-[30rem] lg:shrink">

            <div className="beco-stage-intro absolute inset-0 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <span aria-hidden className="h-px w-8 bg-warm-red" />
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Bookmatched
                </p>
              </div>
              <p className="mt-4 max-w-[12ch] font-display text-3xl leading-[1.05] sm:mt-5 sm:text-4xl lg:text-5xl">
                Two slabs. One block.
              </p>
              <p className="mt-4 hidden max-w-[38ch] text-base leading-[1.65] text-neutral-300 sm:block">
                Cut in sequence and mirrored, so the veining meets at the join and carries on
                across it. {product.name}, 12mm.
              </p>
              <p className="mt-6 flex items-center gap-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 sm:mt-8">
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
              <p className="mt-4 max-w-[14ch] font-display text-3xl leading-[1.05] sm:mt-5 sm:text-4xl lg:text-5xl">
                It opens along the seam.
              </p>
              <p className="mt-4 hidden max-w-[40ch] text-base leading-[1.65] text-neutral-300 sm:block">
                {product.name}, bookmatched. Two slabs cut from the same block and mirrored, so
                the veining runs on across the join.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-7">
                <Link
                  href={`/product/${product.slug}`}
                  className={buttonClasses({ variant: 'primary' })}
                >
                  See {product.name}
                </Link>
                <Link
                  href="/shop"
                  className="hidden min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white underline-offset-8 hover:underline sm:inline-flex"
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
