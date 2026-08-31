import { z } from 'zod';

/**
 * Kenyan mobile numbers, tolerant of the ways people actually type them:
 * 0722333730, +254722333730, 254 722 333 730.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+?254|0)7\d{8}$/.test(v) || /^(\+?254|0)1\d{8}$/.test(v), {
    message: 'Enter a valid Kenyan phone number',
  });

/** Name and phone are the only hard required fields. Everything else is optional on purpose. */
export const quoteSubmissionSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter your name').max(120),
  customerPhone: phoneSchema,
  customerEmail: z.email('Enter a valid email').optional().or(z.literal('')),
  company: z.string().trim().max(160).optional(),
  projectType: z.string().trim().max(80).optional(),
  fulfilment: z.enum(['pickup', 'delivery']).optional(),
  deliveryAddress: z.string().trim().max(400).optional(),
  timeline: z.string().trim().max(120).optional(),
  budgetNote: z.string().trim().max(120).optional(),
  projectDetails: z.string().trim().max(2000).optional(),
  items: z
    .array(
      z.object({
        productId: z.uuid().nullable(),
        description: z.string().trim().min(1).max(300),
        quantity: z.number().positive().max(100000),
      }),
    )
    .min(1, 'Add at least one product'),
});

export type QuoteSubmission = z.infer<typeof quoteSubmissionSchema>;
