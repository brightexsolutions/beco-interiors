import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Real states, designed properly.
 *
 * The partially populated state is not optional on this project: fifteen
 * categories are empty and the site lives in that condition for weeks. An
 * empty category must render a designed page, never a broken one.
 */

export function EmptyState({
  title, description, action, className,
}: { title: string; description?: ReactNode; action?: ReactNode; className?: string | undefined }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <span aria-hidden className="mb-4 block h-px w-12 bg-warm-red" />
      <h2 className="font-display text-2xl text-charcoal">{title}</h2>
      {description ? (
        // Measure capped so a paragraph never spans a wide screen.
        <p className="mt-3 max-w-[48ch] text-base text-neutral-700">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/**
 * Skeletons match the final layout, so nothing shifts when content arrives.
 * A spinner tells you to wait; a skeleton tells you what is coming.
 */
export function LoadingState({ count = 6, className }: { count?: number | undefined; className?: string | undefined }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          {/* Same 4:5 frame as ProductCard, so the swap causes no shift. */}
          <div className="aspect-[4/5] w-full bg-neutral-100" />
          <div className="mt-4 h-4 w-2/3 bg-neutral-100" />
          <div className="mt-2 h-4 w-1/3 bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

/** Says what happened and what to do next, never just that something broke. */
export function ErrorState({
  title = 'Something went wrong', description, action, className,
}: { title?: string | undefined; description?: ReactNode; action?: ReactNode; className?: string | undefined }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center py-16 text-center', className)}>
      <span aria-hidden className="mb-4 block h-px w-12 bg-warm-red" />
      <h2 className="font-display text-2xl text-charcoal">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-[48ch] text-base text-neutral-700">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
