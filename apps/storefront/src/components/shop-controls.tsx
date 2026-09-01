'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { cn } from '@beco/ui';

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
 */
export interface Facet {
  value: string;
  label: string;
  count: number;
}

export function ShopControls({
  categories, finishes, total, showing,
}: {
  categories: Facet[];
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

  const category = params.get('category');
  const finish = params.get('finish');
  const sort = params.get('sort') ?? 'name';
  const filtered = Boolean(query || category || finish || params.get('sort'));

  return (
    <div className="border-y border-neutral-200 bg-high-vis-white/95 py-4 backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 sm:max-w-[22rem]">
            <span className="sr-only">Search the range</span>
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
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="h-11 w-full rounded-[2px] border border-neutral-300 pl-9 pr-3 font-ui text-base text-charcoal placeholder:text-neutral-500 focus:border-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-red"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="font-ui text-sm text-neutral-500">Sort</span>
            <select
              value={sort}
              onChange={(e) => set('sort', e.target.value === 'name' ? null : e.target.value)}
              className="h-11 cursor-pointer rounded-[2px] border border-neutral-300 px-3 font-ui text-base text-charcoal focus:border-charcoal focus:outline-none"
            >
              <option value="name">Name</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </select>
          </label>

          <p aria-live="polite" className="ml-auto font-ui text-sm text-neutral-500">
            {pending ? 'Filtering…' : `${showing} of ${total}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Facets
            label="Range"
            options={categories}
            active={category}
            onPick={(v) => set('category', v)}
          />
          {finishes.length > 1 ? (
            <Facets label="Finish" options={finishes} active={finish} onPick={(v) => set('finish', v)} />
          ) : null}

          {filtered ? (
            <button
              type="button"
              onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
              className="cursor-pointer font-ui text-sm font-semibold text-warm-red-deep underline-offset-4 hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Facets({
  label, options, active, onPick,
}: {
  label: string;
  options: Facet[];
  active: string | null;
  onPick: (value: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
      {options.map((option) => {
        const on = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(on ? null : option.value)}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center gap-2 px-3 font-ui text-sm font-semibold',
              'transition-colors duration-200',
              on ? 'text-warm-red-deep' : 'text-charcoal hover:text-warm-red-deep',
            )}
          >
            <span className={cn('border-b-2 pb-0.5', on ? 'border-warm-red' : 'border-transparent')}>
              {option.label}
            </span>
            <span className="font-normal text-neutral-500">{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
