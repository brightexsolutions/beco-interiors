import { describe, expect, it } from 'vitest';
import { opsAlertRelaySchema, quoteConfirmationRelaySchema } from '../ops-alert';

const valid = {
  area: 'quote.submit',
  summary: 'A website quote request did not save',
  detail: 'connection refused',
  context: { items: 3, code: 'PGRST301', retried: false, email: null },
};

describe('opsAlertRelaySchema', () => {
  it('accepts a well formed relay', () => {
    expect(opsAlertRelaySchema.safeParse(valid).success).toBe(true);
  });

  it('accepts one with only the required fields', () => {
    expect(opsAlertRelaySchema.safeParse({ area: 'request.error', summary: 'x' }).success).toBe(true);
  });

  it('refuses an area that is not a dotted lowercase name', () => {
    expect(opsAlertRelaySchema.safeParse({ ...valid, area: 'Quote Submit' }).success).toBe(false);
    expect(opsAlertRelaySchema.safeParse({ ...valid, area: '<b>' }).success).toBe(false);
  });

  it('refuses empty and oversized text', () => {
    expect(opsAlertRelaySchema.safeParse({ ...valid, summary: '   ' }).success).toBe(false);
    expect(opsAlertRelaySchema.safeParse({ ...valid, summary: 'x'.repeat(201) }).success).toBe(false);
    expect(opsAlertRelaySchema.safeParse({ ...valid, detail: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('refuses nested objects and too many context fields', () => {
    expect(opsAlertRelaySchema.safeParse({ ...valid, context: { nested: { a: 1 } } }).success).toBe(false);
    const many = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`k${i}`, i]));
    expect(opsAlertRelaySchema.safeParse({ ...valid, context: many }).success).toBe(false);
  });
});

describe('quoteConfirmationRelaySchema (D109)', () => {
  const valid = { reference: 'BEC-Q-00042', customerName: 'Achieng Otieno', to: 'achieng@example.com', itemCount: 3 };

  it('accepts a reference, a name, an address and an item count', () => {
    expect(quoteConfirmationRelaySchema.safeParse(valid).success).toBe(true);
    expect(quoteConfirmationRelaySchema.safeParse({ ...valid, itemCount: undefined }).success).toBe(true);
  });

  it('refuses a reference that is not one, a bad address and an absurd count', () => {
    expect(quoteConfirmationRelaySchema.safeParse({ ...valid, reference: 'bec q 42' }).success).toBe(false);
    expect(quoteConfirmationRelaySchema.safeParse({ ...valid, reference: '<b>x</b>' }).success).toBe(false);
    expect(quoteConfirmationRelaySchema.safeParse({ ...valid, to: 'nobody' }).success).toBe(false);
    expect(quoteConfirmationRelaySchema.safeParse({ ...valid, itemCount: 5000 }).success).toBe(false);
    expect(quoteConfirmationRelaySchema.safeParse({ ...valid, customerName: 'x'.repeat(121) }).success).toBe(false);
  });
});
