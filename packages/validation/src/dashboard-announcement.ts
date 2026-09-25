import { z } from 'zod';
import { ANNOUNCEMENT_TYPES } from '@beco/types';

const emptyToNull = (value: unknown): unknown => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().trim().max(max)]));

const instant = z.string().min(1, 'Need a date').refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Need a real date',
});

export const announcementFieldsSchema = z
  .object({
    title: z.string().trim().min(2, 'Name the announcement').max(80),
    body: optionalText(240),
    type: z.enum(ANNOUNCEMENT_TYPES),
    ctaLabel: optionalText(40),
    ctaUrl: optionalText(400),
    startsAt: instant,
    endsAt: instant,
    priority: z.coerce.number().int().min(0).max(100),
    isActive: z.preprocess((value) => value === true || value === 'true' || value === 'on', z.boolean()),
  })
  .superRefine((value, ctx) => {
    const start = Date.parse(value.startsAt);
    const end = Date.parse(value.endsAt);
    if (end <= start) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'The end has to be after the start',
      });
    }
    if (value.ctaLabel && !value.ctaUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['ctaUrl'],
        message: 'A call to action needs a URL',
      });
    }
    if (value.ctaUrl && !value.ctaLabel) {
      ctx.addIssue({
        code: 'custom',
        path: ['ctaLabel'],
        message: 'A URL needs a call to action label',
      });
    }
    if (value.ctaUrl && !/^https?:\/\//i.test(value.ctaUrl) && !value.ctaUrl.startsWith('/')) {
      ctx.addIssue({
        code: 'custom',
        path: ['ctaUrl'],
        message: 'Use a site path or an http URL',
      });
    }
  });

export const createAnnouncementSchema = announcementFieldsSchema;

export const updateAnnouncementSchema = announcementFieldsSchema.extend({
  announcementId: z.uuid(),
});

export type AnnouncementFields = z.infer<typeof announcementFieldsSchema>;
