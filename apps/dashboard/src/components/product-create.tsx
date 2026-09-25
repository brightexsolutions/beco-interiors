'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormSection, Input, Select, useActionToast } from '@beco/ui';
import { PRODUCT_UNITS, slugifyProductName } from '@beco/validation';
import { createProduct, type ProductActionState } from '@/app/(app)/products/actions';
import { groupCategoryOptions, type ProductCategoryOption } from '@/lib/products';

const INITIAL: ProductActionState = {};

const NUMBER_INPUT =
  '[appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export function ProductCreate({
  categories,
  returnTo,
}: {
  categories: ProductCategoryOption[];
  returnTo: string;
}) {
  const router = useRouter();
  const [state, create, pending] = useActionState(createProduct, INITIAL);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  useActionToast(state);

  useEffect(() => {
    if (state.slug) router.replace(`/products?edit=${state.slug}`);
  }, [state.slug, router]);

  return (
    <form action={create} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
        <FormSection title="Name" hint="This is the name on the website. Photographs and availability come after this draft.">
          <Field label="Product name" htmlFor="new-name">
            <Input
              id="new-name"
              name="name"
              required
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugifyProductName(next));
              }}
            />
          </Field>
          <Field label="Page URL" htmlFor="new-slug" hint="Auto from the name until you edit it">
            <Input
              id="new-slug"
              name="slug"
              required
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
            />
          </Field>
          <Field label="SKU" htmlFor="new-sku" hint="Supplier code. Shown on the product page">
            <Input id="new-sku" name="sku" />
          </Field>
          <Field label="Range" htmlFor="new-category">
            <Select id="new-category" name="categoryId" required defaultValue="">
              <option value="" disabled>
                Pick a range
              </option>
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
        <FormSection title="Price" hint="KES, VAT included. You can change this before publishing.">
          <Field label="Unit" htmlFor="new-unit">
            <Select id="new-unit" name="unit" required defaultValue="per slab">
              {PRODUCT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price mode" htmlFor="new-price-mode">
            <Select id="new-price-mode" name="priceDisplayMode" defaultValue="fixed">
              <option value="fixed">Fixed price</option>
              <option value="poa">Price on application</option>
            </Select>
          </Field>
          <Field label="Price" htmlFor="new-price" hint="KES, VAT inc.">
            <Input id="new-price" name="price" type="number" inputMode="decimal" min={0} step="0.01" className={NUMBER_INPUT} />
          </Field>
        </FormSection>
      </div>
      <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 bg-high-vis-white px-5 py-3">
        <Button type="button" variant="ghost" onClick={() => router.push(returnTo)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
