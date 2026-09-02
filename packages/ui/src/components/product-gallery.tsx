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
 * **Must read correctly on three images as well as six.** Five real products
 * have no on-stand shot and Pure White has only three images total, so a
 * layout that assumes six breaks on a fifth of the catalogue. The strip simply
 * has fewer cards; the frame behind it does not change size.
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

  if (!current) {
    // A product with no usable photographs still renders a page rather than
    // a hole. Pure White very nearly hit this.
    return (
      <div className={cn('aspect-[4/5] w-full bg-neutral-100', className)} role="img"
           aria-label="No photograph available yet" />
    );
  }

  return (
    <div className={cn('relative', className)}>
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

      {/* --- The layer. Cards overlap each other and the frame's bottom edge,
              so the strip reads as photographs resting on the picture rather
              than as a toolbar under it. --- */}
      {ordered.length > 1 ? (
        <ul
          role="tablist"
          aria-label="Product photographs"
          className="relative z-10 -mt-10 flex justify-center pl-3 sm:-mt-14 sm:justify-start sm:pl-8"
        >
          {ordered.map((img, i) => (
            <li key={i} className="-ml-3 first:ml-0 sm:-ml-4">
              <button
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`${ROLE_LABEL[img.role]}, photograph ${i + 1} of ${ordered.length}`}
                onClick={() => setActive(i)}
                style={{
                  // A slight fan, alternating, so the strip is a handful of
                  // photographs rather than a row of equal squares.
                  transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2.2}deg)`,
                  zIndex: i === active ? 30 : 10 + i,
                }}
                className={cn(
                  'block h-20 w-16 overflow-hidden bg-neutral-100 sm:h-24 sm:w-20',
                  'shadow-[0_12px_30px_rgba(16,24,32,0.28)] ring-1 ring-inset',
                  'transition-transform duration-500 ease-brand hover:!rotate-0 hover:-translate-y-2',
                  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                  i === active
                    ? 'ring-warm-red !rotate-0 -translate-y-2'
                    : 'ring-charcoal/15 opacity-85 hover:opacity-100',
                )}
              >
                {img.node}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {ROLE_LABEL[current.role]}, photograph {active + 1} of {ordered.length}
      </p>
    </div>
  );
}
