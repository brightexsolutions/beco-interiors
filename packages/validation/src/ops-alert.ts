import { z } from 'zod';

/**
 * The storefront never holds the Resend key, so it relays an operational
 * failure to the dashboard, which sends the alert. This is the body that
 * relay may carry: bounded strings and a small flat context, nothing that
 * could turn the dashboard into an open mail relay with arbitrary content.
 */
const contextValue = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

export const opsAlertRelaySchema = z.object({
  area: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9._-]+$/, 'area is a dotted lowercase name'),
  summary: z.string().trim().min(1).max(200),
  detail: z.string().max(2000).optional(),
  context: z
    .record(z.string().max(40), contextValue)
    .refine((value) => Object.keys(value).length <= 12, 'at most 12 context fields')
    .optional(),
});

export type OpsAlertRelay = z.infer<typeof opsAlertRelaySchema>;
