'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Field, Input, Select } from '@beco/ui';

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
 * The bar was two rows of loose text facets, which worked and looked like a
 * debug view. It is now one aligned control row on a charcoal rule, with the
 * range as a GROUPED select so fifteen categories fit in one control and their
 * hierarchy is visible while choosing rather than only after. What is active
 * is stated back as removable chips, so a reader who lands on a shared filtered
 * URL can see why they are looking at six products instead of thirty one.
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
  const activeCategory = groups
    .flatMap((g) => g.children)
    .find((c) => c.value === category);

  const chips = [
    query ? { key: 'q', label: `“${query}”`, clear: () => setQuery('') } : null,
    activeGroup ? { key: 'range', label: activeGroup.label, clear: () => set('range', null) } : null,
    activeCategory
      ? { key: 'category', label: activeCategory.label, clear: () => set('category', null) }
      : null,
    finish ? { key: 'finish', label: finish, clear: () => set('finish', null) } : null,
  ].filter((c) => c !== null);

  return (
    // Sticks under the header rather than scrolling away with the range
    // tiles above it. `top-20` matches the header's own h-20 exactly, and
    // z-40 keeps it a layer below the header's z-50 so the header's own
    // shadow edge still reads as the topmost line when both are pinned.
    // Filtering, searching and sorting are the controls a reader reaches for
    // AFTER they have scrolled past the range tiles into the grid, which is
    // exactly when the bar used to disappear.
    <div className="sticky top-20 z-40 border-t-2 border-b border-t-charcoal border-b-neutral-200 bg-high-vis-white/95 py-5 backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
          <Field label="Search" htmlFor="shop-search" className="min-w-0 flex-1 sm:min-w-[16rem]">
            <span className="relative block">
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
                placeholder="Name or colour"
                className="pl-9"
              />
            </span>
          </Field>

          <Field label="Range" htmlFor="shop-range">
            <Select id="shop-range" value={rangeValue} onChange={(e) => pickRange(e.target.value)}>
              <option value="">All ranges</option>
              {groups.map((group) => {
                // A range with nothing under it is still selectable: it is a
                // real part of the business, and the page it leads to says so.
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
          </Field>

          {finishes.length > 1 ? (
            <Field label="Finish" htmlFor="shop-finish">
              <Select id="shop-finish" value={finish ?? ''} onChange={(e) => set('finish', e.target.value || null)}>
                <option value="">Any finish</option>
                {finishes.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label} ({f.count})
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Sort" htmlFor="shop-sort">
            <Select
              id="shop-sort"
              value={sort}
              onChange={(e) => set('sort', e.target.value === 'name' ? null : e.target.value)}
            >
              <option value="name">Name</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </Select>
          </Field>

          <p
            aria-live="polite"
            className="ml-auto pb-3 font-ui text-sm tabular-nums text-neutral-500"
          >
            {pending ? 'Filtering…' : `${showing} of ${total}`}
          </p>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4">
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
                  ✕
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
