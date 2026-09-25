import { z } from 'zod';
import { ORDER_STATUSES } from '@beco/types';

const lock = {
  orderId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
};

export const orderLockSchema = z.object(lock);

export const convertQuoteToOrderSchema = z.object({
  quoteId: z.uuid(),
  updatedAt: z.string().min(1, 'Missing lock token'),
});

export const setOrderStatusSchema = orderLockSchema.extend({
  status: z.enum(ORDER_STATUSES),
});

export const markOrderPaidSchema = orderLockSchema;

export const sendReceiptEmailSchema = orderLockSchema.extend({
  to: z.email('Enter a valid email'),
});

export type OrderLock = z.infer<typeof orderLockSchema>;
