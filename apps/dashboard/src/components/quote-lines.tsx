'use client';

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Button, Field, Input, QuantityStepper, StatusPill, useActionToast } from '@beco/ui';
import { addCatalogueLines, addCustomLine, updateQuoteLines, type QuoteActionState } from '@/app/(app)/quotes/actions';
import { CataloguePicker, catalogueLineDraft } from '@/components/catalogue-picker';
import { useQuoteDraftFlush } from '@/components/quote-draft-flush';
import type { CatalogueHit } from '@/lib/catalogue';
import type { QuoteLine } from '@/lib/quote-detail';

const INITIAL: QuoteActionState = {};

/** Same axes as `/quotes/new`. Save lives on the section heading. */
const LINE_COLS = 'md:grid-cols-[minmax(0,1fr)_10rem_8.5rem_7.5rem]';
const LINE_GRID = [
  'flex flex-col gap-2 py-3',
  `md:grid ${LINE_COLS} md:items-center md:gap-x-4 md:py-2`,
].join(' ');
const TABLE_FIELD = '[&>label]:sr-only [&>div]:mt-0';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

function LineAmount({ quantity, unitPrice }: { quantity: number; unitPrice: number }) {
  if (unitPrice <= 0) {
    return <span className="font-ui text-base tabular-nums text-neutral-500">POA</span>;
  }
  return (
    <span className="font-ui text-base font-semibold tabular-nums text-charcoal">
      {money(quantity * unitPrice)}
    </span>
  );
}

function LineEditor({
  line,
  quantity,
  unitPrice,
  canMutate,
  onChange,
}: {
  line: QuoteLine;
  quantity: number;
  unitPrice: string;
  canMutate: boolean;
  onChange: (patch: { quantity?: number; unitPrice?: string }) => void;
}) {
  const step = line.unit === 'per slab' || line.productId === null ? 0.5 : 1;
  const min = step;
  const discounted = line.listPrice != null && Number(unitPrice) !== line.listPrice;
  const dirty = quantity !== line.quantity || Number(unitPrice) !== line.unitPrice;

  if (!canMutate) {
    return (
      <div className="border-b border-neutral-100 py-3">
        <p className="font-ui text-base text-charcoal">
          {line.description}
          {line.productId === null ? (
            <span className="ml-2 text-sm text-neutral-500">
              {line.removedFromCatalogue ? '(removed from catalogue)' : '(not listed)'}
            </span>
          ) : null}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-ui text-sm tabular-nums text-neutral-500">
            {line.quantity} × {line.unitPrice > 0 ? money(line.unitPrice) : 'price on application'}
            {discounted ? <span className="ml-2 line-through">{money(line.listPrice!)}</span> : null}
          </span>
          <span className="font-ui text-base font-semibold tabular-nums text-charcoal">
            {line.unitPrice > 0 ? money(line.lineTotal) : '—'}
          </span>
        </div>
      </div>
    );
  }

  const priceValue = Number(unitPrice);

  return (
    <div
      className={`${LINE_GRID} border-b border-neutral-100 last:border-0`}
      data-dirty={dirty ? 'true' : 'false'}
    >
      <div className="flex items-center justify-between gap-3 md:contents">
        <div className="min-w-0 flex-1 md:col-start-1 md:row-start-1">
          <p className="min-w-0 truncate font-ui text-base text-charcoal">
            {line.description}
            {line.unit ? <span className="ml-2 text-neutral-500">{line.unit}</span> : null}
            {line.productId === null ? (
              <span className="ml-2 text-neutral-500">
                {line.removedFromCatalogue ? '(removed from catalogue)' : '(not listed)'}
              </span>
            ) : null}
            {dirty ? <span className="ml-2 font-ui text-sm font-semibold text-neutral-700">Changed</span> : null}
          </p>
          {line.listPrice != null && Number(unitPrice) !== line.listPrice ? (
            <p className="mt-0.5 font-ui text-sm text-neutral-500">
              Catalogue <span className="line-through">{money(line.listPrice)}</span>
            </p>
          ) : null}
        </div>
        <div className="shrink-0 whitespace-nowrap md:col-start-4 md:row-start-1 md:justify-self-end">
          <LineAmount quantity={quantity} unitPrice={Number.isFinite(priceValue) ? priceValue : 0} />
        </div>
      </div>
      <div className="flex items-center gap-2 md:contents">
        <div className="shrink-0 md:col-start-2 md:row-start-1">
          <QuantityStepper
            className="flex-nowrap"
            value={quantity}
            onChange={(next) => onChange({ quantity: next })}
            label={line.description}
            step={step}
            min={min}
          />
        </div>
        <Field
          className={`min-w-0 flex-1 md:col-start-3 md:row-start-1 md:min-w-0 ${TABLE_FIELD}`}
          label="Unit price"
          htmlFor={`price-${line.id}`}
        >
          <Input
            id={`price-${line.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={unitPrice}
            onChange={(e) => onChange({ unitPrice: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function CatalogueAdd({
  quoteId,
  updatedAt,
  disabled,
}: {
  quoteId: string;
  updatedAt: string;
  disabled?: boolean;
}) {
  const [state, addProducts, adding] = useActionState(addCatalogueLines, INITIAL);
  const [, startAdd] = useTransition();
  useActionToast(state);

  const pick = (hits: CatalogueHit[]) => {
    const data = new FormData();
    data.set('quoteId', quoteId);
    data.set('updatedAt', updatedAt);
    data.set(
      'items',
      JSON.stringify(
        hits.map((hit) => {
          const draft = catalogueLineDraft(hit);
          return { productId: hit.id, quantity: draft.quantity, unitPrice: draft.unitPrice };
        }),
      ),
    );
    startAdd(() => {
      addProducts(data);
    });
  };

  return (
    <div className="mt-6 space-y-3 border-t border-neutral-200 pt-6">
      <div>
        <h3 className="font-ui text-sm font-semibold text-charcoal">From the catalogue</h3>
        <p className="mt-1 max-w-[68ch] font-ui text-sm text-neutral-500">
          Open the list, tick products, then add them. Change quantity and price on the row after
          they land.
        </p>
      </div>
      <CataloguePicker
        onAdd={pick}
        disabled={adding || disabled}
        disabledHint={disabled ? 'Save your line changes first.' : undefined}
      />
    </div>
  );
}

export function QuoteLines({
  lines,
  quoteId,
  updatedAt,
  canMutate,
}: {
  lines: QuoteLine[];
  quoteId: string;
  updatedAt: string;
  canMutate: boolean;
}) {
  const [customState, addCustom, adding] = useActionState(addCustomLine, INITIAL);
  const [saveState, saveLines, saving] = useActionState(updateQuoteLines, INITIAL);
  const { register } = useQuoteDraftFlush();
  useActionToast(customState);
  useActionToast(saveState);
  const defaults = useMemo(() => ({ description: '', quantity: 1, unitPrice: '0' }), []);
  const [drafts, setDrafts] = useState<Record<string, { quantity: number; unitPrice: string }>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, { quantity: line.quantity, unitPrice: String(line.unitPrice) }])),
  );

  useEffect(() => {
    setDrafts(
      Object.fromEntries(lines.map((line) => [line.id, { quantity: line.quantity, unitPrice: String(line.unitPrice) }])),
    );
  }, [lines]);

  const dirtyItems = lines.flatMap((line) => {
    const draft = drafts[line.id];
    if (!draft) return [];
    if (draft.quantity === line.quantity && Number(draft.unitPrice) === line.unitPrice) return [];
    return [{ lineId: line.id, quantity: draft.quantity, unitPrice: Number(draft.unitPrice) }];
  });
  const dirty = dirtyItems.length > 0;
  const dirtyRef = useRef(dirtyItems);
  dirtyRef.current = dirtyItems;
  const lockRef = useRef(updatedAt);
  lockRef.current = updatedAt;

  useEffect(() => {
    if (!canMutate) {
      register(null);
      return;
    }
    register(async () => {
      const items = dirtyRef.current;
      if (items.length === 0) return { ok: true };
      const form = new FormData();
      form.set('quoteId', quoteId);
      form.set('updatedAt', lockRef.current);
      form.set('items', JSON.stringify(items));
      const result = await updateQuoteLines({}, form);
      if (result.error) return { ok: false, error: result.error };
      if (result.updatedAt) lockRef.current = result.updatedAt;
      return { ok: true, updatedAt: result.updatedAt };
    });
    return () => register(null);
  }, [canMutate, quoteId, register]);

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Line items
        </h2>
        {canMutate && lines.length > 0 ? (
          <div className="flex items-center gap-3" aria-live="polite">
            {dirty ? <StatusPill label="Unsaved" tone="attention" /> : null}
            <Button
              type="submit"
              form="quote-lines-save"
              disabled={!dirty || saving}
              title={!dirty ? 'No changes to save.' : 'Save changed items'}
            >
              {saving ? 'Saving' : 'Save'}
            </Button>
          </div>
        ) : null}
      </div>
      {canMutate && lines.length > 0 && !dirty ? (
        <p className="mt-1 font-ui text-sm text-neutral-500">No changes to save.</p>
      ) : null}
      <form id="quote-lines-save" action={saveLines} className="mt-3">
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="updatedAt" value={updatedAt} />
        <input type="hidden" name="items" value={JSON.stringify(dirtyItems)} />
        {canMutate && lines.length > 0 ? (
          <div
            className={`sticky top-0 z-10 hidden border-b border-neutral-200 bg-neutral-50 py-2 md:grid ${LINE_COLS} md:items-center md:gap-x-4`}
          >
            <span className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Item
            </span>
            <span className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Qty
            </span>
            <span className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Unit
            </span>
            <span className="text-right font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Line
            </span>
          </div>
        ) : null}
        {lines.map((line) => (
          <LineEditor
            key={line.id}
            line={line}
            quantity={drafts[line.id]?.quantity ?? line.quantity}
            unitPrice={drafts[line.id]?.unitPrice ?? String(line.unitPrice)}
            canMutate={canMutate}
            onChange={(patch) =>
              setDrafts((current) => ({
                ...current,
                [line.id]: {
                  quantity: patch.quantity ?? current[line.id]?.quantity ?? line.quantity,
                  unitPrice: patch.unitPrice ?? current[line.id]?.unitPrice ?? String(line.unitPrice),
                },
              }))
            }
          />
        ))}
      </form>

      {canMutate ? (
        <>
          <CatalogueAdd quoteId={quoteId} updatedAt={updatedAt} disabled={dirty} />
          <form action={addCustom} className="mt-6 space-y-3 border-t border-neutral-200 pt-6">
            <div>
              <h3 className="font-ui text-sm font-semibold text-charcoal">Not in the catalogue</h3>
              <p className="mt-1 max-w-[68ch] font-ui text-sm text-neutral-500">
                Quote a slab, finish, sample, or charge that is not listed. Leave the price at 0 to
                send it as pricing on application.
              </p>
            </div>
            <input type="hidden" name="quoteId" value={quoteId} />
            <input type="hidden" name="updatedAt" value={updatedAt} />
            <Field label="What to quote" htmlFor="custom-description">
              <Input
                id="custom-description"
                name="description"
                required
                defaultValue={defaults.description}
                maxLength={300}
                placeholder="20mm Nero Marquina, sample set"
                disabled={dirty}
              />
            </Field>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Qty" htmlFor="custom-qty">
                <Input
                  id="custom-qty"
                  name="quantity"
                  type="number"
                  inputMode="decimal"
                  min={0.5}
                  step={0.5}
                  defaultValue={defaults.quantity}
                  className="w-28"
                  disabled={dirty}
                />
              </Field>
              <Field label="Price" htmlFor="custom-price">
                <Input
                  id="custom-price"
                  name="unitPrice"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  defaultValue={defaults.unitPrice}
                  className="w-28"
                  disabled={dirty}
                />
              </Field>
              <Button type="submit" variant="outline" disabled={adding || dirty} className="shrink-0">
                {adding ? 'Adding' : 'Add'}
              </Button>
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
