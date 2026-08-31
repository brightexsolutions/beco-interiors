'use client';

// Interactive: the thumbnail strip holds selection state. Marked as a client
// component so it can be imported from a server component, which is the
// default everywhere else. Keep this island small: the surrounding product
// page stays server rendered for SEO.
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Ordered by image role, which is the order a specifier reads a material in:
 * the raw slab, then the slab on a stand for scale, then bookmatched if it is,
 * then applications.
 *
 * **Must read correctly on three images as well as six.** Five real products
 * have no on-stand shot, and Pure White has only three images total, so a
 * layout that assumes six is a layout that breaks on a fifth of the catalogue.
 * Hence a single column of thumbnails that simply has fewer entries, rather
 * than a fixed grid with holes in it.
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
    <div className={cn('flex flex-col gap-4 sm:flex-row-reverse', className)}>
      <figure className="min-w-0 flex-1">
        <div className="aspect-[4/5] w-full overflow-hidden bg-neutral-100">{current.node}</div>
        <figcaption className="mt-2 font-ui text-sm text-neutral-500">
          {ROLE_LABEL[current.role]}
        </figcaption>
      </figure>

      {/* One thumbnail per image. Three looks deliberate, six looks deliberate. */}
      {ordered.length > 1 ? (
        <ul className="flex gap-3 sm:flex-col" role="tablist" aria-label="Product photographs">
          {ordered.map((img, i) => (
            <li key={i}>
              <button
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`${ROLE_LABEL[img.role]}, photograph ${i + 1} of ${ordered.length}`}
                onClick={() => setActive(i)}
                className={cn(
                  'block h-20 w-20 overflow-hidden bg-neutral-100 transition-opacity',
                  // The selected state is a red hairline, not a heavy ring.
                  i === active
                    ? 'opacity-100 outline outline-1 outline-offset-2 outline-warm-red'
                    : 'opacity-70 hover:opacity-100',
                )}
              >
                {img.node}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
