'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  AvailabilityBadge,
  Button,
  ConfirmDialog,
  Field,
  FormSection,
  Icon,
  Input,
  PriceDisplay,
  Select,
  StatusPill,
  Textarea,
  useActionToast,
} from '@beco/ui';
import { PRODUCT_UNITS, stockStepFor } from '@beco/validation';
import type { Availability, PriceDisplayMode } from '@beco/types';
import { deleteProduct, updateProduct, type ProductActionState } from '@/app/(app)/products/actions';
import { ProductImages } from '@/components/product-images';
import { groupCategoryOptions, type CatalogueProduct, type ProductCategoryOption } from '@/lib/products';

const INITIAL: ProductActionState = {};

const NUMBER_INPUT =
  'min-w-0 [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const asNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

export function ProductEditor({
  product,
  categories,
  onDeleted,
  onImagesChanged,
}: {
  product: CatalogueProduct;
  categories: ProductCategoryOption[];
  onDeleted?: () => void;
  onImagesChanged?: () => void;
}) {
  const [saveState, save, saving] = useActionState(updateProduct, INITIAL);
  const [deleteState, remove, removing] = useActionState(deleteProduct, INITIAL);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [specs, setSpecs] = useState(product.specs);
  const [name, setName] = useState(product.name);
  const [availability, setAvailability] = useState<Availability>(product.availability);
  const [stockInput, setStockInput] = useState(
    product.stockQuantity == null ? '' : String(product.stockQuantity),
  );
  const [published, setPublished] = useState(product.isPublished);
  const [priceMode, setPriceMode] = useState<PriceDisplayMode>(product.priceDisplayMode);
  const [priceInput, setPriceInput] = useState(product.price == null ? '' : String(product.price));
  const [compareInput, setCompareInput] = useState(
    product.compareAtPrice == null ? '' : String(product.compareAtPrice),
  );
  const [unit, setUnit] = useState(product.unit ?? 'per slab');
  const step = stockStepFor(unit);
  useActionToast(saveState);
  useActionToast(deleteState);

  useEffect(() => {
    setSpecs(product.specs);
    setName(product.name);
    setAvailability(product.availability);
    setStockInput(product.stockQuantity == null ? '' : String(product.stockQuantity));
    setPublished(product.isPublished);
    setPriceMode(product.priceDisplayMode);
    setPriceInput(product.price == null ? '' : String(product.price));
    setCompareInput(product.compareAtPrice == null ? '' : String(product.compareAtPrice));
    setUnit(product.unit ?? 'per slab');
  }, [
    product.id,
    product.updatedAt,
    product.specs,
    product.name,
    product.availability,
    product.stockQuantity,
    product.isPublished,
    product.priceDisplayMode,
    product.price,
    product.compareAtPrice,
    product.unit,
  ]);

  useEffect(() => {
    if (deleteState.ok) onDeleted?.();
  }, [deleteState.ok, onDeleted]);

  const addSpec = () => setSpecs((current) => [...current, { label: '', value: '' }]);
  const updateSpec = (index: number, patch: { label?: string; value?: string }) => {
    setSpecs((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const removeSpec = (index: number) => setSpecs((current) => current.filter((_, i) => i !== index));
  const busy = saving || removing;
  const stockQuantity = asNumber(stockInput);

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
          <div className="min-w-0 border border-neutral-200 px-4 py-4">
            <p className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Website
            </p>
            <p className="mt-2 font-ui text-lg font-semibold text-charcoal">{name.trim() || 'Unnamed product'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {published ? (
                <StatusPill label="Published" tone="positive" />
              ) : (
                <StatusPill label="Draft" tone="muted" />
              )}
              <AvailabilityBadge
                availability={availability}
                priceDisplayMode={priceMode}
                stockQuantity={stockQuantity}
              />
            </div>
            <div className="mt-2">
              <PriceDisplay
                priceDisplayMode={priceMode}
                price={asNumber(priceInput)}
                compareAtPrice={asNumber(compareInput)}
                unit={unit}
                vatInclusive={priceMode === 'fixed'}
              />
            </div>
            <p className="mt-3 font-ui text-base text-neutral-500">
              {published
                ? 'Name, photographs, price and availability go live after Save.'
                : 'Hidden on the website until you publish.'}
            </p>
          </div>

          <form id="product-editor" action={save} className="grid min-w-0 gap-8">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="updatedAt" value={product.updatedAt} />
            <input type="hidden" name="specs" value={JSON.stringify(specs)} />

            <FormSection title="Name" hint="The name customers see on the product page and in search.">
              <Field label="Product name" htmlFor="name">
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="min-w-0"
                />
              </Field>
              <Field label="SKU" htmlFor="sku" hint="Supplier code. Shown on the product page">
                <Input id="sku" name="sku" defaultValue={product.sku ?? ''} className="min-w-0" />
              </Field>
              <Field label="Page URL" htmlFor="slug" hint="Old URL redirects">
                <Input id="slug" name="slug" defaultValue={product.slug} required className="min-w-0" />
              </Field>
              <Field label="Range" htmlFor="categoryId">
                <Select id="categoryId" name="categoryId" defaultValue={product.categoryId ?? ''}>
                  <option value="">None</option>
                  {groupCategoryOptions(categories).map(({ group, children }) =>
                    children.length > 0 ? (
                      <optgroup key={group.id} label={group.name}>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ),
                  )}
                </Select>
              </Field>
            </FormSection>
          </form>

          <ProductImages product={product} productName={name} onChanged={onImagesChanged} />

          <div className="grid min-w-0 gap-8">
            <FormSection title="Copy" hint="Card line, then the product page body.">
              <Field label="Short description" htmlFor="shortDescription" hint="Under the name on the card">
                <Textarea
                  id="shortDescription"
                  name="shortDescription"
                  form="product-editor"
                  rows={3}
                  defaultValue={product.shortDescription ?? ''}
                  className="min-w-0"
                />
              </Field>
              <Field label="Description" htmlFor="description" hint="Product page">
                <Textarea
                  id="description"
                  name="description"
                  form="product-editor"
                  rows={6}
                  defaultValue={product.description ?? ''}
                  className="min-w-0"
                />
              </Field>
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-ui text-sm font-semibold text-charcoal">Specs</p>
                  <Button type="button" variant="ghost" onClick={addSpec}>
                    <Icon name="plus" />
                    Add spec
                  </Button>
                </div>
                <div className="space-y-3">
                  {specs.map((row, index) => (
                    <div key={index} className="grid min-w-0 grid-cols-1 gap-2">
                      <Input
                        aria-label={`Spec ${index + 1} label`}
                        value={row.label}
                        onChange={(event) => updateSpec(index, { label: event.target.value })}
                        placeholder="Label"
                        className="min-w-0"
                      />
                      <Input
                        aria-label={`Spec ${index + 1} value`}
                        value={row.value}
                        onChange={(event) => updateSpec(index, { value: event.target.value })}
                        placeholder="Value"
                        className="min-w-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeSpec(index)}
                        aria-label={`Remove spec ${index + 1}`}
                      >
                        <Icon name="trash" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Availability"
              hint="In stock, out of stock and the badge on the card. Stock of 0 reads as Out of stock."
            >
              <label className="flex min-h-11 items-center gap-3 font-ui text-base text-charcoal">
                <input
                  type="checkbox"
                  name="isPublished"
                  form="product-editor"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  className="h-5 w-5 rounded-[2px] border-neutral-300 text-charcoal"
                />
                Published on the website
              </label>
              <Field label="Availability" htmlFor="availability">
                <Select
                  id="availability"
                  name="availability"
                  form="product-editor"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value as Availability)}
                >
                  <option value="in_stock">In stock</option>
                  <option value="pre_order">Pre-order</option>
                  <option value="poa">Enquire</option>
                </Select>
              </Field>
              <Field label="Stock count" htmlFor="stockQuantity" hint={unit}>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  form="product-editor"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={step}
                  value={stockInput}
                  onChange={(event) => setStockInput(event.target.value)}
                  className={NUMBER_INPUT}
                />
              </Field>
              <Field label="Low-stock mark" htmlFor="lowStockThreshold" hint="Blank if uncounted">
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  form="product-editor"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={step}
                  defaultValue={product.lowStockThreshold ?? ''}
                  className={NUMBER_INPUT}
                />
              </Field>
              <Field label="Badge" htmlFor="badge" hint="Optional mark on the card">
                <Select id="badge" name="badge" form="product-editor" defaultValue={product.badge ?? ''}>
                  <option value="">None</option>
                  <option value="hot">Popular</option>
                  <option value="new">New</option>
                  <option value="sale">Sale</option>
                  <option value="clearance">Clearance</option>
                </Select>
              </Field>
            </FormSection>

            <FormSection title="Price" hint="KES, VAT included. Price on application hides the figure.">
              <Field label="Unit" htmlFor="unit">
                <Select
                  id="unit"
                  name="unit"
                  form="product-editor"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                >
                  {PRODUCT_UNITS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Price mode" htmlFor="priceDisplayMode">
                <Select
                  id="priceDisplayMode"
                  name="priceDisplayMode"
                  form="product-editor"
                  value={priceMode}
                  onChange={(event) => setPriceMode(event.target.value as PriceDisplayMode)}
                >
                  <option value="fixed">Fixed price</option>
                  <option value="poa">Price on application</option>
                </Select>
              </Field>
              <Field label="Price" htmlFor="price" hint="KES, VAT inc.">
                <Input
                  id="price"
                  name="price"
                  form="product-editor"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  className={NUMBER_INPUT}
                />
              </Field>
              <Field label="Compare at" htmlFor="compareAtPrice" hint="Struck through when higher">
                <Input
                  id="compareAtPrice"
                  name="compareAtPrice"
                  form="product-editor"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={compareInput}
                  onChange={(event) => setCompareInput(event.target.value)}
                  className={NUMBER_INPUT}
                />
              </Field>
            </FormSection>

            <FormSection title="Search" hint="Optional overrides. Blank uses the product name and description.">
              <Field label="Sort order" htmlFor="sortOrder">
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  form="product-editor"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={product.sortOrder}
                  className={NUMBER_INPUT}
                />
              </Field>
              <Field label="SEO title" htmlFor="metaTitle">
                <Input
                  id="metaTitle"
                  name="metaTitle"
                  form="product-editor"
                  defaultValue={product.metaTitle ?? ''}
                  maxLength={70}
                  className="min-w-0"
                />
              </Field>
              <Field label="SEO description" htmlFor="metaDescription">
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  form="product-editor"
                  rows={3}
                  defaultValue={product.metaDescription ?? ''}
                  maxLength={180}
                  className="min-w-0"
                />
              </Field>
            </FormSection>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-neutral-200 bg-high-vis-white px-5 py-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => setConfirmOpen(true)} disabled={busy}>
            <Icon name="trash" />
            Delete product
          </Button>
          <Button type="submit" form="product-editor" variant="primary" disabled={busy}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this product?"
        description={`${product.name} will be removed from the storefront. Quotes that already include it keep their line and their price.`}
        confirmLabel="Delete product"
        destructive
        onConfirm={() => {
          const form = new FormData();
          form.set('productId', product.id);
          form.set('updatedAt', product.updatedAt);
          remove(form);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
