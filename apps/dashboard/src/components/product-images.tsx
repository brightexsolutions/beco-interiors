'use client';

import { useActionState, useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Button, ConfirmDialog, Field, FormSection, Icon, Input, Select, Spinner, cn, toast, useActionToast } from '@beco/ui';
import { IMAGE_ROLES, type ImageRole, type ProductImage } from '@beco/types';
import { addProductImage, removeProductImage, saveProductImages, type ProductActionState } from '@/app/(app)/products/actions';
import { createPhotoUpload } from '@/app/(app)/uploads/actions';
import { stagePhoto, type PresignPhoto } from '@/lib/direct-upload';
import { isHeicFile, megabytes, photoInputProblem, prepareImage, type PreparedImage } from '@/lib/image-prepare';
import { IMAGE_ROLE_LABEL, productImageUrl, type CatalogueProduct } from '@/lib/products';

const INITIAL: ProductActionState = {};
const MAX_PER_PRODUCT = 12;

const defaultAlt = (name: string, role: ImageRole) => `${name.trim()} ${IMAGE_ROLE_LABEL[role].toLowerCase()}`.trim();

/** A guess at the shot from the file name, the way the Drive import reads it. */
export const guessRole = (fileName: string): ImageRole => {
  const name = fileName.toLowerCase();
  if (/book\s*match|bookmatch/.test(name)) return 'bookmatch';
  if (/stand/.test(name)) return 'on_stand';
  if (/\bapp\b|application|kitchen|room|install|in[-_ ]use/.test(name)) return 'application';
  return 'slab';
};

export type QueueStatus = 'queued' | 'preparing' | 'uploading' | 'processing' | 'done' | 'failed';

export interface QueuedPhoto {
  id: string;
  file: File;
  previewUrl: string | null;
  role: ImageRole;
  alt: string;
  altTouched: boolean;
  status: QueueStatus;
  progress: number;
  detail: string | null;
  error: string | null;
}

export type PreparePhoto = (file: File, onPhase: (phase: 'decoding' | 'resizing') => void) => Promise<PreparedImage>;
export type AddPhoto = (form: FormData) => Promise<ProductActionState>;

const STATUS_WORD: Record<QueueStatus, string> = {
  queued: 'Waiting',
  preparing: 'Preparing',
  uploading: 'Uploading',
  processing: 'Saving',
  done: 'Added',
  failed: 'Failed',
};

/**
 * The product's photographs, D116 and D139.
 *
 * The list on top is what is stored: shot, alt text, order, remove. Below
 * it, a queue: pick several files at once, each gets a shot and alt text,
 * then one Upload sends them one after another. Each file is made small in
 * the browser first (an iPhone HEIC decoded, the long edge capped, a JPEG),
 * goes straight to R2, and is finished by the server action, which hands
 * back the row's new lock token for the next one. Every file says what it
 * is doing in words and a percentage, and a failure stays on its row with
 * the reason while the rest carry on.
 */
export function ProductImages({
  product,
  productName,
  onChanged,
  prepare = (file, onPhase) => prepareImage(file, { onPhase }),
  presign = createPhotoUpload,
  add = (form) => addProductImage({}, form),
}: {
  product: CatalogueProduct;
  productName?: string | undefined;
  onChanged?: (() => void) | undefined;
  /** Injectable for tests: jsdom has no canvas. */
  prepare?: PreparePhoto | undefined;
  presign?: PresignPhoto | undefined;
  add?: AddPhoto | undefined;
}) {
  const [removeState, remove, removing] = useActionState(removeProductImage, INITIAL);
  const [saveState, save, saving] = useActionState(saveProductImages, INITIAL);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [rows, setRows] = useState<ProductImage[]>(product.images);
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const listedName = productName?.trim() || product.name;
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  // The lock token moves on with every add; the queue reads the latest.
  const lockRef = useRef(product.updatedAt);
  useActionToast(removeState);
  useActionToast(saveState);

  useEffect(() => {
    setRows(product.images);
    lockRef.current = product.updatedAt;
  }, [product.id, product.updatedAt, product.images]);

  useEffect(() => {
    if (removeState.ok || saveState.ok) onChanged?.();
  }, [removeState.ok, saveState.ok, onChanged]);

  // Default alt text follows the product name until the person edits it.
  useEffect(() => {
    setQueue((current) =>
      current.map((item) => (item.altTouched ? item : { ...item, alt: defaultAlt(listedName, item.role) })),
    );
  }, [listedName]);

  // Object URLs are released when the component goes.
  useEffect(
    () => () => {
      for (const item of queue) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const busy = removing || saving || uploading;
  const persist = (next: ProductImage[]) => {
    setRows(next);
    const form = new FormData();
    form.set('productId', product.id);
    form.set('updatedAt', lockRef.current);
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

  const patch = useCallback((id: string, change: Partial<QueuedPhoto>) => {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    const room = MAX_PER_PRODUCT - rows.length - queue.filter((item) => item.status !== 'done').length;
    const accepted: QueuedPhoto[] = [];
    for (const file of files) {
      const problem = photoInputProblem(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      if (accepted.length >= room) {
        toast.error(`Twelve photographs is the most a product can carry. ${file.name} was not added.`);
        continue;
      }
      const role = guessRole(file.name);
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        // The browser cannot draw a HEIC, so its preview waits for the decode.
        previewUrl: isHeicFile(file) ? null : URL.createObjectURL(file),
        role,
        alt: defaultAlt(listedName, role),
        altTouched: false,
        status: 'queued',
        progress: 0,
        detail: null,
        error: null,
      });
    }
    if (accepted.length > 0) setQueue((current) => [...current.filter((item) => item.status !== 'done'), ...accepted]);
  };

  const dropFromQueue = (id: string) => {
    setQueue((current) => {
      const gone = current.find((item) => item.id === id);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const uploadAll = async () => {
    const pending = queue.filter((item) => item.status === 'queued' || item.status === 'failed');
    if (pending.length === 0) return;
    for (const item of pending) {
      if (!item.alt.trim() || item.alt.trim().length < 2) {
        patch(item.id, { status: 'failed', error: 'Describe the photograph in the alt text first.' });
        return;
      }
    }
    setUploading(true);
    let added = 0;
    try {
      for (const item of pending) {
        patch(item.id, { status: 'preparing', progress: 0, error: null, detail: null });
        let file: File;
        try {
          const prepared = await prepare(item.file, (phase) =>
            patch(item.id, { detail: phase === 'decoding' ? 'Reading the photo' : 'Resizing' }),
          );
          file = prepared.file;
          if (prepared.changed) {
            const url = URL.createObjectURL(file);
            setQueue((current) =>
              current.map((row) => {
                if (row.id !== item.id) return row;
                if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
                return { ...row, previewUrl: url };
              }),
            );
          }
        } catch (error) {
          patch(item.id, {
            status: 'failed',
            detail: null,
            error: error instanceof Error ? error.message : 'Could not read that photograph.',
          });
          continue;
        }

        patch(item.id, { status: 'uploading', detail: null, progress: 0 });
        const staged = await stagePhoto(file, 'products', presign, (fraction) => patch(item.id, { progress: fraction }));
        if (staged.kind === 'error') {
          patch(item.id, { status: 'failed', error: staged.error });
          continue;
        }

        patch(item.id, { status: 'processing', progress: 1 });
        const form = new FormData();
        form.set('productId', product.id);
        form.set('updatedAt', lockRef.current);
        form.set('role', item.role);
        form.set('alt', item.alt.trim());
        if (staged.kind === 'staged') form.set('uploadKey', staged.key);
        else form.set('photo', file);

        let result: ProductActionState;
        try {
          result = await add(form);
        } catch {
          result = { error: 'The upload did not finish. Check the connection and try again.' };
        }
        if (result.error) {
          patch(item.id, { status: 'failed', error: result.error });
          // A stale lock means every later add would fail the same way.
          if (/changed while you were editing/i.test(result.error)) break;
          continue;
        }
        if (result.updatedAt) lockRef.current = result.updatedAt;
        added += 1;
        patch(item.id, { status: 'done', progress: 1, error: null });
      }
    } finally {
      setUploading(false);
    }
    if (added > 0) {
      toast.success(added === 1 ? 'Photograph added.' : `${added} photographs added.`);
      onChanged?.();
    }
    const failed = queue.filter((item) => item.status === 'failed').length;
    if (added === 0 && failed === 0) return;
  };

  const waiting = queue.filter((item) => item.status === 'queued' || item.status === 'failed');
  const active = queue.find((item) => item.status === 'preparing' || item.status === 'uploading' || item.status === 'processing');
  const uploadLabel = uploading
    ? active
      ? `${STATUS_WORD[active.status]} ${queue.filter((item) => item.status === 'done').length + 1} of ${queue.length}`
      : 'Uploading'
    : waiting.length === 1
      ? 'Upload 1 photograph'
      : waiting.length === 0
        ? 'Upload photographs'
        : `Upload ${waiting.length} photographs`;

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
            <li key={image.path} className="min-w-0 rounded-card border border-neutral-200 p-3">
              <div className="flex min-w-0 gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageUrl(image.path, 400)}
                  alt={image.alt || image.role}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] shrink-0 rounded-control object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Field label="Shot" htmlFor={`role-${index}`}>
                    <Select
                      id={`role-${index}`}
                      value={image.role}
                      disabled={busy}
                      onChange={(event) => {
                        const role = event.target.value as ImageRole;
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
                <Button type="button" variant="ghost" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move photograph up">
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

      <div className="min-w-0 space-y-3 rounded-card border border-dashed border-neutral-300 p-4">
        <div className="flex items-center gap-2 text-charcoal">
          <Icon name="photo" className="h-5 w-5" />
          <p className="font-ui text-sm font-semibold text-charcoal">Add photographs</p>
        </div>
        <Field
          label="Photographs"
          htmlFor={inputId}
          hint="JPEG, PNG, WebP or iPhone HEIC. Up to 40MB each, several at once"
        >
          <Input
            ref={fileRef}
            id={inputId}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            disabled={busy || rows.length >= MAX_PER_PRODUCT}
            onChange={onPick}
            className="min-w-0 max-w-full"
          />
        </Field>
        <p className="font-ui text-sm text-neutral-500">
          Each photo is resized to 2400px on this device before it uploads, so a phone photo sends in seconds. The website gets 400, 800 and 1600px copies.
        </p>
        {rows.length >= MAX_PER_PRODUCT ? (
          <p className="font-ui text-sm font-semibold text-charcoal">Twelve photographs is the most a product can carry. Remove one to add another.</p>
        ) : null}

        {queue.length > 0 ? (
          <ul aria-label="Photographs to upload" className="space-y-3">
            {queue.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'min-w-0 rounded-card border p-3',
                  item.status === 'failed' ? 'border-error' : item.status === 'done' ? 'border-success/40' : 'border-neutral-200',
                )}
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-control bg-neutral-100 text-neutral-500">
                    {item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt="" width={72} height={72} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-ui text-xs font-semibold uppercase tracking-[0.1em]">{isHeicFile(item.file) ? 'HEIC' : 'Photo'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="min-w-0 truncate font-ui text-sm text-neutral-500">
                      {item.file.name} · {megabytes(item.file.size)}
                    </p>
                    {item.status === 'done' ? (
                      <p className="flex items-center gap-1.5 font-ui text-base font-semibold text-success">
                        <Icon name="check" />
                        Added
                      </p>
                    ) : (
                      <>
                        <Field label="Shot" htmlFor={`queued-role-${item.id}`}>
                          <Select
                            id={`queued-role-${item.id}`}
                            value={item.role}
                            disabled={busy}
                            onChange={(event) => {
                              const role = event.target.value as ImageRole;
                              patch(item.id, { role, alt: item.altTouched ? item.alt : defaultAlt(listedName, role) });
                            }}
                          >
                            {IMAGE_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {IMAGE_ROLE_LABEL[role]}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Alt text" htmlFor={`queued-alt-${item.id}`} hint="Uses the product name until you edit it">
                          <Input
                            id={`queued-alt-${item.id}`}
                            value={item.alt}
                            required
                            disabled={busy}
                            onChange={(event) => patch(item.id, { alt: event.target.value, altTouched: true })}
                          />
                        </Field>
                      </>
                    )}
                    {item.status === 'preparing' || item.status === 'uploading' || item.status === 'processing' ? (
                      <div role="status" className="space-y-1">
                        <p className="flex items-center gap-2 font-ui text-sm font-semibold text-charcoal">
                          <Spinner />
                          {item.status === 'uploading'
                            ? `Uploading ${Math.round(item.progress * 100)}%`
                            : (item.detail ?? STATUS_WORD[item.status])}
                        </p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                          <div
                            className="h-full bg-charcoal transition-[width] duration-200"
                            style={{ width: `${Math.round((item.status === 'uploading' ? item.progress : item.status === 'processing' ? 1 : 0.05) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {item.status === 'failed' && item.error ? (
                      <p role="alert" className="font-ui text-sm font-semibold text-error">
                        {item.error}
                      </p>
                    ) : null}
                  </div>
                </div>
                {item.status === 'done' ? null : (
                  <div className="mt-3">
                    <Button type="button" variant="ghost" disabled={busy} onClick={() => dropFromQueue(item.id)} aria-label={`Remove ${item.file.name} from the upload`}>
                      <Icon name="x" />
                      Remove
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {queue.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={busy || waiting.length === 0} pending={uploading} onClick={uploadAll}>
              <Icon name="upload" />
              {uploadLabel}
            </Button>
            {uploading && active ? (
              <p role="status" className="font-ui text-sm text-neutral-500">
                {STATUS_WORD[active.status]} {active.file.name}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

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
          form.set('updatedAt', lockRef.current);
          form.set('path', pendingPath);
          remove(form);
          setPendingPath(null);
        }}
      />
    </FormSection>
  );
}
