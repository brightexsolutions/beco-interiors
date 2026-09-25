import { z } from 'zod';

const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start and end date.');

const inclusiveDays = (from: string, to: string) => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.POSITIVE_INFINITY;
  return Math.round((end - start) / 86_400_000) + 1;
};

export const reportRangeSchema = z
  .object({
    period: z.enum(['this_month', 'last_month', 'custom']),
    from: calendarDay.optional(),
    to: calendarDay.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.period !== 'custom') return;
    if (!value.from || !value.to) {
      ctx.addIssue({ code: 'custom', message: 'Choose a start and end date.' });
      return;
    }
    if (value.from > value.to) {
      ctx.addIssue({ code: 'custom', message: 'The start date must be on or before the end date.' });
    }
    if (inclusiveDays(value.from, value.to) > 366) {
      ctx.addIssue({ code: 'custom', message: 'Choose a range of 366 days or fewer.' });
    }
  });

export type ReportRange = z.infer<typeof reportRangeSchema>;
