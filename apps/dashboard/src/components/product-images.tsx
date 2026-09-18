'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, ConfirmDialog, Field, FormSection, Icon, Input, Select, useActionToast } from '@beco/ui';
import { IMAGE_ROLES, type ProductImage } from '@beco/types';
import { addProductImage, removeProductImage, saveProductImages, type ProductActionState } from '@/app/(app)/products/actions';
import { IMAGE_ROLE_LABEL, productImageUrl, type CatalogueProduct } from '@/lib/products';

const INITIAL: ProductActionState = {};

const defaultAlt = (name: string, role: ProductImage['role']) =>
  `${name.trim()} ${IMAGE_ROLE_LABEL[role].toLowerCase()}`.trim();

export function ProductImages({
  product,
  productName,
  onChanged,
}: {
  product: CatalogueProduct;
  productName?: string | undefined;
  onChanged?: (() => void) | undefined;
}) {
  const [addState, add, adding] = useActionState(addProductImage, INITIAL);
  const [removeState, remove, removing] = useActionState(removeProductImage, INITIAL);
  const [saveState, save, saving] = useActionState(saveProductImages, INITIAL);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductImage[]>(product.images);
  const listedName = productName?.trim() || product.name;
  const [newRole, setNewRole] = useState<ProductImage['role']>('slab');
  const [newAlt, setNewAlt] = useState(defaultAlt(listedName, 'slab'));
  const [altTouched, setAltTouched] = useState(false);
  useActionToast(addState);
  useActionToast(removeState);
  useActionToast(saveState);

  useEffect(() => {
    setRows(product.images);
  }, [product.id, product.updatedAt, product.images]);

  useEffect(() => {
    if (!altTouched) setNewAlt(defaultAlt(listedName, newRole));
  }, [listedName, newRole, altTouched]);

  useEffect(() => {
    if (addState.ok || removeState.ok || saveState.ok) onChanged?.();
  }, [addState.ok, removeState.ok, saveState.ok, onChanged]);

  const busy = adding || removing || saving;
  const persist = (next: ProductImage[]) => {
    setRows(next);
    const form = new FormData();
    form.set('productId', product.id);
    form.set('updatedAt', product.updatedAt);
    form.set('images', JSON.stringify(next));
    save(form);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = rows.map((row, i) => {
      if (i === index) return { ...rows[target]!, sort: i };
      if (i === target) return { ...rows[index]!, sort: i };
      return { ...row, sort: i };
    });
    persist(next);
  };

  return (
    <FormSection
      title="Photographs"
      hint="First shot is the shop card. Name the stone in the alt text, that is what a screen reader speaks."
    >
      {rows.length === 0 ? (
        <p className="font-ui text-base text-neutral-500">No photographs yet. The website card stays empty until you add one.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((image, index) => (
            <li key={image.path} className="min-w-0 border border-neutral-200 p-3">
              <div className="flex min-w-0 gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageUrl(image.path, 400)}
                  alt={image.alt || image.role}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] shrink-0 object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Field label="Shot" htmlFor={`role-${index}`}>
                    <Select
                      id={`role-${index}`}
                      value={image.role}
                      disabled={busy}
                      onChange={(event) => {
                        const role = event.target.value as ProductImage['role'];
                        persist(rows.map((row, i) => (i === index ? { ...row, role } : row)));
                      }}
                    >
                      {IMAGE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {IMAGE_ROLE_LABEL[role]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Alt text" htmlFor={`alt-${index}`} hint="Spoken on the product page">
                    <Input
                      id={`alt-${index}`}
                      defaultValue={image.alt}
                      disabled={busy}
                      onBlur={(event) => {
                        const alt = event.target.value.trim();
                        if (alt === image.alt) return;
                        persist(rows.map((row, i) => (i === index ? { ...row, alt } : row)));
                      }}
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move photograph up"
                >
                  <Icon name="chevron-up" />
                  Up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || index === rows.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move photograph down"
                >
                  <Icon name="chevron-down" />
                  Down
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setPendingPath(image.path)}>
                  <Icon name="trash" />
                  Remove photograph
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={add} className="min-w-0 space-y-3 border border-dashed border-neutral-300 p-4">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="updatedAt" value={product.updatedAt} />
        <div className="flex items-center gap-2 text-charcoal">
          <Icon name="photo" className="h-5 w-5" />
          <p className="font-ui text-sm font-semibold text-charcoal">Add a photograph</p>
        </div>
        <Field label="Photograph" htmlFor="photo" hint="JPEG, PNG or WebP. 12MB max">
          <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy} className="min-w-0 max-w-full" />
        </Field>
        <Field label="Shot" htmlFor="new-photo-role">
          <Select
            id="new-photo-role"
            name="role"
            value={newRole}
            disabled={busy}
            onChange={(event) => setNewRole(event.target.value as ProductImage['role'])}
          >
            {IMAGE_ROLES.map((role) => (
              <option key={role} value={role}>
                {IMAGE_ROLE_LABEL[role]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Alt text" htmlFor="new-photo-alt" hint="Uses the product name until you edit it">
          <Input
            id="new-photo-alt"
            name="alt"
            required
            disabled={busy}
            value={newAlt}
            onChange={(event) => {
              setAltTouched(true);
              setNewAlt(event.target.value);
            }}
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={busy}>
          <Icon name="upload" />
          {adding ? 'Uploading…' : 'Add photograph'}
        </Button>
      </form>

      <ConfirmDialog
        open={pendingPath != null}
        onOpenChange={(open) => !open && setPendingPath(null)}
        title="Remove this photograph?"
        description={`${product.name} will lose this shot on the storefront. The file is deleted from storage. Quotes are not affected.`}
        confirmLabel="Remove photograph"
        destructive
        onConfirm={() => {
          if (!pendingPath) return;
          const form = new FormData();
          form.set('productId', product.id);
          form.set('updatedAt', product.updatedAt);
          form.set('path', pendingPath);
          remove(form);
          setPendingPath(null);
        }}
      />
    </FormSection>
  );
}
