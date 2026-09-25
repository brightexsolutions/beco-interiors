'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button, EmptyState, Field, Input, Notice, Panel, QuantityStepper, Select, useActionToast } from '@beco/ui';
import { roundMoney } from '@beco/validation';
import { createCounterQuote, type QuoteActionState } from '@/app/(app)/quotes/actions';
import { CataloguePicker, catalogueLineDraft } from '@/components/catalogue-picker';
import { PageHeading } from '@/components/page-heading';
import type { CatalogueHit } from '@/lib/catalogue';

const INITIAL: QuoteActionState = {};

interface DraftLine {
  key: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string | null;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

/** Header and every line share this so cells sit on the same vertical axes. */
const LINE_COLS = 'md:grid-cols-[minmax(0,1fr)_10rem_8.5rem_7.5rem_auto]';
const LINE_GRID = [
  'flex flex-col gap-2 px-4 py-3',
  `md:grid ${LINE_COLS} md:items-center md:gap-x-4 md:px-5 md:py-2`,
].join(' ');
/** Column headers name the fields, so labels stay accessible but take no space. */
const TABLE_FIELD = '[&>label]:sr-only [&>div]:mt-0';
/** Matches the catalogue trigger, full width on a phone, beside it from sm. */
const TOOLBAR_BUTTON = 'h-11 w-full py-0 sm:w-auto';

export function NewQuoteForm() {
  const addRef = useRef<HTMLButtonElement>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [state, save, saving] = useActionState(createCounterQuote, INITIAL);

  useEffect(() => {
    addRef.current?.focus();
  }, []);

  const addProducts = (hits: CatalogueHit[]) => {
    setLines((current) => [
      ...current,
      ...hits.map((hit) => {
        const draft = catalogueLineDraft(hit);
        return {
          key: crypto.randomUUID(),
          productId: hit.id,
          description: hit.name,
          quantity: draft.quantity,
          unitPrice: draft.unitPrice,
          unit: hit.unit,
        };
      }),
    ]);
    addRef.current?.focus();
  };

  const addCustom = () => {
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        productId: null,
        description: '',
        quantity: 1,
        unitPrice: 0,
        unit: null,
      },
    ]);
    addRef.current?.focus();
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
    addRef.current?.focus();
  };

  const priced = lines.length > 0 && lines.every((line) => line.unitPrice > 0);
  const gross = priced
    ? lines.reduce((sum, line) => roundMoney(sum + roundMoney(line.quantity * line.unitPrice)), 0)
    : 0;
  const canSave = lines.length > 0 && !saving;

  const saveButton = (className?: string) => (
    <Button type="submit" disabled={!canSave} className={className}>
      {saving ? 'Saving' : 'Save quote'}
    </Button>
  );

  return (
    <form action={save}>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          lines.map((line) => ({
            productId: line.productId,
            description: line.description || 'Custom item',
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        )}
      />

      <PageHeading
        eyebrow="Counter"
        title="New quote"
        lede="Add products, then the customer."
        actions={<div className="hidden sm:block">{saveButton()}</div>}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          title={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <CataloguePicker ref={addRef} onAdd={addProducts} />
              <Button
                type="button"
                variant="outline"
                onClick={addCustom}
                className={TOOLBAR_BUTTON}
              >
                Custom item
              </Button>
            </div>
          }
        >
          {lines.length === 0 ? (
            <div className="min-h-72">
              <EmptyState
                fill
                title="No items yet"
                description="Add from catalogue, or a custom item that is not listed."
              />
            </div>
          ) : (
            <div className="max-h-[min(28rem,50dvh)] overflow-y-auto md:max-h-[min(32rem,60dvh)]">
              <ul>
                <li
                  className={`sticky top-0 z-10 hidden border-b border-neutral-200 bg-neutral-50 py-2 md:grid ${LINE_COLS} md:items-center md:gap-4 md:px-5`}
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
                <span className="sr-only">Remove</span>
              </li>
              {lines.map((line) => (
                <LineEditor
                  key={line.key}
                  line={line}
                  onChange={updateLine}
                  onRemove={removeLine}
                />
              ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel
          title={
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Customer
            </h2>
          }
          className="lg:sticky lg:top-4"
        >
          <div className="grid gap-4 p-5">
            <Field label="Name" htmlFor="customerName">
              <Input id="customerName" name="customerName" required autoComplete="name" />
            </Field>
            <Field label="Phone" htmlFor="customerPhone">
              <Input id="customerPhone" name="customerPhone" required inputMode="tel" autoComplete="tel" />
            </Field>
            <Field label="Email" htmlFor="customerEmail" hint="Optional">
              <Input id="customerEmail" name="customerEmail" type="email" autoComplete="email" />
            </Field>
            <Field label="Source" htmlFor="source">
              <Select id="source" name="source" defaultValue="walk_in">
                <option value="walk_in">Walk in</option>
                <option value="phone">Phone</option>
              </Select>
            </Field>

            <div className="flex items-baseline justify-between border-t border-neutral-200 pt-4">
              <p className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Total
              </p>
              <p className="font-ui text-xl font-semibold tabular-nums text-charcoal">
                {lines.length === 0 ? '-' : priced ? money(gross) : 'POA'}
              </p>
            </div>
            <p className="font-ui text-sm text-neutral-500">Prices include VAT.</p>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <div className="sm:hidden">
              {saveButton('w-full')}
              {!canSave && !saving ? (
                <p className="mt-2 font-ui text-sm text-neutral-500">Add an item first.</p>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </form>
  );
}

function lineStep(line: DraftLine) {
  return line.unit === 'per slab' || line.productId === null ? 0.5 : 1;
}

function LineAmount({ line }: { line: DraftLine }) {
  if (line.unitPrice <= 0) {
    return <span className="font-ui text-base tabular-nums text-neutral-500">POA</span>;
  }
  return (
    <span className="font-ui text-base font-semibold tabular-nums text-charcoal">
      {money(roundMoney(line.quantity * line.unitPrice))}
    </span>
  );
}

function LineIdentity({
  line,
  onChange,
}: {
  line: DraftLine;
  onChange: (key: string, patch: Partial<DraftLine>) => void;
}) {
  if (line.productId) {
    return (
      <p className="min-w-0 truncate font-ui text-base text-charcoal">
        <span>{line.description}</span>
        {line.unit ? <span className="ml-2 text-neutral-500">{line.unit}</span> : null}
      </p>
    );
  }
  return (
    <Field className={TABLE_FIELD} label="Custom item" htmlFor={`desc-${line.key}`}>
      <Input
        id={`desc-${line.key}`}
        value={line.description}
        onChange={(e) => onChange(line.key, { description: e.target.value })}
        placeholder="Custom item"
        required
      />
    </Field>
  );
}

function LineEditor({
  line,
  onChange,
  onRemove,
}: {
  line: DraftLine;
  onChange: (key: string, patch: Partial<DraftLine>) => void;
  onRemove: (key: string) => void;
}) {
  const step = lineStep(line);
  return (
    <li className={`${LINE_GRID} border-b border-neutral-100 last:border-0`}>
      <div className="flex items-center justify-between gap-3 md:contents">
        <div className="min-w-0 flex-1 md:col-start-1 md:row-start-1">
          <LineIdentity line={line} onChange={onChange} />
        </div>
        <div className="shrink-0 md:col-start-5 md:row-start-1 md:justify-self-end">
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-2 py-0"
            onClick={() => onRemove(line.key)}
          >
            Remove
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3 md:contents">
        <div className="shrink-0 md:col-start-2 md:row-start-1">
          <QuantityStepper
            className="flex-nowrap"
            value={line.quantity}
            onChange={(quantity) => onChange(line.key, { quantity })}
            label={line.description || 'this line'}
            step={step}
            min={step}
          />
        </div>
        <Field
          className={`min-w-0 flex-1 md:col-start-3 md:row-start-1 md:min-w-0 ${TABLE_FIELD}`}
          label="Unit price"
          htmlFor={`price-${line.key}`}
          hint="KES"
        >
          <Input
            id={`price-${line.key}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={line.unitPrice}
            onChange={(e) => onChange(line.key, { unitPrice: Number(e.target.value) || 0 })}
          />
        </Field>
        <div className="shrink-0 whitespace-nowrap md:col-start-4 md:row-start-1 md:justify-self-end">
          <LineAmount line={line} />
        </div>
      </div>
    </li>
  );
}
