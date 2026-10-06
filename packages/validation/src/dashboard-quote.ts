import { z } from 'zod';
import { QUOTE_STATUSES } from '@beco/types';
import { phoneSchema } from './quote';

/**
 * Dashboard quote mutations. Every write carries the row's `updated_at` so
 * two people cannot silently overwrite each other (REVIEW 2.2). The database
 * still refuses a stale write; this schema only proves the shape.
 */

const lock = {
  quoteId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
};

export const quoteLockSchema = z.object(lock);

export const claimQuoteSchema = quoteLockSchema;

export const assignQuoteSchema = quoteLockSchema.extend({
  assigneeId: z.uuid(),
});

export const approveQuoteSchema = quoteLockSchema;

export const reopenQuoteSchema = quoteLockSchema;

export const setQuoteStatusSchema = quoteLockSchema
  .extend({
    status: z.enum(QUOTE_STATUSES),
    lostReason: z.string().trim().max(400).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'lost' && !value.lostReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['lostReason'],
        message: 'Say why this quote was lost',
      });
    }
    if (value.status === 'new') {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'A quote cannot move back to new',
      });
    }
  });

export const overrideLinePriceSchema = quoteLockSchema.extend({
  lineId: z.uuid(),
  unitPrice: z.coerce.number().min(0, 'A price cannot be negative').max(10_000_000),
});

export const updateQuoteLineSchema = quoteLockSchema.extend({
  lineId: z.uuid(),
  quantity: z.coerce.number().positive().max(10_000).multipleOf(0.5),
  unitPrice: z.coerce.number().min(0, 'A price cannot be negative').max(10_000_000),
});

export const updateQuoteLinesSchema = quoteLockSchema.extend({
  items: z
    .array(
      z.object({
        lineId: z.uuid(),
        quantity: z.coerce.number().positive().max(10_000).multipleOf(0.5),
        unitPrice: z.coerce.number().min(0, 'A price cannot be negative').max(10_000_000),
      }),
    )
    .min(1, 'Nothing to save')
    .max(60),
});

export const addCustomLineSchema = quoteLockSchema.extend({
  description: z.string().trim().min(2, 'Describe the item').max(300),
  quantity: z.coerce.number().positive().max(10_000).multipleOf(0.5),
  unitPrice: z.coerce.number().min(0).max(10_000_000),
});

export const addCatalogueLineSchema = quoteLockSchema.extend({
  productId: z.uuid(),
  quantity: z.coerce.number().positive().max(10_000).multipleOf(0.5),
  unitPrice: z.coerce.number().min(0).max(10_000_000),
});

export const addCatalogueLinesSchema = quoteLockSchema.extend({
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.coerce.number().positive().max(10_000).multipleOf(0.5),
        unitPrice: z.coerce.number().min(0).max(10_000_000),
      }),
    )
    .min(1, 'Pick at least one product')
    .max(40),
});

export const createCounterQuoteSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter a name').max(120),
  customerPhone: phoneSchema,
  customerEmail: z.email('Enter a valid email').optional().or(z.literal('')),
  source: z.enum(['walk_in', 'phone']),
  /** The picked customer record, D130. The database snapshots its details
   *  onto the quote; the name and phone above are what the form showed. */
  customerId: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
  items: z
    .array(
      z.object({
        productId: z.uuid().nullable().optional(),
        description: z.string().trim().min(1).max(300),
        quantity: z.coerce.number().positive().max(10_000).multipleOf(0.5),
        unitPrice: z.coerce.number().min(0).max(10_000_000),
      }),
    )
    .min(1, 'Add at least one item')
    .max(60),
});

export const sendQuoteEmailSchema = quoteLockSchema.extend({
  to: z.email('Enter a valid email'),
});

export type QuoteLock = z.infer<typeof quoteLockSchema>;
export type SetQuoteStatus = z.infer<typeof setQuoteStatusSchema>;
export type CreateCounterQuote = z.infer<typeof createCounterQuoteSchema>;
