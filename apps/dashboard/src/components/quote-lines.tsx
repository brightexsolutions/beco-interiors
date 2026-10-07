'use client';

import { useActionState, useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  QuantityStepper,
  StatusPill,
  useActionToast,
  useKeepValuesSubmit,
} from '@beco/ui';
import type { QuoteStatus } from '@beco/types';
import {
  addCatalogueLines,
  addCustomLine,
  claimQuote,
  removeQuoteLine,
  updateQuoteLines,
  type QuoteActionState,
} from '@/app/(app)/quotes/actions';
import { CataloguePicker, catalogueLineDraft } from '@/components/catalogue-picker';
import { useQuoteDraftFlush } from '@/components/quote-draft-flush';
import { QuoteRequestNote } from '@/components/quote-request-note';
import type { CatalogueHit } from '@/lib/catalogue';
import type { QuoteLine } from '@/lib/quote-detail';
import { closedBlock, lineEditBlock, removeBlock } from '@/lib/quote-line-rules';
import type { QuoteRequest } from '@/lib/quote-request';

const INITIAL: QuoteActionState = {};

/**
 * Same axes as `/quotes/new`. Save lives on the section heading.
 *
 * Switched on the list's own width, not the screen's: on the quote page the
 * lines share the screen with the sidebar and the right rail, so at 1280 a
 * screen breakpoint gave the item column about 80px. The fixed columns and
 * gaps take 29rem, so at 48rem of list the item name keeps about 300px;
 * below that the rows stack, as on a phone. The same fix as new-quote-form.
 */
const LINE_COLS = '@3xl:grid-cols-[minmax(0,1fr)_10rem_8.5rem_7.5rem]';
const LINE_GRID = [
  'flex flex-col gap-2 py-3',
  `@3xl:grid ${LINE_COLS} @3xl:items-center @3xl:gap-x-4 @3xl:py-2`,
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

type CatalogueReference =
  | { kind: 'none' }
  | { kind: 'discount'; listPrice: number }
  | { kind: 'unpriced'; listPrice: number };

/**
 * How a line's catalogue price reads beside it. A price of 0 is "not priced
 * yet" (D86), so against it the catalogue price is a reference to price from,
 * shown plainly; only a real price that differs from the catalogue is a
 * discount or markup, struck through.
 */
function catalogueReference(listPrice: number | null, unitPrice: number): CatalogueReference {
  if (listPrice == null || !(listPrice > 0)) return { kind: 'none' };
  if (!(unitPrice > 0)) return { kind: 'unpriced', listPrice };
  if (unitPrice !== listPrice) return { kind: 'discount', listPrice };
  return { kind: 'none' };
}

/**
 * One per line, 44px tall, named for the item so a screen reader hears which
 * line it removes (D131). Disabled, it points at the visible reason above the
 * list rather than going quiet.
 */
function RemoveButton({
  line,
  reasonId,
  disabled,
  pending,
  onRemove,
}: {
  line: QuoteLine;
  reasonId: string | undefined;
  disabled: boolean;
  pending: boolean;
  onRemove: (line: QuoteLine) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-11 shrink-0 px-2 py-0"
      aria-label={`Remove ${line.description}`}
      aria-describedby={disabled ? reasonId : undefined}
      disabled={disabled}
      pending={pending}
      onClick={() => onRemove(line)}
    >
      Remove
    </Button>
  );
}

function LineEditor({
  line,
  quantity,
  unitPrice,
  canMutate,
  lockedBy,
  onChange,
  remove,
}: {
  line: QuoteLine;
  quantity: number;
  unitPrice: string;
  canMutate: boolean;
  /** Id of the visible reason a closed quote's lines cannot change (D132), or undefined while open. */
  lockedBy: string | undefined;
  onChange: (patch: { quantity?: number; unitPrice?: string }) => void;
  remove: ReactNode;
}) {
  const step = line.unit === 'per slab' || line.productId === null ? 0.5 : 1;
  const min = step;
  const locked = lockedBy !== undefined;
  const reference = catalogueReference(line.listPrice, Number(unitPrice));
  const dirty = quantity !== line.quantity || Number(unitPrice) !== line.unitPrice;

  if (!canMutate) {
    return (
      <div className="border-b border-neutral-100 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-ui text-base text-charcoal">
            {line.description}
            {line.productId === null ? (
              <span className="ml-2 text-sm text-neutral-500">
                {line.removedFromCatalogue ? '(removed from catalogue)' : '(not listed)'}
              </span>
            ) : null}
          </p>
          {remove}
        </div>
        {line.code ? <p className="font-ui text-sm tabular-nums text-neutral-500">Code {line.code}</p> : null}
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-ui text-sm tabular-nums text-neutral-500">
            {line.quantity} ×{' '}
            {line.unitPrice > 0 ? money(line.unitPrice) : reference.kind === 'unpriced' ? 'not priced yet' : 'price on application'}
            {reference.kind === 'discount' ? <span className="ml-2 line-through">{money(reference.listPrice)}</span> : null}
            {reference.kind === 'unpriced' ? <span className="ml-2">Catalogue {money(reference.listPrice)}</span> : null}
          </span>
          <span className="font-ui text-base font-semibold tabular-nums text-charcoal">
            {line.unitPrice > 0 ? money(line.lineTotal) : 'POA'}
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
      <div className="flex items-center justify-between gap-3 @3xl:contents">
        <div className="min-w-0 flex-1 @3xl:col-start-1 @3xl:row-start-1">
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
          {/* The item column is narrow beside the steppers, and "Code H-301"
              broke across two lines at the hyphen. One line, the word
              "Code" kept for screen readers and the hover title. */}
          {line.code ? (
            <p className="mt-0.5 truncate whitespace-nowrap font-ui text-sm tabular-nums text-neutral-500" title={`Code ${line.code}`}>
              <span className="sr-only">Code </span>
              {line.code}
            </p>
          ) : null}
          {/* Struck through only against a real price: an unpriced line (0,
              the "not priced yet" state, D86) shows the catalogue price
              plainly, as the figure to price from, not as a discount. */}
          {reference.kind === 'discount' ? (
            <p className="mt-0.5 font-ui text-sm text-neutral-500">
              Catalogue <span className="line-through">{money(reference.listPrice)}</span>
            </p>
          ) : reference.kind === 'unpriced' ? (
            <p className="mt-0.5 font-ui text-sm text-neutral-500">
              Not priced yet. Catalogue {money(reference.listPrice)}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 whitespace-nowrap @3xl:col-start-4 @3xl:row-start-1 @3xl:justify-self-end">
          <LineAmount quantity={quantity} unitPrice={Number.isFinite(priceValue) ? priceValue : 0} />
        </div>
      </div>
      <div className="flex items-center gap-2 @3xl:contents">
        <div className="shrink-0 @3xl:col-start-2 @3xl:row-start-1">
          <QuantityStepper
            className="flex-nowrap"
            value={quantity}
            onChange={(next) => onChange({ quantity: next })}
            label={line.description}
            step={step}
            min={min}
            disabled={locked}
            describedBy={lockedBy}
          />
        </div>
        <Field
          className={`min-w-0 flex-1 @3xl:col-start-3 @3xl:row-start-1 @3xl:min-w-0 ${TABLE_FIELD}`}
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
            disabled={locked}
            aria-describedby={lockedBy}
            onChange={(e) => onChange({ unitPrice: e.target.value })}
          />
        </Field>
      </div>
      {/* Its own row on a phone, so the price keeps the width it had before
          Remove existed (measured at 390: beside it the price field was 66px).
          Under the line amount on desktop: a fifth column left the item
          column no width at all at 1280, where the right rail takes its share. */}
      <div className="-mt-1 flex justify-end @3xl:col-start-4 @3xl:row-start-2 @3xl:justify-self-end">{remove}</div>
    </div>
  );
}

function CatalogueAdd({
  quoteId,
  updatedAt,
  disabled,
  disabledHint,
}: {
  quoteId: string;
  updatedAt: string;
  disabled?: boolean;
  disabledHint?: string;
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
        disabled={Boolean(adding || disabled)}
        {...(disabled && disabledHint ? { disabledHint } : {})}
      />
    </div>
  );
}

export function QuoteLines({
  lines,
  quoteId,
  updatedAt,
  canMutate,
  reference,
  status = 'reviewing',
  convertedOrderReference = null,
  canClaim = false,
  assignedToName = null,
  request = null,
}: {
  lines: QuoteLine[];
  quoteId: string;
  updatedAt: string;
  canMutate: boolean;
  /** Named in the remove confirmation, "Remove X from BEC-Q-00012?". */
  reference: string;
  status?: QuoteStatus;
  convertedOrderReference?: string | null;
  /** The quote is unassigned, so this viewer can claim it to edit (D131). */
  canClaim?: boolean;
  assignedToName?: string | null;
  /** What the website form submitted, D131. Null for a counter quote. */
  request?: QuoteRequest | null;
}) {
  const [customState, addCustom, adding] = useActionState(addCustomLine, INITIAL);
  const onAddCustomSubmit = useKeepValuesSubmit(addCustom);
  const [saveState, saveLines, saving] = useActionState(updateQuoteLines, INITIAL);
  const { register } = useQuoteDraftFlush();
  useActionToast(customState);
  // An added custom line empties the form for the next one; a refused add
  // keeps what was typed, see useKeepValuesSubmit.
  const customFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (customState.ok) customFormRef.current?.reset();
  }, [customState]);
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

  // D131: why this viewer cannot change the lines, or why a line cannot come
  // off, always said on screen. The database decides; this explains.
  const editBlock = lineEditBlock({ canMutate, canClaim, assignedToName });
  // D132: a won, lost or converted quote takes no line change at all, so its
  // steppers, prices, Save and the adds are off, and the same reason line
  // Remove points at says why. Never a silent read-only screen.
  const closedReason = canMutate ? closedBlock({ status, convertedOrderReference }) : null;
  const editable = canMutate && closedReason === null;
  const removeReason =
    editBlock?.reason ?? removeBlock({ status, convertedOrderReference, lineCount: lines.length, dirty });
  const reasonId = useId();
  const [claimState, claim, claiming] = useActionState(claimQuote, INITIAL);
  useActionToast(claimState);
  const [removeTarget, setRemoveTarget] = useState<QuoteLine | null>(null);
  const [removeResult, setRemoveResult] = useState<QuoteActionState>(INITIAL);
  const [removing, startRemove] = useTransition();
  useActionToast(removeResult);
  // Resolves when the server has answered, so the dialog's Remove item
  // button spins for the whole write (D117), then the dialog closes and the
  // toast says what happened. The re-rendered list arrives with the answer.
  const confirmRemove = () =>
    new Promise<void>((resolve) => {
      const target = removeTarget;
      if (!target) {
        resolve();
        return;
      }
      const data = new FormData();
      data.set('quoteId', quoteId);
      data.set('updatedAt', updatedAt);
      data.set('lineId', target.id);
      startRemove(async () => {
        const result = await removeQuoteLine({}, data);
        setRemoveResult(result);
        setRemoveTarget(null);
        resolve();
      });
    });
  const dirtyRef = useRef(dirtyItems);
  dirtyRef.current = dirtyItems;
  const lockRef = useRef(updatedAt);
  lockRef.current = updatedAt;

  useEffect(() => {
    if (!editable) {
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
      // exactOptionalPropertyTypes: QuoteDraftFlushResult's ok branch only allows
      // updatedAt to be a string or absent, never present-and-undefined.
      return result.updatedAt ? { ok: true, updatedAt: result.updatedAt } : { ok: true };
    });
    return () => register(null);
  }, [editable, quoteId, register]);

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
              disabled={!dirty || !editable}
              pending={saving}
              title={closedReason ?? (!dirty ? 'No changes to save.' : 'Save changed items')}
              aria-describedby={closedReason ? reasonId : undefined}
            >
              {saving ? 'Saving' : 'Save'}
            </Button>
          </div>
        ) : null}
      </div>
      {editable && lines.length > 0 && !dirty ? (
        <p className="mt-1 font-ui text-sm text-neutral-500">No changes to save.</p>
      ) : null}
      {editBlock ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p id={reasonId} className="font-ui text-base text-charcoal">
            {editBlock.reason}
          </p>
          {editBlock.claim ? (
            <form action={claim}>
              <input type="hidden" name="quoteId" value={quoteId} />
              <input type="hidden" name="updatedAt" value={updatedAt} />
              <Button type="submit" variant="secondary" pending={claiming} className="h-11 py-0">
                {claiming ? 'Claiming' : 'Claim quote'}
              </Button>
            </form>
          ) : null}
        </div>
      ) : removeReason && lines.length > 0 ? (
        <p id={reasonId} className="mt-1 font-ui text-sm text-neutral-500">
          {removeReason}
        </p>
      ) : null}
      <QuoteRequestNote request={request} lines={lines} />
      <form id="quote-lines-save" action={saveLines} className="@container mt-3">
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="updatedAt" value={updatedAt} />
        <input type="hidden" name="items" value={JSON.stringify(dirtyItems)} />
        {canMutate && lines.length > 0 ? (
          <div
            className={`sticky top-0 z-10 hidden border-b border-neutral-200 bg-neutral-50 py-2 @3xl:grid ${LINE_COLS} @3xl:items-center @3xl:gap-x-4`}
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
            lockedBy={closedReason ? reasonId : undefined}
            remove={
              <RemoveButton
                line={line}
                reasonId={removeReason ? reasonId : undefined}
                disabled={Boolean(removeReason) || removing}
                pending={removing && removeTarget?.id === line.id}
                onRemove={setRemoveTarget}
              />
            }
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

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveTarget(null);
        }}
        title={removeTarget ? `Remove ${removeTarget.description} from ${reference}?` : ''}
        description={
          removeTarget
            ? `${removeTarget.description}, quantity ${removeTarget.quantity}, comes off the quote and the total is worked out again.${
                request ? ' What the customer first asked for stays on record.' : ''
              }`
            : ''
        }
        confirmLabel="Remove item"
        destructive
        onConfirm={confirmRemove}
      />

      {canMutate ? (
        <>
          <CatalogueAdd
            quoteId={quoteId}
            updatedAt={updatedAt}
            disabled={dirty || !editable}
            disabledHint={closedReason ?? 'Save your line changes first.'}
          />
          <form ref={customFormRef} onSubmit={onAddCustomSubmit} className="mt-6 space-y-3 border-t border-neutral-200 pt-6">
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
                disabled={dirty || !editable}
                aria-describedby={closedReason ? reasonId : undefined}
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
                  disabled={dirty || !editable}
                  aria-describedby={closedReason ? reasonId : undefined}
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
                  disabled={dirty || !editable}
                  aria-describedby={closedReason ? reasonId : undefined}
                />
              </Field>
              <Button
                type="submit"
                variant="outline"
                disabled={dirty || !editable}
                aria-describedby={closedReason ? reasonId : undefined}
                pending={adding}
                className="shrink-0"
              >
                {adding ? 'Adding' : 'Add'}
              </Button>
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
