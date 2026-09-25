'use client';

import { Button } from './button';
import { cn } from '../lib/cn';

/**
 * Previous / Next for a sliced list. The caller owns the page (URL or state)
 * and hands this the numbers from `paginate()`, so the count shown here is
 * the same count the table is rendering. Hidden when everything fits on one
 * page: a pager that cannot change the row set is decoration.
 */
export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string | undefined;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="font-ui text-sm text-neutral-500">
        <span className="tabular-nums text-charcoal">
          {from}–{to}
        </span>
        {' of '}
        <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
