import { describe, expect, it } from 'vitest';
import { convertQuoteToOrderSchema, markOrderPaidSchema, setOrderStatusSchema } from '../dashboard-order';

const lock = {
  orderId: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-09-17T10:00:00.000Z',
};

describe('setOrderStatusSchema', () => {
  it('accepts the forward statuses', () => {
    expect(setOrderStatusSchema.safeParse({ ...lock, status: 'confirmed' }).success).toBe(true);
    expect(setOrderStatusSchema.safeParse({ ...lock, status: 'fulfilled' }).success).toBe(true);
    expect(setOrderStatusSchema.safeParse({ ...lock, status: 'cancelled' }).success).toBe(true);
  });

  it('refuses a status the database does not know', () => {
    expect(setOrderStatusSchema.safeParse({ ...lock, status: 'invoiced' }).success).toBe(false);
  });
});

describe('markOrderPaidSchema', () => {
  it('needs the lock token', () => {
    expect(markOrderPaidSchema.safeParse({ orderId: lock.orderId }).success).toBe(false);
    expect(markOrderPaidSchema.safeParse(lock).success).toBe(true);
  });
});

describe('convertQuoteToOrderSchema', () => {
  it('needs the quote lock, not an order id', () => {
    expect(
      convertQuoteToOrderSchema.safeParse({
        quoteId: '11111111-1111-4111-8111-111111111111',
        updatedAt: lock.updatedAt,
      }).success,
    ).toBe(true);
  });
});

describe('sendReceiptEmailSchema', () => {
  it('refuses a missing address', async () => {
    const { sendReceiptEmailSchema } = await import('../dashboard-order');
    expect(sendReceiptEmailSchema.safeParse({ ...lock, to: '' }).success).toBe(false);
    expect(sendReceiptEmailSchema.safeParse({ ...lock, to: 'achieng@example.com' }).success).toBe(true);
  });
});
