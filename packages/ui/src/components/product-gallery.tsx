'use client';

// Interactive: the layered strip holds selection state. Marked as a client
// component so it can be imported from a server component, which is the
// default everywhere else. Keep this island small: the surrounding product
// page stays server rendered for SEO.
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A large frame carrying the photograph, and a layer of cards over its bottom
 * edge. Pressing a card brings it into the frame behind them.
 *
 * Ordered by image role, which is the order a specifier reads a material in:
 * the raw slab, then the slab on a stand for scale, then bookmatched if it is,
 * then applications.
 *
 * **Must read correctly on three images as well as thirty six.** Five real
 * products have no on-stand shot and Pure White has only three images total,
 * so a layout that assumes six breaks on a fifth of the catalogue. The frame
 * behind the strip never changes size.
 *
 * Thirty six is not hypothetical. The fan was built for the stones, which
 * carry three to six photographs each, and then HEIC decoding brought in the
 * hardware range: Black Handles has 36, Knobs 35, Gold Handles 33. Thirty
 * three overlapping cards in a flex row is 1600px of strip, so it ran off the
 * side of the page entirely, past the frame and past the viewport.
 *
 * Two densities, one idea. Up to eight photographs keep the FAN, which is the
 * signature treatment: cards resting on the picture at slight angles. Above
 * that the strip becomes a scrollable snap row of square cards, because
 * choosing between thirty six tiny overlapping rectangles is not a choice
 * anyone can make, however good it looks. Either way the strip is clipped to
 * the frame's width and scrolls inside itself.
 *
 * The frame keeps every image mounted and crossfades between them rather than
 * swapping the src. Swapping means a blank frame while the next file decodes,
 * which on a 44MB source downscaled to 800px is long enough to see.
 */
export type GalleryRole = 'slab' | 'on_stand' | 'bookmatch' | 'application' | 'unknown';

export interface GalleryImage {
  role: GalleryRole;
  alt: string;
  /** Rendered by the caller, so this package stays free of next/image. */
  node: ReactNode;
}

const ROLE_ORDER: GalleryRole[] = ['slab', 'on_stand', 'bookmatch', 'application', 'unknown'];

const ROLE_LABEL: Record<GalleryRole, string> = {
  slab: 'Full slab',
  on_stand: 'In the showroom',
  // Worth naming, because bookmatching is what only stone can do and most
  // buyers will not know the word.
  bookmatch: 'Bookmatched pair',
  application: 'In a space',
  unknown: 'Product photo',
};

export const orderImages = (images: readonly GalleryImage[]): GalleryImage[] =>
  [...images].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

export interface ProductGalleryProps {
  images: readonly GalleryImage[];
  className?: string | undefined;
}

export function ProductGallery({ images, className }: ProductGalleryProps) {
  const ordered = orderImages(images);
  const [active, setActive] = useState(0);
  const current = ordered[active];

  // Eight is where the fan stops being a hand of photographs and starts being
  // a stack too dense to pick from. Measured against the real catalogue: the
  // stones carry three to six, the hardware carries nineteen to thirty six.
  const fan = ordered.length <= 8;

  if (!current) {
    // A product with no usable photographs still renders a page rather than
    // a hole. Pure White very nearly hit this.
    return (
      <div className={cn('aspect-[4/5] w-full bg-neutral-100', className)} role="img"
           aria-label="No photograph available yet" />
    );
  }

  return (
    <div className={cn('relative min-w-0', className)}>
      {/* --- The frame. Every image stays mounted and crossfades, so pressing
              a card never leaves an empty frame while a file decodes. --- */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 sm:aspect-[5/4]">
        {ordered.map((img, i) => (
          <div
            key={`${img.role}-${i}`}
            aria-hidden={i !== active}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-brand motion-reduce:transition-none',
              i === active ? 'opacity-100' : 'opacity-0',
            )}
          >
            {img.node}
          </div>
        ))}

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
        />

        {/* What is being looked at, named on the photograph itself. */}
        <p className="absolute left-0 top-0 bg-charcoal px-4 py-2 font-ui text-sm font-semibold uppercase tracking-[0.14em] text-high-vis-white">
          {ROLE_LABEL[current.role]}
        </p>
      </div>

      {/* --- The layer. Cards rest on the frame's bottom edge, so the strip
              reads as photographs on the picture rather than as a toolbar
              under it.

              The scroller carries its own padding: the cards rotate and lift,
              and `overflow-x` forces `overflow-y` to match, so without room
              above and below the tops and the shadows would be sliced off. --- */}
      {ordered.length > 1 ? (
        <div className={cn('relative z-10', fan ? '-mt-16 sm:-mt-20' : '-mt-14 sm:-mt-16')}>
          <ul
            role="tablist"
            aria-label="Product photographs"
            className={cn(
              'flex max-w-full overflow-x-auto overflow-y-hidden pb-3 pt-6',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              fan
                ? 'justify-center pl-3 sm:justify-start sm:pl-8'
                : 'snap-x gap-2 px-3 sm:px-8',
            )}
          >
            {ordered.map((img, i) => (
              <li key={i} className={cn('snap-start', fan && '-ml-3 first:ml-0 sm:-ml-4')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`${ROLE_LABEL[img.role]}, photograph ${i + 1} of ${ordered.length}`}
                  onClick={() => setActive(i)}
                  style={
                    fan
                      ? {
                          // A slight fan, alternating, so a handful of
                          // photographs reads as a hand of cards rather than
                          // as a row of equal squares.
                          transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2.2}deg)`,
                          zIndex: i === active ? 30 : 10 + i,
                        }
                      : undefined
                  }
                  className={cn(
                    'block h-20 w-16 shrink-0 overflow-hidden bg-neutral-100 sm:h-24 sm:w-20',
                    'shadow-[0_12px_30px_rgba(16,24,32,0.28)] ring-1 ring-inset',
                    'transition-transform duration-500 ease-brand hover:-translate-y-2',
                    'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                    fan && 'hover:!rotate-0',
                    i === active
                      ? cn('ring-warm-red -translate-y-2', fan && '!rotate-0')
                      : 'ring-charcoal/15 opacity-85 hover:opacity-100',
                  )}
                >
                  {img.node}
                </button>
              </li>
            ))}
          </ul>

          {/* Said out loud once the strip is longer than it looks, so nobody
              has to discover by accident that there are thirty more. */}
          {!fan ? (
            <p className="px-3 font-ui text-sm text-neutral-500 sm:px-8">
              <span className="font-semibold text-charcoal">{active + 1}</span>
              {' of '}
              {ordered.length} photographs, scroll for the rest
            </p>
          ) : null}
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {ROLE_LABEL[current.role]}, photograph {active + 1} of {ordered.length}
      </p>
    </div>
  );
}
