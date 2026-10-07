'use client';

import { forwardRef, useCallback, useId, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Field, Input, Select, Spinner, cn } from '@beco/ui';
import { loadPickerCatalogue, type CatalogueHit, type CatalogueRange, type PickerCatalogue } from '@/lib/catalogue';
import { filterCatalogue, groupHitsByCategory } from '@/lib/catalogue-search';

/**
 * The range select's options: ranges that hold products, in the catalogue's
 * own order, each run of siblings under its parent as an optgroup so a
 * nested range reads as "Sintered Stone, 12mm Sintered Stones" the way the
 * product editor's range select does. Empty ranges are left out: a
 * salesperson raising a quote has nothing to pick in one.
 */
export function rangeSelectGroups(
  ranges: CatalogueRange[],
): { label: string | null; ranges: CatalogueRange[] }[] {
  const groups: { label: string | null; ranges: CatalogueRange[] }[] = [];
  for (const range of ranges) {
    if (range.productCount <= 0) continue;
    const last = groups[groups.length - 1];
    if (last && last.label === range.groupName) last.ranges.push(range);
    else groups.push({ label: range.groupName, ranges: [range] });
  }
  return groups;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

/** Default qty and price when a published product is added to a quote. */
export function catalogueLineDraft(hit: CatalogueHit): { quantity: number; unitPrice: number } {
  return {
    quantity: hit.unit === 'per slab' ? 0.5 : 1,
    unitPrice: hit.price ?? 0,
  };
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; catalogue: PickerCatalogue }
  | { status: 'error' };

/**
 * Opens a searchable, multi-select catalogue dialog. Used on new quote and
 * on an existing quote. Opening it loads the whole published catalogue in
 * one server action; the range select and the search field then filter on
 * the phone, in the same frame, with no further round trip.
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
  const rangeId = `${searchId}-range`;
  const listId = `${searchId}-results`;
  const hintId = `${searchId}-hint`;
  const showHint = Boolean(disabled && disabledHint);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState('');
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });
  const [selected, setSelected] = useState<Map<string, CatalogueHit>>(() => new Map());
  // Counts loads so a reply that lands after the dialog closed, or after a
  // newer retry, is dropped rather than shown.
  const loadSeq = useRef(0);

  const fetchCatalogue = useCallback(() => {
    const seq = ++loadSeq.current;
    setLoad({ status: 'loading' });
    loadPickerCatalogue().then(
      (catalogue) => {
        if (seq === loadSeq.current) setLoad({ status: 'ready', catalogue });
      },
      () => {
        if (seq === loadSeq.current) setLoad({ status: 'error' });
      },
    );
  }, []);

  const catalogue = load.status === 'ready' ? load.catalogue : null;
  const ranges = useMemo(() => catalogue?.ranges ?? [], [catalogue]);
  const hits = useMemo(
    () => (catalogue ? filterCatalogue(catalogue.products, { term: query, rangeId: range || null }) : []),
    [catalogue, query, range],
  );

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      loadSeq.current += 1;
      setQuery('');
      setRange('');
      setLoad({ status: 'idle' });
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
  const rangeGroups = rangeSelectGroups(ranges);
  const hitGroups = groupHitsByCategory(hits);
  const selectedRange = ranges.find((item) => item.id === range);
  const emptyMessage =
    selectedRange && !query.trim()
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
        aria-describedby={showHint ? hintId : undefined}
        className="h-11 w-full py-0 sm:w-auto"
        onClick={() => {
          setOpen(true);
          fetchCatalogue();
        }}
      >
        Add from catalogue
      </Button>
      {showHint ? (
        <p id={hintId} className="mt-2 font-ui text-sm text-neutral-500">
          {disabledHint}
        </p>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={close}
        title="Add from catalogue"
        className="sm:max-w-[40rem]"
        initialFocusRef={searchRef}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Search and range share one line from sm up, stack on a phone.
              The range is one select, not a chip per range: thirty chips
              filled the whole dialog on a laptop and pushed the list, the
              only part that scrolls, down to nothing. D112: five or more
              options are a select. */}
          <div className="grid shrink-0 gap-3 px-5 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] sm:px-6">
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
            <Field label="Range" htmlFor={rangeId}>
              <Select
                id={rangeId}
                value={range}
                aria-controls={listId}
                onChange={(event) => setRange(event.target.value)}
              >
                <option value="">All ranges</option>
                {rangeGroups.map((group) => {
                  const options = group.ranges.map((item) => (
                    <option key={item.id} value={item.id}>
                      {`${item.name} (${item.productCount})`}
                    </option>
                  ));
                  return group.label ? (
                    <optgroup key={`${group.label}-${group.ranges[0]!.id}`} label={group.label}>
                      {options}
                    </optgroup>
                  ) : (
                    options
                  );
                })}
              </Select>
            </Field>
          </div>

          <ul id={listId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3">
            {load.status === 'loading' ? (
              <li>
                <p role="status" className="flex items-center gap-2 px-3 py-3 font-ui text-base text-neutral-500">
                  <Spinner />
                  Loading the catalogue
                </p>
              </li>
            ) : null}
            {load.status === 'error' ? (
              <li>
                <div role="alert" className="px-3 py-3 font-ui text-base text-charcoal">
                  <p>Could not load the catalogue.</p>
                  <Button type="button" variant="outline" className="mt-3" onClick={fetchCatalogue}>
                    Try again
                  </Button>
                </div>
              </li>
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
            {catalogue && hits.length === 0 ? (
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

