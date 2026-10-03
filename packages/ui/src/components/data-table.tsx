'use client';

import { useMemo, useState } from 'react';
import { cn } from '../lib/cn';

/**
 * The desktop table. Per D38 the mobile treatment is per screen, built at
 * the call site (full cards for quotes, orders and products, a reduced-column
 * table plus a detail sheet for users), so this component is
 * wrapped in a `hidden xl:block` there and never asked to be both (D113:
 * with the sidebar in place the content pane is tablet width until 1280px).
 *
 * Sorting lives here, because every table needs it and a column is either
 * sortable or it is not. Search and filtering do not: they change the
 * ROW SET, which is specific to what the screen is filtering by, so the
 * caller filters `rows` before handing them to this component. That keeps
 * "the result set and its count actually changed" (rule 3) true of the
 * caller's own filter controls, not hidden inside a generic table.
 *
 * Row actions are explicit, in their own column, never a click-anywhere
 * row: a screen reader and a mouse both need to know exactly what pressing
 * something does.
 */
export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  /** Raw value used to sort. Falls back to `render`'s string form when absent. */
  sortValue?: (row: T) => string | number;
  /** Shown only from this width up. For the column a reader can live without
   *  on a laptop, so the table fits instead of scrolling sideways (D113). */
  showFrom?: '2xl' | undefined;
  /** Keep the header for assistive tech but do not print it: an icon-only
   *  action column needs no visible word above it. */
  headerHidden?: boolean | undefined;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  /** Names the table for assistive tech. Not shown visually. */
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyState?: React.ReactNode;
  className?: string | undefined;
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const valueOf = col.sortValue ?? ((row: T) => String(col.render(row) ?? ''));
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Header cells read as column names, not as a row of data: small caps in
  // the muted ink, a sortable one a real button with the sort state in its
  // icon and in aria-sort. The header stays put while a long table scrolls
  // inside its panel. Rows take a light ground on hover so the eye can
  // follow one across eight columns, the first cell carries the row's name,
  // and numeric columns sit flush right in tabular figures.
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-[1] bg-high-vis-white">
          <tr className="border-b border-neutral-200">
            {columns.map((col, index) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  sort?.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                }
                className={cn(
                  'whitespace-nowrap py-2.5 pr-5 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500',
                  index === 0 && 'pl-4 sm:pl-5',
                  index === columns.length - 1 && 'pr-4 sm:pr-5',
                  col.align === 'right' && 'text-right',
                  col.showFrom === '2xl' && 'hidden 2xl:table-cell',
                )}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      'inline-flex min-h-9 items-center gap-1 uppercase tracking-[0.1em] text-neutral-500 hover:text-charcoal',
                      sort?.key === col.key && 'text-charcoal',
                      col.align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    {col.header}
                    <SortIcon direction={sort?.key === col.key ? sort.direction : null} />
                  </button>
                ) : col.headerHidden ? (
                  <span className="sr-only">{col.header}</span>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={getRowKey(row)} className="border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50">
              {columns.map((col, index) => (
                <td
                  key={col.key}
                  className={cn(
                    'py-3 pr-5 font-ui text-sm text-charcoal',
                    index === 0 && 'pl-4 sm:pl-5',
                    index === columns.length - 1 && 'pr-4 sm:pr-5',
                    col.align === 'right' && 'text-right tabular-nums',
                    col.showFrom === '2xl' && 'hidden 2xl:table-cell',
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn('h-3.5 w-3.5 shrink-0 transition-transform', direction === 'desc' && 'rotate-180')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path
        d={direction ? 'M6 9l6 6 6-6' : 'M7 9l5-5 5 5M7 15l5 5 5-5'}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={direction ? 1 : 0.5}
      />
    </svg>
  );
}
