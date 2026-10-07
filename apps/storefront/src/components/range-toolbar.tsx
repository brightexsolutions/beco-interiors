'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Busy, Input, Select, cn } from '@beco/ui';
import { SHOP_SORTS, isShopSort, type Facet, type RangeChip } from '@/lib/shop';

/**
 * Up to three finishes stay as buttons; more become one select, so a range
 * with seven finishes still fits its strip on one line (the dashboard's rule
 * from D112, a group of five or more options is a select, tightened here).
 */
const MAX_FINISH_BUTTONS = 3;

const STRIP_ANCHOR = 'range-strip';

/**
 * The strip above a range's grid, D119. Range chips are LINKS to real pages,
 * so a sub range can rank on its own and the back button walks the tree.
 * Finish, search and sort are query parameters on the page being browsed;
 * the page canonicalises those to itself and carries noindex, per D29. The
 * filtering happens on the server, this only rewrites the URL.
 *
 * On a phone the chip row scrolls sideways in one line, no panel, no
 * "Filters" button; the search and the sort share the row beneath. On a
 * desktop from 1180px the chips, finishes, search and sort sit on one line:
 * the search folds to a 44px icon until it is used, and the per range counts
 * show from xl up, which is what lets five ranges fit a 1190px laptop.
 * Measured: at 1024 to 1100 one line clipped the last chip, so below 1180
 * the chips keep their own row and the controls sit beneath. The chips still
 * scroll inside their share if a range ever has more than fit. The count and
 * Clear sit on a quiet line under the row.
 */
export function RangeToolbar({
  chips,
  finishes,
  total,
  showing,
  searchPlaceholder = 'Search this range',
}: {
  chips: RangeChip[];
  finishes: Facet[];
  total: number;
  showing: number;
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get('q') ?? '');
  // Desktop only: the search folds to an icon so the ranges, search and sort
  // fit one line on a laptop. It stays open while it holds a query.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchShown = searchOpen || query !== '';
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const finish = params.get('finish') ?? '';
  const sortParam = params.get('sort') ?? '';
  const sort = isShopSort(sortParam) ? sortParam : 'name';

  const write = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const queryString = next.toString();
    startTransition(() => {
      // `scroll: false`, or every keystroke throws the reader back to the top.
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  // Typing rewrites the URL, but not on every keystroke.
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if ((params.get('q') ?? '') !== query) write({ q: query.trim() || null });
    }, 250);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const face = params.get('face') === 'bookmatched' ? 'bookmatched' : '';
  const filtered = Boolean(query.trim() || finish || face || sort !== 'name');

  return (
    // The anchor a range chip lands on. A chip is a real page (D119), so
    // following one would open at the top, away from the chips and the
    // results; landing here keeps both in front of the reader. scroll-mt
    // clears the sticky 80px header.
    <div id={STRIP_ANCHOR} className="flex scroll-mt-28 flex-col gap-3">
      <div className="flex flex-col gap-4 min-[1180px]:flex-row min-[1180px]:items-center min-[1180px]:gap-3">
        {chips.length > 1 ? (
          <nav aria-label="Ranges" className="-mx-8 overflow-x-auto px-8 sm:-mx-24 sm:px-24 lg:mx-0 lg:px-0 min-[1180px]:min-w-0 min-[1180px]:shrink [scrollbar-width:none]">
            <ul className="flex w-max gap-2">
              {chips.map((chip) => (
                <li key={chip.href}>
                  <Link
                    href={`${chip.href}#${STRIP_ANCHOR}`}
                    aria-current={chip.active ? 'page' : undefined}
                    className={cn(
                      'inline-flex h-11 items-center gap-2 rounded-control border px-4 font-ui text-base font-semibold whitespace-nowrap lg:px-3 transition-colors',
                      chip.active
                        ? 'border-charcoal bg-charcoal text-high-vis-white'
                        : 'border-neutral-300 bg-high-vis-white text-charcoal hover:border-charcoal',
                    )}
                  >
                    {chip.label}
                    <span className={cn('font-normal tabular-nums lg:hidden xl:inline', chip.active ? 'text-neutral-300' : 'text-neutral-500')}>
                      {chip.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 min-[1180px]:ml-auto min-[1180px]:shrink-0 min-[1180px]:flex-nowrap">
          {finishes.length > 1 && finishes.length <= MAX_FINISH_BUTTONS ? (
            <div role="group" aria-label="Finish" className="flex flex-wrap gap-2 lg:flex-nowrap">
              {finishes.map((f) => {
                const active = finish === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => write({ finish: active ? null : f.value })}
                    className={cn(
                      'inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-control border px-4 font-ui text-base font-semibold transition-colors lg:px-3',
                      active
                        ? 'border-charcoal bg-charcoal text-high-vis-white'
                        : 'border-neutral-300 bg-high-vis-white text-charcoal hover:border-charcoal',
                    )}
                  >
                    {f.label}
                    <span className={cn('font-normal tabular-nums', active ? 'text-neutral-300' : 'text-neutral-500')}>{f.count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {finishes.length > MAX_FINISH_BUTTONS ? (
            <>
              <label htmlFor="range-finish" className="sr-only">Finish</label>
              <Select
                id="range-finish"
                value={finish}
                onChange={(e) => write({ finish: e.target.value || null })}
                className="w-[11rem] shrink-0 lg:w-40"
              >
                <option value="">Finish: any</option>
                {finishes.map((f) => (
                  <option key={f.value} value={f.value}>{`${f.label} (${f.count})`}</option>
                ))}
              </Select>
            </>
          ) : null}

          <button
            type="button"
            aria-label="Open search"
            aria-expanded={searchShown}
            aria-controls="range-search"
            onClick={() => { setSearchOpen(true); requestAnimationFrame(() => searchInput.current?.focus()); }}
            className={cn(
              'hidden h-11 w-11 shrink-0 items-center justify-center rounded-control border border-neutral-300 bg-high-vis-white text-charcoal transition-colors hover:border-charcoal',
              !searchShown && 'min-[1180px]:inline-flex',
            )}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>

          <span
            data-search-shown={searchShown}
            className={cn(
              'relative min-w-0 flex-1 basis-[12rem] min-[1180px]:w-48 min-[1180px]:flex-none min-[1180px]:basis-auto',
              !searchShown && 'min-[1180px]:hidden',
            )}
          >
            <label htmlFor="range-search" className="sr-only">Search</label>
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
              ref={searchInput}
              id="range-search"
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { if (!query.trim()) setSearchOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape' && !query) { setSearchOpen(false); e.currentTarget.blur(); } }}
              placeholder={searchPlaceholder}
              className="w-full pl-9"
            />
          </span>

          <label htmlFor="range-sort" className="sr-only">Sort</label>
          <Select
            id="range-sort"
            value={sort}
            onChange={(e) => write({ sort: e.target.value === 'name' ? null : e.target.value })}
            className="w-[11rem] shrink-0 lg:w-40"
          >
            {SHOP_SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex min-h-11 items-center gap-3">
        <p aria-live="polite" className="font-ui text-sm tabular-nums text-neutral-500">
          {pending ? <Busy pending label="Filtering" /> : `${showing} of ${total}`}
        </p>

        {face ? (
          <button
            type="button"
            aria-label="Bookmatched only, show every stone"
            onClick={() => write({ face: null })}
            className="inline-flex h-11 items-center gap-2 rounded-control border border-charcoal bg-charcoal px-3 font-ui text-sm font-semibold text-high-vis-white"
          >
            Bookmatched
            <span aria-hidden>&times;</span>
          </button>
        ) : null}

        {filtered ? (
          <button
            type="button"
            onClick={() => { setQuery(''); write({ q: null, finish: null, sort: null, face: null }); }}
            className="h-11 px-2 font-ui text-sm font-semibold text-warm-red-deep underline-offset-4 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
