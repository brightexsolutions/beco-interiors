import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * The row above a table: search on the left, the filters beside it, and
 * the count on the right, so every list in the dashboard opens the same
 * way. The controls themselves belong to the screen (they change the row
 * set, which is screen specific); this only lays them out and states the
 * result, which is what proves a filter did something.
 */
export function TableToolbar({
  search,
  filters,
  count,
  actions,
  className,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  /** "24 quotes", "3 of 24". Rendered as a live region so a filter change is announced. */
  count?: string | undefined;
  actions?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5 xl:flex-row xl:items-end xl:justify-between', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-end">
        {search ? <div className="min-w-0 xl:w-80">{search}</div> : null}
        {filters ? <div className="min-w-0 flex-1">{filters}</div> : null}
      </div>
      {/* Only when there is something to put in it: an empty block still
          takes the column's gap, 12px of nothing above the list on a phone. */}
      {count || actions ? (
        <div className="flex shrink-0 items-center justify-between gap-3 xl:justify-end">
          {count ? (
            <p aria-live="polite" className="font-ui text-sm tabular-nums text-neutral-500">
              {count}
            </p>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
