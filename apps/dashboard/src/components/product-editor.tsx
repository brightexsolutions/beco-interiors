'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  Select,
  Textarea,
  useActionToast,
} from '@beco/ui';
import { PRODUCT_UNITS, stockStepFor } from '@beco/validation';
import { deleteProduct, updateProduct, type ProductActionState } from '@/app/(app)/products/actions';
import { ProductImages } from '@/components/product-images';
import type { CatalogueProduct, ProductCategoryOption } from '@/lib/products';

const INITIAL: ProductActionState = {};

const NUMBER_INPUT =
  'min-w-0 [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

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
  const step = stockStepFor(product.unit);
  useActionToast(saveState);
  useActionToast(deleteState);

  useEffect(() => {
    setSpecs(product.specs);
  }, [product.id, product.specs]);

  useEffect(() => {
    if (deleteState.ok) onDeleted?.();
  }, [deleteState.ok, onDeleted]);

  const addSpec = () => setSpecs((current) => [...current, { label: '', value: '' }]);
  const updateSpec = (index: number, patch: { label?: string; value?: string }) => {
    setSpecs((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const removeSpec = (index: number) => setSpecs((current) => current.filter((_, i) => i !== index));
  const busy = saving || removing;

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
          <ProductImages product={product} onChanged={onImagesChanged} />

          <form id="product-editor" action={save} className="grid min-w-0 gap-4">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="updatedAt" value={product.updatedAt} />
            <input type="hidden" name="specs" value={JSON.stringify(specs)} />

            <Field label="Name" htmlFor="name">
              <Input id="name" name="name" defaultValue={product.name} required className="min-w-0" />
            </Field>
            <Field label="Slug" htmlFor="slug" hint="Old slug redirects">
              <Input id="slug" name="slug" defaultValue={product.slug} required className="min-w-0" />
            </Field>
            <Field label="Range" htmlFor="categoryId">
              <Select id="categoryId" name="categoryId" defaultValue={product.categoryId ?? ''}>
                <option value="">None</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit" htmlFor="unit">
              <Select id="unit" name="unit" defaultValue={product.unit ?? 'per slab'}>
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Stock" htmlFor="stockQuantity" hint={product.unit ?? undefined}>
              <Input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                inputMode="decimal"
                min={0}
                step={step}
                defaultValue={product.stockQuantity ?? ''}
                className={NUMBER_INPUT}
              />
            </Field>
            <Field label="Low-stock mark" htmlFor="lowStockThreshold" hint="Blank if uncounted">
              <Input
                id="lowStockThreshold"
                name="lowStockThreshold"
                type="number"
                inputMode="decimal"
                min={0}
                step={step}
                defaultValue={product.lowStockThreshold ?? ''}
                className={NUMBER_INPUT}
              />
            </Field>
            <Field label="Price mode" htmlFor="priceDisplayMode">
              <Select id="priceDisplayMode" name="priceDisplayMode" defaultValue={product.priceDisplayMode}>
                <option value="fixed">Fixed price</option>
                <option value="poa">Price on application</option>
              </Select>
            </Field>
            <Field label="Price" htmlFor="price" hint="KES, VAT inc.">
              <Input
                id="price"
                name="price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                defaultValue={product.price ?? ''}
                className={NUMBER_INPUT}
              />
            </Field>
            <Field label="Compare at" htmlFor="compareAtPrice" hint="Optional">
              <Input
                id="compareAtPrice"
                name="compareAtPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                defaultValue={product.compareAtPrice ?? ''}
                className={NUMBER_INPUT}
              />
            </Field>
            <Field label="Availability" htmlFor="availability">
              <Select id="availability" name="availability" defaultValue={product.availability}>
                <option value="in_stock">In stock</option>
                <option value="pre_order">Pre-order</option>
                <option value="poa">Enquire</option>
              </Select>
            </Field>
            <Field label="Badge" htmlFor="badge" hint="Optional">
              <Select id="badge" name="badge" defaultValue={product.badge ?? ''}>
                <option value="">None</option>
                <option value="hot">Popular</option>
                <option value="new">New</option>
                <option value="sale">Sale</option>
                <option value="clearance">Clearance</option>
              </Select>
            </Field>
            <Field label="Sort order" htmlFor="sortOrder">
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                step={1}
                defaultValue={product.sortOrder}
                className={NUMBER_INPUT}
              />
            </Field>

            <label className="flex min-h-11 items-center gap-3 font-ui text-base text-charcoal">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={product.isPublished}
                className="h-5 w-5 rounded-[2px] border-neutral-300 text-charcoal"
              />
              Published on the storefront
            </label>

            <Field label="Short description" htmlFor="shortDescription">
              <Textarea id="shortDescription" name="shortDescription" rows={3} defaultValue={product.shortDescription ?? ''} className="min-w-0" />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea id="description" name="description" rows={6} defaultValue={product.description ?? ''} className="min-w-0" />
            </Field>

            <section className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-ui text-sm font-semibold text-charcoal">Specs</p>
                <Button type="button" variant="ghost" onClick={addSpec}>
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
                    <Button type="button" variant="ghost" onClick={() => removeSpec(index)} aria-label={`Remove spec ${index + 1}`}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <Field label="SEO title" htmlFor="metaTitle" hint="Optional override">
              <Input id="metaTitle" name="metaTitle" defaultValue={product.metaTitle ?? ''} maxLength={70} className="min-w-0" />
            </Field>
            <Field label="SEO description" htmlFor="metaDescription" hint="Optional override">
              <Textarea
                id="metaDescription"
                name="metaDescription"
                rows={3}
                defaultValue={product.metaDescription ?? ''}
                maxLength={180}
                className="min-w-0"
              />
            </Field>
          </form>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-neutral-200 bg-high-vis-white px-5 py-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => setConfirmOpen(true)} disabled={busy}>
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
