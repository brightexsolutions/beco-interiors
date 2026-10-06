import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@beco/ui';

/**
 * A dashboard list below the wide layout: rows divided by a rule, not cards.
 *
 * The list already sits inside the page's white panel, so a bordered,
 * rounded card per item drew a card inside a card and spent its padding
 * twice. A row reads as one entry in a list, the way the users list on a
 * phone already did. Hidden from `xl`, where the table takes over (D113).
 *
 * `busy` dims the rows and sets `aria-busy` while a filter navigation is in
 * flight, from the page's shared `useQueryNavigation` transition. D117.
 */
export function ListRows({
  busy = false,
  label,
  className,
  children,
}: {
  busy?: boolean | undefined;
  /** Names the list for assistive tech, "Quotes". */
  label?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <ul
      aria-label={label}
      aria-busy={busy || undefined}
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)] divide-y divide-neutral-200 transition-opacity duration-200 xl:hidden',
        busy && 'opacity-50',
        className,
      )}
    >
      {children}
    </ul>
  );
}

/**
 * Dims whatever stands in for the list while a filter navigation is in
 * flight: the empty state, when the current filter matched nothing and the
 * next one is loading. Without it a filter change from an empty result gave
 * no sign in the results at all. D117.
 */
export function BusyRegion({ busy = false, children }: { busy?: boolean | undefined; children: ReactNode }) {
  return (
    <div aria-busy={busy || undefined} className={cn('transition-opacity duration-200', busy && 'opacity-50')}>
      {children}
    </div>
  );
}

/**
 * One row, the whole of it the link, with a chevron to say so. `marked` draws
 * a thin charcoal rule down the left edge, for a row that wants a glance (a
 * new quote nobody has touched) without spending Warm Red on it. Every row
 * carries the same 2px edge, transparent when unmarked, so the text lines
 * up whether or not a row is marked.
 */
export function ListRowLink({
  href,
  label,
  marked = false,
  children,
}: {
  href: string;
  /** The link's accessible name, "View BEC-Q-00012, Wanjiku Kamau". */
  label: string;
  marked?: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        aria-label={label}
        data-marked={marked || undefined}
        className={cn(
          'group flex min-w-0 items-center gap-3 border-l-2 py-3 pl-3 pr-1 transition-colors duration-200',
          'hover:bg-neutral-50 active:bg-neutral-50',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal',
          marked ? 'border-l-charcoal' : 'border-l-transparent',
        )}
      >
        <div className="min-w-0 flex-1">{children}</div>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal motion-reduce:transition-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
