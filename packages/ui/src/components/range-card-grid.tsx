import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { HoverGallery } from './hover-gallery';

/**
 * A card per range Beco deals in, styled after ProductCard's own grammar
 * (a fixed frame, an inset hairline rather than a border or a shadow, the
 * image scaling on hover, a red hairline drawing in under the caption)
 * rather than inventing a second card language on the same page. Replaces
 * an earlier numbered row-per-range list, reported directly as reading like
 * a spec sheet, too many hairline dividers stacked in one section.
 *
 * `href` is per item rather than assumed: a range with real, published
 * stock is worth a real link, but linking a range with nothing in it yet is
 * the exact "looks right, does nothing" trap rule 3 warns about, and some
 * callers gate that, others do not. `href: null` renders the card as plain
 * text: no cursor, no hover state, nothing to focus, because there is
 * nowhere for it to go.
 */
export interface RangeCardItem {
  title: string;
  body: string;
  href: string | null;
  /** Rendered by the caller, so this package stays free of next/image. Absent
      renders the same charcoal name plate ProductCard uses for an
      unphotographed product. Ignored when `images` carries more than one
      frame. */
  image?: ReactNode | undefined;
  /**
   * More than one real photograph of the range, cycled on hover on a
   * device that can hover, and automatically on one that cannot, the same
   * rule HoverGallery already applies to a product's own photographs.
   * Falls back to `image`, then the plate, when there are fewer than two.
   */
  images?: ReactNode[] | undefined;
}

export interface RangeCardGridProps {
  items: RangeCardItem[];
  className?: string | undefined;
  /** Cycles every multi-frame card's own photographs on its own, on
      request, rather than only while a reader's pointer happens to be on
      it. Forwarded straight to each card's HoverGallery. */
  autoplay?: boolean | undefined;
}

export function RangeCardGrid({ items, className, autoplay = false }: RangeCardGridProps) {
  return (
    <ul className={cn('grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item, i) => {
        const multi = item.images && item.images.length > 1;
        // A caller that always passes `images` should not have to also
        // repeat frame zero as `image`: one real photograph is still one
        // real photograph, not a reason to fall back to the plate.
        const single = item.image ?? item.images?.[0];
        const frame = (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15">
            {multi ? (
              // Staggered per card, on request: several of these autoplaying
              // at once used to all step in lockstep, reading as one grid
              // wide effect rather than independent cards.
              <HoverGallery
                frames={item.images!}
                className="absolute inset-0"
                autoplay={autoplay}
                startDelayMs={autoplay ? i * 420 : 0}
              />
            ) : single ? (
              <div className={cn('h-full w-full', item.href && 'transition-transform duration-[600ms] ease-brand group-hover:scale-[1.03]')}>
                {single}
              </div>
            ) : (
              // No photograph yet, the same treatment ProductCard uses for
              // an unphotographed product: a charcoal plate naming what it
              // stands for, never a blank grey box that reads as broken.
              <div aria-hidden className="absolute inset-0 flex items-end p-5">
                <span className="font-display text-2xl leading-[1.1] text-high-vis-white/75">{item.title}</span>
              </div>
            )}
          </div>
        );
        const caption = (
          <div className="pt-4">
            <h3 className="font-display text-xl leading-tight text-charcoal">
              {item.href ? (
                <span className="relative inline-block">
                  {item.title}
                  <span
                    aria-hidden
                    className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-warm-red transition-transform duration-300 ease-brand group-hover:scale-x-100 motion-reduce:transition-none"
                  />
                </span>
              ) : (
                item.title
              )}
            </h3>
            <p className="mt-2 max-w-[36ch] text-sm leading-[1.6] text-neutral-700">{item.body}</p>
          </div>
        );

        return (
          <li key={item.title}>
            {item.href ? (
              <a href={item.href} className="group block cursor-pointer">
                {frame}
                {caption}
              </a>
            ) : (
              // Not a range with a page to send anyone to yet: named
              // honestly rather than hidden, but nothing here pretends to
              // be a control. `getCategoriesWithProducts` in
              // apps/storefront/src/lib/products.ts carries the same
              // reasoning for why an empty category stays unlinked from a
              // high traffic page.
              <div aria-label={`${item.title}, in the range, not yet photographed`}>
                {frame}
                {caption}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
