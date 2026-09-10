'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Input, Select, cn } from '@beco/ui';

/**
 * Search, filter and sort, with the URL as the source of truth.
 *
 * The filtering itself happens on the SERVER: this component only rewrites the
 * query string, and the page re-renders from it. That keeps the grid server
 * rendered, which the SEO rules require of primary content, and it makes every
 * filtered view shareable and back-button correct.
 *
 * Per D29 a filtered view canonicalises to /shop and carries noindex, so a
 * four facet grid cannot generate hundreds of thin duplicate URLs. That is
 * handled in the page's metadata, not here.
 *
 * LAYOUT. The bar is sticky under the header on every size now. On desktop it
 * is one row: search, the three facet controls, the live count. On a phone
 * that row would wrap the controls onto two or three lines and push the grid
 * off screen, so below `lg` only the search and a "Filters" button show, and
 * the button opens the range, finish and sort controls in a panel beneath the
 * bar with a badge for how many are active. The controls themselves are the
 * SAME elements at both sizes: the wrapper is `display: contents` from `lg` up
 * so its children flow into the bar row, and a toggled block below it on
 * mobile. One set of labelled controls, one source of truth. This revises
 * D65, which dropped the mobile sticky bar when it was still three rows of
 * loose fields.
 *
 * What is active is stated back as removable chips, so a reader who lands on a
 * shared filtered URL can see why they are looking at six products of thirty.
 */
export interface Facet {
  value: string;
  label: string;
  count: number;
}

/** A range and the ranges beneath it, for the grouped select. */
export interface FacetGroup {
  value: string;
  label: string;
  count: number;
  children: Facet[];
}

export function ShopControls({
  groups, finishes, total, showing,
}: {
  groups: FacetGroup[];
  finishes: Facet[];
  total: number;
  showing: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      // `scroll: false`, or every keystroke throws the reader back to the top.
      router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  // Typing rewrites the URL, but not on every keystroke: that would be a
  // navigation per character.
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if ((params.get('q') ?? '') !== query) set('q', query || null);
    }, 250);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => () => clearTimeout(debounce.current), []);

  const range = params.get('range');
  const category = params.get('category');
  const finish = params.get('finish');
  const sort = params.get('sort') ?? 'name';
  const filtered = Boolean(query || range || category || finish || params.get('sort'));
  // The "Filters" button badge counts the facets folded into the panel, not
  // the search, which is always in view.
  const panelActive = [range || category, finish, params.get('sort')].filter(Boolean).length;

  // The select carries both levels in one control, so its value is whichever
  // is set. Choosing a group clears the narrower category, or the two disagree
  // and the reader cannot tell which is winning.
  const rangeValue = category ?? range ?? '';
  const pickRange = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete('range');
    next.delete('category');
    if (value.startsWith('group:')) next.set('range', value.slice(6));
    else if (value) next.set('category', value);
    startTransition(() => {
      router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  const activeGroup = groups.find((g) => g.value === range);
  const activeCategory = groups.flatMap((g) => g.children).find((c) => c.value === category);

  const chips = [
    query ? { key: 'q', label: `“${query}”`, clear: () => setQuery('') } : null,
    activeGroup ? { key: 'range', label: activeGroup.label, clear: () => set('range', null) } : null,
    activeCategory
      ? { key: 'category', label: activeCategory.label, clear: () => set('category', null) }
      : null,
    finish ? { key: 'finish', label: finish, clear: () => set('finish', null) } : null,
  ].filter((c) => c !== null);

  const count = pending ? 'Filtering…' : `${showing} of ${total}`;

  return (
    <div className="sticky top-20 z-40 border-b border-t-2 border-b-neutral-200 border-t-charcoal bg-high-vis-white/95 py-3 backdrop-blur">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Search shares the top row with the Filters button on a phone,
              and sits inline in the full control row from sm up. */}
          <span className="relative min-w-0 flex-1 sm:w-auto sm:flex-none sm:min-w-[14rem]">
            <label htmlFor="shop-search" className="sr-only">Search</label>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-current text-neutral-500"
              fill="none"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <Input
              id="shop-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or colour"
              className="w-full pl-9 sm:w-56"
            />
          </span>

          {/* Mobile only: opens the facet panel. Hidden from `lg`, where the
              controls sit inline instead. */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="shop-facets"
            className="inline-flex h-11 items-center gap-2 border border-neutral-300 px-4 font-ui text-sm font-semibold text-charcoal transition-colors hover:border-charcoal lg:hidden"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filters
            {panelActive > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warm-red-deep px-1 font-ui text-xs font-semibold text-high-vis-white">
                {panelActive}
              </span>
            ) : null}
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={cn('h-4 w-4 stroke-current transition-transform', open && 'rotate-180')}
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <p
            aria-live="polite"
            className="order-last w-full text-right font-ui text-sm tabular-nums text-neutral-500 sm:order-none sm:ml-auto sm:w-auto"
          >
            {count}
          </p>

          {/* The facet controls. From `lg` up this wrapper is `display: contents`
              so its children flow into the row above; below `lg` it is a block
              that drops full width and toggles with the button. */}
          <div
            id="shop-facets"
            className={cn(
              'w-full basis-full flex-wrap items-stretch gap-3 pt-1',
              open ? 'flex' : 'hidden',
              'lg:contents',
            )}
          >
            <label htmlFor="shop-range" className="sr-only">Range</label>
            <Select
              id="shop-range"
              value={rangeValue}
              onChange={(e) => pickRange(e.target.value)}
              className="w-full sm:flex-1 lg:w-auto lg:flex-none"
            >
              <option value="">All ranges</option>
              {groups.map((group) => {
                if (group.children.length === 0) {
                  return (
                    <option key={group.value} value={`group:${group.value}`}>
                      {group.label} ({group.count})
                    </option>
                  );
                }
                return (
                  <optgroup key={group.value} label={group.label}>
                    <option value={`group:${group.value}`}>
                      All {group.label.toLowerCase()} ({group.count})
                    </option>
                    {group.children.map((child) => (
                      <option key={child.value} value={child.value}>
                        {child.label} ({child.count})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>

            {finishes.length > 1 ? (
              <>
                <label htmlFor="shop-finish" className="sr-only">Finish</label>
                <Select
                  id="shop-finish"
                  value={finish ?? ''}
                  onChange={(e) => set('finish', e.target.value || null)}
                  className="w-full sm:flex-1 lg:w-auto lg:flex-none"
                >
                  <option value="">Any finish</option>
                  {finishes.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label} ({f.count})
                    </option>
                  ))}
                </Select>
              </>
            ) : null}

            <label htmlFor="shop-sort" className="sr-only">Sort</label>
            <Select
              id="shop-sort"
              value={sort}
              onChange={(e) => set('sort', e.target.value === 'name' ? null : e.target.value)}
              className="w-full sm:flex-1 lg:w-auto lg:flex-none"
            >
              <option value="name">Sort: name</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </Select>

            {/* Mobile only: a plain done affordance so the panel is not left
                open over the grid. Desktop never renders it, the panel there
                is always the inline row. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 w-full bg-charcoal px-4 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white sm:w-auto sm:flex-1 lg:hidden"
            >
              Show {showing} {showing === 1 ? 'result' : 'results'}
            </button>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3">
            <span className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Filtered by
            </span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                className="group inline-flex min-h-9 cursor-pointer items-center gap-2 border border-neutral-300 px-3 font-ui text-sm font-semibold text-charcoal transition-colors hover:border-charcoal"
              >
                {chip.label}
                <span aria-hidden className="text-neutral-500 group-hover:text-warm-red-deep">
                  {'✕'}
                </span>
                <span className="sr-only">, remove this filter</span>
              </button>
            ))}
            {filtered ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  startTransition(() => router.replace(pathname, { scroll: false }));
                }}
                className="ml-1 min-h-9 cursor-pointer font-ui text-sm font-semibold text-warm-red-deep underline-offset-4 hover:underline"
              >
                Clear all
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
