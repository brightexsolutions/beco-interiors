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

  const [selected, setSelected] = useState(0);
  const currentIndex = rows.length === 0 ? -1 : Math.min(selected, rows.length - 1);
  const current = currentIndex >= 0 ? rows[currentIndex]! : null;
  const roomLeft = rows.length < MAX_PER_PRODUCT;

  return (
    <FormSection
      title="Photographs"
      hint="The first shot is the website card. Tap a photograph to change its shot, alt text or order."
    >
      <div className="min-w-0 space-y-3">
        <p className="font-ui text-sm text-neutral-500">
          {rows.length === 0 ? 'No photographs yet. The website card stays empty until you add one.' : `${rows.length} of ${MAX_PER_PRODUCT}`}
        </p>

        {/* The grid: what is stored, then what is on its way, then the Add tile. */}
        <ul aria-label="Product photographs" className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {rows.map((image, index) => {
            const active = index === currentIndex;
            return (
              <li key={image.path} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={active}
                  disabled={busy}
                  onClick={() => setSelected(index)}
                  aria-label={`${IMAGE_ROLE_LABEL[image.role]}${index === 0 ? ', cover' : ''}: ${image.alt || 'no alt text yet'}`}
                  className={cn(
                    'relative block aspect-square w-full overflow-hidden rounded-control bg-neutral-100 outline-none transition-shadow',
                    active ? 'ring-2 ring-charcoal ring-offset-2' : 'hover:ring-2 hover:ring-neutral-300 hover:ring-offset-2',
                    'focus-visible:ring-2 focus-visible:ring-charcoal focus-visible:ring-offset-2 disabled:opacity-60',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl(image.path, 400)} alt="" width={400} height={400} className="h-full w-full object-cover" />
                  <span
                    aria-hidden
                    className="absolute bottom-1.5 left-1.5 inline-flex max-w-[calc(100%-0.75rem)] items-center truncate rounded-full bg-charcoal/85 px-2 py-0.5 font-ui text-xs font-semibold text-high-vis-white"
                  >
                    {IMAGE_ROLE_LABEL[image.role]}
                    {index === 0 ? ' · cover' : ''}
                  </span>
                </button>
              </li>
            );
          })}
          {queue.map((item) => {
            const inFlight = item.status === 'preparing' || item.status === 'uploading' || item.status === 'processing';
            return (
              // Presentational: the row below carries the same file's name, fields and status for assistive tech.
              <li key={item.id} aria-hidden className="min-w-0">
                <div
                  className={cn(
                    'relative aspect-square w-full overflow-hidden rounded-control bg-neutral-100',
                    item.status === 'failed' ? 'ring-2 ring-error ring-offset-2' : null,
                    item.status === 'queued' ? 'opacity-60' : null,
                  )}
                >
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-ui text-xs font-semibold text-neutral-500">
                      {isHeicFile(item.file) ? 'HEIC' : 'Photo'}
                    </span>
                  )}
                  {item.status === 'uploading' ? (
                    <span className="absolute inset-x-2 bottom-8 h-1 overflow-hidden rounded-full bg-high-vis-white/60">
                      <span className="block h-full bg-warm-red-deep transition-[width] duration-200" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'absolute bottom-1.5 left-1.5 inline-flex max-w-[calc(100%-0.75rem)] items-center gap-1 truncate rounded-full px-2 py-0.5 font-ui text-xs font-semibold',
                      item.status === 'done'
                        ? 'bg-success-soft text-success-deep'
                        : item.status === 'failed'
                          ? 'bg-danger-soft text-danger'
                          : 'bg-high-vis-white/90 text-charcoal',
                    )}
                  >
                    {item.status === 'done' ? <Icon name="check" className="h-3 w-3" /> : null}
                    {item.status === 'uploading'
                      ? `Uploading ${Math.round(item.progress * 100)}%`
                      : inFlight
                        ? (item.detail ?? STATUS_WORD[item.status])
                        : STATUS_WORD[item.status]}
                  </span>
                </div>
              </li>
            );
          })}
          {roomLeft ? (
            <li className="min-w-0">
              <label
                htmlFor={inputId}
                className={cn(
                  'flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-control border-[1.5px] border-dashed border-neutral-300 px-2 text-center text-neutral-500 transition-colors',
                  'hover:border-charcoal hover:text-charcoal focus-within:border-charcoal focus-within:ring-2 focus-within:ring-charcoal focus-within:ring-offset-2',
                  busy && 'pointer-events-none opacity-50',
                )}
              >
                <Icon name="upload" className="h-5 w-5" />
                <span className="sr-only">Photographs, choose files.</span>
                <span className="font-ui text-xs font-semibold">Add photos</span>
                <span className="font-ui text-xs">HEIC ok, 40MB</span>
                <input
                  ref={fileRef}
                  id={inputId}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  disabled={busy}
                  onChange={onPick}
                  className="sr-only"
                />
              </label>
            </li>
          ) : null}
        </ul>
        <p className="font-ui text-sm text-neutral-500">
          JPEG, PNG, WebP or iPhone HEIC. Up to 40MB each, several at once. Each photo is resized to 2400px on this device before it uploads, so a phone photo sends in seconds; the website gets 400, 800 and 1600px copies.
        </p>
        {!roomLeft ? (
          <p className="font-ui text-sm font-semibold text-charcoal">Twelve photographs is the most a product can carry. Remove one to add another.</p>
        ) : null}

        {/* The selected photograph: its shot, alt text and place in the order. */}
        {current ? (
          <div className="min-w-0 rounded-card border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-ui text-sm font-semibold text-charcoal">
                Photograph {currentIndex + 1} of {rows.length}
                {currentIndex === 0 ? ', the website card' : ''}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <Button type="button" variant="ghost" size="small" disabled={busy || currentIndex === 0} onClick={() => { move(currentIndex, -1); setSelected(currentIndex - 1); }} aria-label="Move photograph up">
                  <Icon name="chevron-up" />
                  Up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  disabled={busy || currentIndex === rows.length - 1}
                  onClick={() => { move(currentIndex, 1); setSelected(currentIndex + 1); }}
                  aria-label="Move photograph down"
                >
                  <Icon name="chevron-down" />
                  Down
                </Button>
                <Button type="button" variant="ghost" size="small" disabled={busy} onClick={() => setPendingPath(current.path)}>
                  <Icon name="trash" />
                  Remove photograph
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Field label="Shot" htmlFor={`role-${currentIndex}`}>
                <Select
                  id={`role-${currentIndex}`}
                  value={current.role}
                  disabled={busy}
                  onChange={(event) => {
                    const role = event.target.value as ImageRole;
                    persist(rows.map((row, i) => (i === currentIndex ? { ...row, role } : row)));
                  }}
                >
                  {IMAGE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {IMAGE_ROLE_LABEL[role]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Alt text" htmlFor={`alt-${currentIndex}`} hint="Spoken on the product page">
                <Input
                  key={current.path}
                  id={`alt-${currentIndex}`}
                  defaultValue={current.alt}
                  disabled={busy}
                  onBlur={(event) => {
                    const alt = event.target.value.trim();
                    if (alt === current.alt) return;
                    persist(rows.map((row, i) => (i === currentIndex ? { ...row, alt } : row)));
                  }}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {/* What is on its way: each file's shot and alt text, then one Upload. */}
        {queue.length > 0 ? (
          <ul aria-label="Photographs to upload" className="divide-y divide-neutral-200 overflow-hidden rounded-card border border-neutral-200">
            {queue.map((item) => (
              <li key={item.id} className={cn('min-w-0 p-3', item.status === 'failed' && 'bg-danger-soft/40')}>
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-neutral-100 text-neutral-500">
                    {item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-ui text-xs font-semibold">{isHeicFile(item.file) ? 'HEIC' : 'Photo'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-ui text-sm text-neutral-500">
                        {item.file.name} · {megabytes(item.file.size)}
                      </p>
                      {item.status === 'done' ? null : (
                        <Button type="button" variant="ghost" size="small" disabled={busy} onClick={() => dropFromQueue(item.id)} aria-label={`Remove ${item.file.name} from the upload`}>
                          <Icon name="x" />
                          Remove
                        </Button>
                      )}
                    </div>
                    {item.status === 'done' ? (
                      <p className="flex items-center gap-1.5 font-ui text-sm font-semibold text-success-deep">
                        <Icon name="check" />
                        Added
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
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
                      </div>
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
