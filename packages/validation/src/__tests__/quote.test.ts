import { describe, expect, it } from 'vitest';
import { webQuoteSubmissionSchema } from '../quote';

const base = {
  customerName: 'Wanjiru',
  customerPhone: '0722000111',
};

const submission = (quantity: number) =>
  webQuoteSubmissionSchema.safeParse({
    ...base,
    items: [{ slug: 'amber-jade', quantity }],
  });

/**
 * A slab is cut to order, so half a slab is a real quantity. Whether a given
 * PRODUCT is actually sold in halves is not decidable from the request alone,
 * that is `unit` on the product row, so this schema only proves the shape is
 * a sane half-or-whole number. `submit_quote`, migration 23, is what actually
 * enforces whole-versus-half per product and is where the real coverage of
 * that distinction lives.
 */
describe('webQuoteSubmissionSchema, quantity', () => {
  it('accepts a whole number, the default way a slab is sold', () => {
    expect(submission(1).success).toBe(true);
    expect(submission(3).success).toBe(true);
  });

  it('accepts a half step, which a slab can genuinely be cut to', () => {
    expect(submission(1.5).success).toBe(true);
    expect(submission(0.5).success).toBe(true);
  });

  it('rejects an arbitrary fraction Beco does not cut to', () => {
    expect(submission(1.37).success).toBe(false);
    expect(submission(2.1).success).toBe(false);
  });

  it('rejects zero and negative quantities', () => {
    expect(submission(0).success).toBe(false);
    expect(submission(-1.5).success).toBe(false);
  });

  it('rejects a quantity past the ceiling', () => {
    expect(submission(10000.5).success).toBe(false);
  });

  it('accepts the ceiling itself', () => {
    expect(submission(10000).success).toBe(true);
  });
});
