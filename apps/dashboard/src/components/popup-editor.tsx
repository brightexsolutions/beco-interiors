'use client';

import { startTransition, useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  ConfirmDialog,
  Field,
  Icon,
  FormSection,
  Input,
  PromoPopupCard,
  promoPopupWidth,
  Select,
  Textarea,
  cn,
  useActionToast,
  useKeepValuesSubmit,
} from '@beco/ui';
import type { PopupTrigger, PopupVariant } from '@beco/types';
import { POPUP_LIMITS } from '@beco/validation';
import {
  createPopup,
  removePopupBanner,
  updatePopup,
  uploadPopupBanner,
  type PopupActionState,
} from '@/app/(app)/popups/actions';
import { usePhotoUpload } from '@/components/use-photo-upload';
import { toDatetimeLocalValue } from '@/lib/announcements';
import {
  POPUP_SECTION_LABEL,
  POPUP_SECTION_VALUES,
  POPUP_TRIGGER_LABEL,
  POPUP_TRIGGER_VALUES,
  POPUP_VARIANT_HINT,
  POPUP_VARIANT_LABEL,
  POPUP_VARIANT_VALUES,
  bannerPreviewUrl,
  type PopupStone,
  type StaffPopup,
} from '@/lib/popups';
import { productImageUrl } from '@/lib/products';

const INITIAL: PopupActionState = {};
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** The default number for each trigger, so switching trigger never leaves an out of range value behind. */
const TRIGGER_DEFAULT: Record<PopupTrigger, number> = { delay: 8, scroll: 50, exit: 0, section: 0 };

export function PopupEditor({ popup, stones }: { popup: StaffPopup | null; stones: PopupStone[] }) {
  const router = useRouter();
  const save = popup ? updatePopup : createPopup;
  const [state, submit, pending] = useActionState(save, INITIAL);
  const onSubmit = useKeepValuesSubmit(submit);
  useActionToast(state);

  // The banner look's picture travels on its own form, D162: uploaded once the
  // pop up has an id, the same two steps as a blog cover.
  const [bannerState, uploadBanner, bannerPending] = useActionState(uploadPopupBanner, INITIAL);
  const upload = usePhotoUpload({ area: 'popups', field: 'file', dispatch: uploadBanner });
  const [removeState, removeBanner, removePending] = useActionState(removePopupBanner, INITIAL);
  const [confirmRemoveBanner, setConfirmRemoveBanner] = useState(false);
  useActionToast(bannerState);
  useActionToast(removeState);
  const { settle } = upload;
  useEffect(() => {
    if (bannerState.ok || bannerState.error) settle();
    // The new picture is on the row, not in this sheet's props, until the page reloads its data.
    if (bannerState.ok) router.refresh();
  }, [bannerState, settle, router]);
  useEffect(() => {
    if (removeState.ok) router.refresh();
  }, [removeState, router]);

  const [variant, setVariant] = useState<PopupVariant>(popup?.variant ?? 'offer');
  const [eyebrow, setEyebrow] = useState(popup?.eyebrow ?? '');
  const [badge, setBadge] = useState(popup?.badge ?? '');
  const [title, setTitle] = useState(popup?.title ?? '');
  const [body, setBody] = useState(popup?.body ?? '');
  const [ctaLabel, setCtaLabel] = useState(popup?.ctaLabel ?? '');
  const [ctaUrl, setCtaUrl] = useState(popup?.ctaUrl ?? '');
  const [trigger, setTrigger] = useState<PopupTrigger>(popup?.trigger ?? 'delay');
  const [triggerValue, setTriggerValue] = useState(
    String(popup?.triggerValue ?? TRIGGER_DEFAULT.delay),
  );
  const [selected, setSelected] = useState<string[]>(popup?.productIds ?? []);
  const [stoneSearch, setStoneSearch] = useState('');

  const justCreated = !popup && Boolean(state.popupId);

  useEffect(() => {
    if (state.popupId) router.replace(`/popups?edit=${state.popupId}`);
  }, [state.popupId, router]);

  const stoneById = useMemo(() => new Map(stones.map((s) => [s.id, s])), [stones]);
  const full = selected.length >= POPUP_LIMITS.products;
  const visibleStones = stones.filter((s) =>
    s.name.toLowerCase().includes(stoneSearch.trim().toLowerCase()),
  );

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : full ? current : [...current, id],
    );

  const bannerSrc = bannerPreviewUrl(popup?.image ?? null);
  const isBanner = variant === 'image';

  const stoneImages = selected
    .map((id) => stoneById.get(id))
    .filter((s): s is PopupStone => Boolean(s))
    .slice(0, variant === 'split' ? 1 : POPUP_LIMITS.products)
    .map((s) => {
      const path = variant === 'split' ? s.roomPath : s.slabPath;
      return path ? (
        // eslint-disable-next-line @next/next/no-img-element -- a preview of R2 derivatives, as the product editor shows them
        <img
          key={s.id}
          src={productImageUrl(path, 400)}
          alt={s.name}
          className="h-full w-full object-cover"
        />
      ) : null;
    })
    .filter(Boolean);

  const previewImages = isBanner
    ? bannerSrc
      ? [
          // eslint-disable-next-line @next/next/no-img-element -- the uploaded banner's R2 derivative
          <img key="banner" src={bannerSrc} alt={title} className="block h-auto w-full" />,
        ]
      : []
    : stoneImages;

  return (
    <>
      <form onSubmit={onSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {popup ? <input type="hidden" name="popupId" value={popup.id} /> : null}
        {selected.map((id) => (
          <input key={id} type="hidden" name="productIds" value={id} />
        ))}
        <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
          <FormSection title="Look">
            <fieldset>
              <legend className="sr-only">Look</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {POPUP_VARIANT_VALUES.map((value) => (
                  <label
                    key={value}
                    className={cn(
                      'flex min-h-11 cursor-pointer flex-col gap-1 rounded-control border px-4 py-3 font-ui',
                      variant === value ? 'border-charcoal bg-neutral-50' : 'border-neutral-200',
                    )}
                  >
                    <span className="flex items-center gap-3 text-base font-semibold text-charcoal">
                      <input
                        type="radio"
                        name="variant"
                        value={value}
                        checked={variant === value}
                        onChange={() => setVariant(value)}
                        className="h-5 w-5"
                      />
                      {POPUP_VARIANT_LABEL[value]}
                    </span>
                    <span className="pl-8 text-sm text-neutral-500">
                      {POPUP_VARIANT_HINT[value]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </FormSection>

          {isBanner ? (
            <FormSection title="Banner" hint="JPEG, PNG or WebP. Shown whole, at its own shape.">
              {bannerSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- the uploaded banner's R2 derivative
                <img
                  src={bannerSrc}
                  alt=""
                  className="block h-auto w-full rounded-control border border-neutral-200"
                />
              ) : null}
              {popup ? (
                <>
                  <Field
                    label={bannerSrc ? 'Replace the banner' : 'Banner image'}
                    htmlFor="popup-banner-file"
                  >
                    <Input
                      id="popup-banner-file"
                      name="file"
                      type="file"
                      form="popup-banner-form"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      form="popup-banner-form"
                      variant="outline"
                      pending={bannerPending || upload.phase !== 'idle'}
                    >
                      <Icon name="upload" />
                      {upload.label ?? 'Upload banner'}
                    </Button>
                    {popup.image ? (
                      <Button
                        type="button"
                        variant="ghost"
                        pending={removePending}
                        onClick={() => setConfirmRemoveBanner(true)}
                      >
                        Remove banner
                      </Button>
                    ) : null}
                  </div>
                  {!popup.image ? (
                    <p className="font-ui text-sm text-neutral-500">
                      Not shown on the site until a banner is uploaded.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="font-ui text-base text-neutral-500">
                  Save the pop up, then add the banner.
                </p>
              )}
            </FormSection>
          ) : null}

          <FormSection title="Copy">
            <Field
              label={isBanner ? 'What the banner says' : 'Headline'}
              htmlFor="popup-title"
              {...(isBanner
                ? { hint: 'Read to screen readers, who cannot see the words in a picture' }
                : {})}
            >
              <Input
                id="popup-title"
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            {isBanner ? null : (
              <>
                <Field label="Small label above" htmlFor="popup-eyebrow" hint="Optional">
                  <Input
                    id="popup-eyebrow"
                    name="eyebrow"
                    value={eyebrow}
                    placeholder="Live offer"
                    onChange={(e) => setEyebrow(e.target.value)}
                  />
                </Field>
                <Field label="Badge" htmlFor="popup-badge" hint="Optional, short">
                  <Input
                    id="popup-badge"
                    name="badge"
                    value={badge}
                    placeholder="40% off"
                    maxLength={16}
                    onChange={(e) => setBadge(e.target.value)}
                  />
                </Field>
                <Field label="Supporting line" htmlFor="popup-body" hint="Optional">
                  <Textarea
                    id="popup-body"
                    name="body"
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </Field>
              </>
            )}
          </FormSection>

          <FormSection
            title="Button"
            hint={
              isBanner
                ? 'The whole banner links here. Set it whenever the banner shows a button.'
                : 'Optional. Both fields together, or neither.'
            }
          >
            <Field label="Label" htmlFor="popup-cta-label">
              <Input
                id="popup-cta-label"
                name="ctaLabel"
                value={ctaLabel}
                placeholder="Explore the stones"
                onChange={(e) => setCtaLabel(e.target.value)}
              />
            </Field>
            <Field label="Link" htmlFor="popup-cta-url">
              <Input
                id="popup-cta-url"
                name="ctaUrl"
                value={ctaUrl}
                placeholder="/shop/sintered-stone"
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </Field>
          </FormSection>

          {isBanner ? null : (
            <FormSection
              title="Stones"
              hint={
                variant === 'split'
                  ? 'The first one picked fills the photo side.'
                  : `Shown as a strip, in the order picked. Up to ${POPUP_LIMITS.products}.`
              }
            >
              <p className="font-ui text-sm text-neutral-500" aria-live="polite">
                {selected.length} of {POPUP_LIMITS.products} picked
              </p>
              <Field label="Find a stone" htmlFor="popup-stone-search">
                <Input
                  id="popup-stone-search"
                  type="search"
                  value={stoneSearch}
                  onChange={(e) => setStoneSearch(e.target.value)}
                />
              </Field>
              <ul
                className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3"
                aria-label="Stones"
              >
                {visibleStones.map((stone) => {
                  const at = selected.indexOf(stone.id);
                  const on = at >= 0;
                  return (
                    <li key={stone.id}>
                      <label
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-2 rounded-control border p-2 font-ui text-sm',
                          on ? 'border-charcoal bg-neutral-50' : 'border-neutral-200',
                          !on && full && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!on && full}
                          onChange={() => toggle(stone.id)}
                          className="h-5 w-5 shrink-0"
                        />
                        {stone.slabPath ? (
                          // eslint-disable-next-line @next/next/no-img-element -- R2 derivative thumbnail
                          <img
                            src={productImageUrl(stone.slabPath, 400)}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-control object-cover"
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate text-charcoal">{stone.name}</span>
                        {on ? (
                          <span className="tabular-nums text-neutral-500">{at + 1}</span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
              {visibleStones.length === 0 ? (
                <p className="font-ui text-sm text-neutral-500">No published stone matches.</p>
              ) : null}
            </FormSection>
          )}

          <FormSection title="When it opens">
            <Field label="Opens" htmlFor="popup-trigger">
              <Select
                id="popup-trigger"
                name="trigger"
                value={trigger}
                onChange={(e) => {
                  const next = e.target.value as PopupTrigger;
                  setTrigger(next);
                  setTriggerValue(String(TRIGGER_DEFAULT[next]));
                }}
              >
                {POPUP_TRIGGER_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {POPUP_TRIGGER_LABEL[value]}
                  </option>
                ))}
              </Select>
            </Field>
            {trigger === 'exit' ? (
              <p className="font-ui text-sm text-neutral-500">
                On a phone, which has no pointer to leave with, it opens halfway down the page.
              </p>
            ) : trigger === 'section' ? (
              <Field
                label="Section"
                htmlFor="popup-trigger-section"
                hint="Opens as this comes into view. Pages without it never open it."
              >
                <Select
                  id="popup-trigger-section"
                  name="triggerSection"
                  required
                  defaultValue={popup?.triggerSection ?? ''}
                >
                  <option value="" disabled>
                    Pick a section
                  </option>
                  {POPUP_SECTION_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {POPUP_SECTION_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field
                label={trigger === 'delay' ? 'Seconds' : 'Percent of the page'}
                htmlFor="popup-trigger-value"
              >
                <Input
                  id="popup-trigger-value"
                  name="triggerValue"
                  type="number"
                  min={
                    trigger === 'delay'
                      ? POPUP_LIMITS.delaySeconds.min
                      : POPUP_LIMITS.scrollPercent.min
                  }
                  max={
                    trigger === 'delay'
                      ? POPUP_LIMITS.delaySeconds.max
                      : POPUP_LIMITS.scrollPercent.max
                  }
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                />
              </Field>
            )}
            <Field
              label="Show again after"
              htmlFor="popup-show-again"
              hint="Days. 0 is once a visit."
            >
              <Input
                id="popup-show-again"
                name="showAgainDays"
                type="number"
                min={POPUP_LIMITS.showAgainDays.min}
                max={POPUP_LIMITS.showAgainDays.max}
                defaultValue={popup?.showAgainDays ?? 7}
              />
            </Field>
          </FormSection>

          <FormSection title="Schedule" hint="Nairobi time. It appears and retires on its own.">
            <Field label="Starts" htmlFor="popup-starts">
              <Input
                id="popup-starts"
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(popup?.startsAt ?? new Date().toISOString())}
              />
            </Field>
            <Field label="Ends" htmlFor="popup-ends">
              <Input
                id="popup-ends"
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(
                  popup?.endsAt ?? new Date(Date.now() + WEEK).toISOString(),
                )}
              />
            </Field>
            <Field
              label="Priority"
              htmlFor="popup-priority"
              hint="If two are live, the higher shows"
            >
              <Input
                id="popup-priority"
                name="priority"
                type="number"
                min={0}
                max={100}
                defaultValue={popup?.priority ?? 0}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 font-ui text-base text-charcoal">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={popup?.isActive ?? true}
                className="h-5 w-5 rounded-control border-neutral-300"
              />
              Switched on
            </label>
          </FormSection>

          <FormSection title="Preview" hint="As a visitor sees it.">
            {/* Inert: a picture of the pop up, not a second set of controls. */}
            <div
              inert
              data-testid="popup-preview"
              className={cn(
                'beco-fixed-palette beco-storefront-scope mx-auto w-full',
                promoPopupWidth(variant),
              )}
            >
              <PromoPopupCard
                variant={variant}
                eyebrow={eyebrow || null}
                badge={badge || null}
                title={title || 'Your headline'}
                body={body || null}
                cta={ctaLabel ? { label: ctaLabel, href: ctaUrl || '/' } : null}
                images={previewImages}
              />
            </div>
          </FormSection>
        </div>
        <div className="shrink-0 border-t border-neutral-200 px-5 py-3">
          {/* A new pop up, once saved, locks Save until the sheet has moved to
            editing it. The move waits on the storefront refresh, which can
            take seconds on production, and a second press in that gap made
            a duplicate. */}
          <Button type="submit" pending={pending} disabled={justCreated}>
            {pending ? 'Saving' : justCreated ? 'Saved' : 'Save'}
          </Button>
        </div>
      </form>
      {/* Outside the main form, which a form cannot nest in; the file input
        and its button above join it by the form attribute. */}
      <form id="popup-banner-form" onSubmit={upload.onSubmit} className="hidden">
        {popup ? <input type="hidden" name="popupId" value={popup.id} /> : null}
      </form>
      <ConfirmDialog
        open={confirmRemoveBanner}
        onOpenChange={setConfirmRemoveBanner}
        title={`Remove the banner on ${title || 'this pop up'}?`}
        description="The picture is deleted from storage, and the pop up stops showing until a new one is uploaded."
        confirmLabel="Remove banner"
        destructive
        onConfirm={() => {
          const form = new FormData();
          if (popup) form.set('popupId', popup.id);
          setConfirmRemoveBanner(false);
          startTransition(() => removeBanner(form));
        }}
      />
    </>
  );
}
