'use client';

import { forwardRef, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button, ChipGroup, Dialog, Field, Input, cn } from '@beco/ui';
import { listCatalogueRanges, searchCatalogue, type CatalogueHit, type CatalogueRange } from '@/lib/catalogue';
import { groupHitsByCategory } from '@/lib/catalogue-search';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

/** Default qty and price when a published product is added to a quote. */
export function catalogueLineDraft(hit: CatalogueHit): { quantity: number; unitPrice: number } {
  return {
    quantity: hit.unit === 'per slab' ? 0.5 : 1,
    unitPrice: hit.price ?? 0,
  };
}

/**
 * Opens a searchable, multi-select catalogue dialog. Used on new quote and
 * on an existing quote. Focus in the search field loads published products
 * immediately, across every range, not only stone.
 */
export const CataloguePicker = forwardRef<
  HTMLButtonElement,
  {
    onAdd: (hits: CatalogueHit[]) => void;
    disabled?: boolean;
    disabledHint?: string;
    className?: string;
  }
>(function CataloguePicker({ onAdd, disabled, disabledHint, className }, ref) {
  const searchId = useId();
  const listId = `${searchId}-results`;
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState('');
  const [ranges, setRanges] = useState<CatalogueRange[]>([]);
  const [hits, setHits] = useState<CatalogueHit[]>([]);
  const [selected, setSelected] = useState<Map<string, CatalogueHit>>(() => new Map());
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    if (!open) return;
    startSearch(async () => {
      setRanges(await listCatalogueRanges());
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    const handle = window.setTimeout(
      () => {
        startSearch(async () => {
          setHits(await searchCatalogue(term, range || null));
        });
      },
      term.length === 0 ? 0 : 180,
    );
    return () => window.clearTimeout(handle);
  }, [open, query, range]);

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery('');
      setRange('');
      setHits([]);
      setRanges([]);
      setSelected(new Map());
    }
  };

  const toggle = (hit: CatalogueHit) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(hit.id)) next.delete(hit.id);
      else next.set(hit.id, hit);
      return next;
    });
  };

  const chosen = Array.from(selected.values());
  const addLabel = chosen.length === 1 ? 'Add 1 item' : `Add ${chosen.length} items`;
  // Stocked ranges first, in the catalogue's own order, empty ones after,
  // so the chips a salesperson actually needs are the first ones visible.
  const orderedRanges = [...ranges.filter((r) => r.productCount > 0), ...ranges.filter((r) => r.productCount === 0)];
  const hitGroups = groupHitsByCategory(hits);
  const selectedRange = ranges.find((item) => item.id === range);
  const emptyMessage = selectedRange
    ? `No published products in ${selectedRange.name} yet.`
    : 'No published product matches.';

  const confirm = () => {
    if (chosen.length === 0) return;
    onAdd(chosen);
    close(false);
  };

  return (
    <div className={cn('min-w-0', className)}>
      <Button
        ref={ref}
        type="button"
        variant="outline"
        disabled={disabled}
        className="h-11 w-full py-0 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        Add from catalogue
      </Button>
      {disabled && disabledHint ? (
        <p className="mt-2 font-ui text-sm text-neutral-500">{disabledHint}</p>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={close}
        title="Add from catalogue"
        className="sm:max-w-[40rem]"
        initialFocusRef={searchRef}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 px-5 pt-4 sm:px-6">
            <Field label="Search" htmlFor={searchId} hint="Name or range">
              <Input
                ref={searchRef}
                id={searchId}
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                value={query}
                placeholder="Amber Jade or a handle"
                aria-controls={listId}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault();
                }}
              />
            </Field>
            {/* Ranges as chips: one tap, and every range visible at a glance,
                rather than a native select that hides them behind a wheel. */}
            <ChipGroup
              label="Range"
              value={range}
              clearValue=""
              onChange={setRange}
              className="-mx-5 px-5 sm:-mx-6 sm:px-6"
              options={[
                { value: '', label: 'All ranges' },
                ...orderedRanges.map((item) => ({ value: item.id, label: item.name, count: item.productCount })),
              ]}
            />
          </div>

          <ul id={listId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3">
            {searching && hits.length === 0 ? (
              <li className="px-3 py-3 font-ui text-base text-neutral-500">Searching</li>
            ) : null}
            {hitGroups.map((group) => (
              <li key={group.name} className="mb-2">
                {range ? null : (
                  <h3 className="sticky top-0 z-10 bg-high-vis-white px-3 py-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    {group.name}
                  </h3>
                )}
                <ul>
                  {group.hits.map((hit) => {
                    const checked = selected.has(hit.id);
                    return (
                      <li key={hit.id}>
                        <label
                          className={cn(
                            'flex min-h-16 cursor-pointer items-center gap-3 border-l-4 px-3 py-2 font-ui text-base text-charcoal',
                            'hover:bg-neutral-50',
                            checked ? 'border-charcoal bg-neutral-50' : 'border-transparent',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(hit)}
                            className="size-5 shrink-0 accent-charcoal"
                          />
                          {hit.thumb ? (
                            <img
                              src={hit.thumb}
                              alt=""
                              width={48}
                              height={48}
                              loading="lazy"
                              className="size-12 shrink-0 rounded-control bg-neutral-100 object-cover"
                            />
                          ) : (
                            <span aria-hidden className="size-12 shrink-0 rounded-control bg-neutral-100" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block">{hit.name}</span>
                            {hit.unit ? <span className="block text-sm text-neutral-500">{hit.unit}</span> : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-neutral-500">
                            {hit.price ? money(hit.price) : 'POA'}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {!searching && hits.length === 0 ? (
              <li className="px-3 py-3 font-ui text-base text-neutral-500">{emptyMessage}</li>
            ) : null}
          </ul>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3 sm:px-6">
            <p className="font-ui text-sm text-neutral-500">
              {chosen.length === 0 ? 'Pick at least one.' : `${chosen.length} selected`}
            </p>
            <Button type="button" disabled={chosen.length === 0} onClick={confirm}>
              {addLabel}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
});

