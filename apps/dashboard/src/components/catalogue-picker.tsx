'use client';

import { forwardRef, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button, Dialog, Field, Input, Select, cn } from '@beco/ui';
import { listCatalogueRanges, searchCatalogue, type CatalogueHit, type CatalogueRange } from '@/lib/catalogue';
import { groupHitsByCategory, splitCatalogueRanges } from '@/lib/catalogue-search';

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
  const rangeId = useId();
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
  const split = splitCatalogueRanges(ranges);
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
            <Field label="Range" htmlFor={rangeId}>
              <Select
                id={rangeId}
                value={range}
                onChange={(event) => setRange(event.target.value)}
              >
                <option value="">All ranges</option>
                {split.ungrouped.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
                {split.groups.map((group) => (
                  <optgroup key={group.name} label={group.name}>
                    {group.ranges.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Search" htmlFor={searchId} hint="Type to filter">
              <Input
                ref={searchRef}
                id={searchId}
                type="search"
                autoComplete="off"
                value={query}
                placeholder="Amber Jade or a handle"
                aria-controls={listId}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault();
                }}
              />
            </Field>
          </div>

          <ul id={listId} className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3">
            {searching && hits.length === 0 ? (
              <li className="px-3 py-3 font-ui text-base text-neutral-500">Searching</li>
            ) : null}
            {hitGroups.map((group) => (
              <li key={group.name} className="mb-2">
                {range ? null : (
                  <h3 className="px-3 py-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
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
                            'flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 font-ui text-base text-charcoal',
                            'hover:bg-neutral-50',
                            checked ? 'bg-neutral-50' : null,
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(hit)}
                            className="size-4 shrink-0 accent-charcoal"
                          />
                          <span className="min-w-0 flex-1">{hit.name}</span>
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
