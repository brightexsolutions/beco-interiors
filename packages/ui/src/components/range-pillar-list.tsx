import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A numbered editorial row per range Beco deals in, what goes where three
 * icon-in-a-circle cards would have. Built once for the about page's own
 * four pillars and reused here rather than redrawn, per rule 5: two copies
 * of this exact row (a numbered index, a title and body, a photograph or a
 * charcoal name plate on the right) had already started to drift before this
 * existed, one page's version keeping a hover scale the other had dropped.
 *
 * `href` is per item rather than assumed: a range with real, published
 * stock is worth a real link, but linking a range with nothing in it yet is
 * the exact "looks right, does nothing" trap rule 3 warns about, and some
 * callers gate that, others do not. `href: null` renders the row as plain
 * text: no cursor, no hover state, nothing to focus, because there is
 * nowhere for it to go.
 */
export interface RangePillarItem {
  title: string;
  body: string;
  href: string | null;
  /** Rendered by the caller, so this package stays free of next/image. Absent
      renders the same charcoal name plate ProductCard uses for an
      unphotographed product. */
  image?: ReactNode | undefined;
}

export interface RangePillarListProps {
  items: RangePillarItem[];
  className?: string | undefined;
}

const ROW =
  'grid items-center gap-6 border-b border-neutral-200 py-8 sm:grid-cols-[6rem_1fr_11rem] sm:gap-10 lg:grid-cols-[6rem_1fr_15rem]';

export function RangePillarList({ items, className }: RangePillarListProps) {
  return (
    <ol className={cn('border-t border-neutral-200', className)}>
      {items.map((item, i) => {
        const number = (
          <span aria-hidden className="font-display text-4xl leading-none text-neutral-300 sm:text-5xl">
            {String(i + 1).padStart(2, '0')}
          </span>
        );
        const copy = (
          <div>
            <h3 className="font-display text-2xl leading-tight text-charcoal">
              {item.title}
              {item.href ? (
                <span
                  aria-hidden
                  className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover:w-8"
                />
              ) : null}
            </h3>
            <p className="mt-2 max-w-[58ch] text-base leading-[1.65] text-neutral-700">{item.body}</p>
          </div>
        );
        const visual = (
          <div
            className={cn(
              'relative hidden aspect-[4/3] w-full overflow-hidden bg-charcoal sm:block',
              item.href && 'transition-transform duration-500 ease-brand group-hover:scale-[1.03]',
            )}
          >
            {item.image ?? (
              <div className="absolute inset-0 flex items-end p-4">
                <p className="font-display text-xl leading-tight text-high-vis-white/70">{item.title}</p>
              </div>
            )}
            <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15" />
          </div>
        );

        return (
          <li key={item.title}>
            {item.href ? (
              <a href={item.href} className={cn('group', ROW)}>
                {number}
                {copy}
                {visual}
              </a>
            ) : (
              // Not a range with a page to send anyone to yet: named
              // honestly rather than hidden, but nothing here pretends to
              // be a control. `getCategoriesWithProducts` in
              // apps/storefront/src/lib/products.ts carries the same
              // reasoning for why an empty category stays unlinked from a
              // high traffic page.
              <div className={ROW} aria-label={`${item.title}, in the range, not yet photographed`}>
                {number}
                {copy}
                {visual}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
