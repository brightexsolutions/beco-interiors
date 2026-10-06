'use client';

import { useEffect, useOptimistic, useState } from 'react';
import { Busy, FilterSelect, Input, cn, type FilterSelectOption } from '@beco/ui';
import { useQueryNavigation } from '@/lib/use-query-navigation';

export interface ListFilter {
  /** The URL query parameter this filter writes, "status", "owner". */
  param: string;
  /** The caption inside the control, one word. */
  label: string;
  options: readonly FilterSelectOption[];
  /**
   * What the list shows when the param is absent or empty, when that is not
   * the empty option: an admin's quotes default to Everyone, a
   * salesperson's to Assigned to me.
   */
  fallback?: string | undefined;
  /** Overrides "Filter by <label>" as the select's accessible name. */
  accessibleName?: string | undefined;
}

/**
 * Columns below the wide layout, by how many filters there are. The count
 * takes the next cell, so with three filters on a phone it sits beside the
 * third rather than on a line of its own. Never pills that wrap: a wrapped
 * pill group spent two rows per filter on a phone.
 */
const GRID: Record<number, string> = {
  1: 'grid-cols-[minmax(0,1fr)_auto]',
  2: 'grid-cols-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]',
  3: 'grid-cols-2 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]',
  4: 'grid-cols-2 md:grid-cols-4',
};

/**
 * The filter bar every dashboard list shares: search full width, then each
 * filter as a captioned select, "Owner / Everyone", in one compact grid on
 * a phone and a tablet, with the result count in the grid's next cell. From
 * `xl` (D113) search, filters and count share one row.
 *
 * Every control writes the URL through `useQueryNavigation`, so the list is
 * server rendered from the params, a filtered view is a link, and the back
 * button works. Inside a `QueryNavigationProvider` the results dim while the
 * new rows load, and `Busy` beside the count says so in words. D117.
 *
 * Search is debounced, so typing a name does not push a URL per keystroke.
 */
export function ListFilters({
  searchLabel,
  searchPlaceholder,
  searchParam = 'search',
  filters,
  count,
  className,
}: {
  /** The search field's accessible name, "Search quotes". */
  searchLabel: string;
  searchPlaceholder: string;
  searchParam?: string;
  filters: readonly ListFilter[];
  /** "8 quotes". A live region, so a filter change is announced. */
  count?: string | undefined;
  className?: string | undefined;
}) {
  const { searchParams, setParam, isPending } = useQueryNavigation();
  const [search, setSearch] = useState(searchParams.get(searchParam) ?? '');
  // The choice shows in its control at once, before the server answers, and
  // settles to the URL when the navigation lands (or falls back if it fails),
  // the way the catalogue's range pills do. D117.
  const [chosen, choose] = useOptimistic<Record<string, string>, Record<string, string>>({}, (current, next) => ({
    ...current,
    ...next,
  }));

  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== (searchParams.get(searchParam) ?? '')) setParam(searchParam, search);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const grid = GRID[Math.min(Math.max(filters.length, 1), 4)];

  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className={cn('flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center', className)}
    >
      <Input
        type="search"
        enterKeyHint="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchLabel}
        className="min-w-0 xl:min-w-28 xl:flex-1"
      />
      <div data-filter-grid className={cn('grid min-w-0 items-center gap-2 xl:flex xl:shrink', grid)}>
        {filters.map((filter) => (
          <FilterSelect
            key={filter.param}
            label={filter.label}
            accessibleName={filter.accessibleName}
            value={(chosen[filter.param] ?? searchParams.get(filter.param)) || filter.fallback || ''}
            options={filter.options}
            onChange={(value) => setParam(filter.param, value, () => choose({ [filter.param]: value }))}
            className="xl:w-44 xl:min-w-38 xl:shrink"
          />
        ))}
        {count ? (
          // While the new rows load, Updating stands where the count was: the
          // old count is stale, and swapping in place moves nothing on screen.
          // The count stays readable to a screen reader, so the new figure is
          // announced when it lands.
          <div className="flex min-w-0 items-center xl:ml-1 xl:shrink-0">
            <p
              aria-live="polite"
              className={cn('whitespace-nowrap font-ui text-sm tabular-nums text-neutral-500', isPending && 'sr-only')}
            >
              {count}
            </p>
            <Busy pending={isPending} />
          </div>
        ) : (
          <Busy pending={isPending} className="col-span-full xl:ml-1" />
        )}
      </div>
    </form>
  );
}
