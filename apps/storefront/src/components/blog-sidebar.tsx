import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses, cn } from '@beco/ui';
import type { BlogCategoryFacet } from '@/lib/blog';
import { blurProps } from '@/lib/products';
import type { ProductImage } from '@beco/types';

/**
 * The blog's companion column: what else is here, and the one place the
 * reader is actually meant to end up.
 *
 * Categories link into `/blog?category=`, server filtered the same way the
 * shop's own facets are, so a category page stays shareable and the grid
 * stays server rendered. The promo card is small on purpose: a reader
 * partway through a buying guide is not ready for a full hero, only a
 * quiet reminder that the range it describes is a click away.
 */
export function BlogSidebar({
  categories,
  activeCategory,
  promoImage,
  className,
}: {
  categories: BlogCategoryFacet[];
  activeCategory?: string | undefined;
  promoImage?: ProductImage | undefined;
  className?: string | undefined;
}) {
  return (
    <aside className={cn('space-y-10', className)}>
      {categories.length > 0 ? (
        <nav aria-label="Blog categories">
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Categories
          </p>
          <ul className="mt-4 space-y-1 border-t border-neutral-200 pt-4">
            <li>
              <Link
                href="/blog"
                aria-current={activeCategory ? undefined : 'page'}
                className={cn(
                  'flex min-h-9 items-center font-ui text-sm font-semibold',
                  activeCategory ? 'text-neutral-600 hover:text-charcoal' : 'text-warm-red-deep',
                )}
              >
                All articles
              </Link>
            </li>
            {categories.map((c) => {
              const active = c.name === activeCategory;
              return (
                <li key={c.name}>
                  <Link
                    href={`/blog?category=${encodeURIComponent(c.name)}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-9 items-center justify-between gap-3 font-ui text-sm font-semibold',
                      active ? 'text-warm-red-deep' : 'text-neutral-600 hover:text-charcoal',
                    )}
                  >
                    {c.name}
                    <span className="font-normal text-neutral-400">{c.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {/* The advert: small, real stock, one action. Not a second hero. */}
      <div className="bg-charcoal p-6 text-high-vis-white">
        {promoImage ? (
          <div className="relative -mx-6 -mt-6 mb-5 aspect-[4/3] overflow-hidden">
            <Image
              src={promoImage.path}
              alt=""
              fill
              sizes="20rem"
              {...blurProps(promoImage)}
              className="object-cover"
            />
          </div>
        ) : null}
        <p className="font-display text-xl leading-tight">Everything here is in stock.</p>
        <p className="mt-2 text-sm leading-[1.6] text-neutral-300">
          Thirty products across fifteen ranges, priced and ready to quote.
        </p>
        <Link
          href="/shop"
          className={cn(buttonClasses({ variant: 'primary' }), 'mt-4 w-full justify-center')}
        >
          Shop the range
        </Link>
      </div>
    </aside>
  );
}
