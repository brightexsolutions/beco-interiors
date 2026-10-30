import { z } from 'zod';
import { POPUP_SECTIONS, POPUP_TRIGGERS, POPUP_VARIANTS } from '@beco/types';

const emptyToNull = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().trim().max(max)]));

const instant = z.string().min(1, 'Need a date').refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Need a real date',
});

/** Mirrors the check constraints in migration 73, so the form says why before the database does. */
export const POPUP_LIMITS = {
  products: 6,
  delaySeconds: { min: 0, max: 120 },
  scrollPercent: { min: 10, max: 90 },
  showAgainDays: { min: 0, max: 90 },
} as const;

export const popupFieldsSchema = z
  .object({
    variant: z.enum(POPUP_VARIANTS),
    eyebrow: optionalText(40),
    badge: optionalText(16),
    title: z.string().trim().min(2, 'Write a headline').max(90),
    body: optionalText(280),
    ctaLabel: optionalText(32),
    ctaUrl: optionalText(400),
    productIds: z
      .array(z.uuid())
      .max(POPUP_LIMITS.products, `Pick up to ${POPUP_LIMITS.products} stones`)
      .transform((ids) => [...new Set(ids)]),
    trigger: z.enum(POPUP_TRIGGERS),
    triggerValue: z.coerce.number().int(),
    // Only read for the section trigger; dropped otherwise so a stale
    // choice never reaches the database's pairing check.
    triggerSection: z.preprocess(emptyToNull, z.union([z.null(), z.enum(POPUP_SECTIONS)])),
    showAgainDays: z.coerce
      .number()
      .int()
      .min(POPUP_LIMITS.showAgainDays.min)
      .max(POPUP_LIMITS.showAgainDays.max, 'At most 90 days'),
    startsAt: instant,
    endsAt: instant,
    priority: z.coerce.number().int().min(0).max(100),
    isActive: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
  })
  .superRefine((value, ctx) => {
    if (Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'The end has to be after the start' });
    }
    if (value.ctaLabel && !value.ctaUrl) {
      ctx.addIssue({ code: 'custom', path: ['ctaUrl'], message: 'A button needs a link' });
    }
    if (value.ctaUrl && !value.ctaLabel) {
      ctx.addIssue({ code: 'custom', path: ['ctaLabel'], message: 'A link needs a button label' });
    }
    // A site path or an http(s) URL. `//host` is a protocol relative URL to
    // another site wearing a path's clothes, so it is refused too.
    if (value.ctaUrl && !/^https?:\/\//i.test(value.ctaUrl) && !/^\/(?!\/)/.test(value.ctaUrl)) {
      ctx.addIssue({ code: 'custom', path: ['ctaUrl'], message: 'Use a site path or an http link' });
    }
    if (value.trigger === 'delay') {
      const { min, max } = POPUP_LIMITS.delaySeconds;
      if (value.triggerValue < min || value.triggerValue > max) {
        ctx.addIssue({ code: 'custom', path: ['triggerValue'], message: `Wait ${min} to ${max} seconds` });
      }
    }
    if (value.trigger === 'scroll') {
      const { min, max } = POPUP_LIMITS.scrollPercent;
      if (value.triggerValue < min || value.triggerValue > max) {
        ctx.addIssue({ code: 'custom', path: ['triggerValue'], message: `Scroll ${min} to ${max} percent` });
      }
    }
    if (value.trigger === 'section' && !value.triggerSection) {
      ctx.addIssue({ code: 'custom', path: ['triggerSection'], message: 'Pick the section it waits for' });
    }
    // The offer card is built around its strip of stones; the split look
    // around one photograph. Either way, a pop up without a stone in it is
    // a grey box on a site whose whole point is the stone.
    if (value.productIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['productIds'], message: 'Pick at least one stone to show' });
    }
  });

/** A section only travels with the section trigger, so a stale choice never meets the database's pairing check. */
const keepSectionForItsTrigger = <T extends { trigger: string; triggerSection: string | null }>(value: T): T => ({
  ...value,
  triggerSection: value.trigger === 'section' ? value.triggerSection : null,
});

export const createPopupSchema = popupFieldsSchema.transform(keepSectionForItsTrigger);

export const updatePopupSchema = popupFieldsSchema
  .extend({ popupId: z.uuid() })
  .transform(keepSectionForItsTrigger);

export type PopupFields = z.infer<typeof createPopupSchema>;
