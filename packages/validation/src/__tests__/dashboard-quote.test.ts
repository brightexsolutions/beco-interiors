import { describe, expect, it } from 'vitest';
import {
  addCatalogueLineSchema,
  addCatalogueLinesSchema,
  addCustomLineSchema,
  assignQuoteSchema,
  createCounterQuoteSchema,
  overrideLinePriceSchema,
  setQuoteStatusSchema,
  updateQuoteLineSchema,
  updateQuoteLinesSchema,
  removeQuoteLineSchema,
} from '../dashboard-quote';

const lock = {
  quoteId: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-09-17T10:00:00.000Z',
};

describe('setQuoteStatusSchema', () => {
  it('requires a lost reason when marking lost', () => {
    const parsed = setQuoteStatusSchema.safeParse({ ...lock, status: 'lost' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toMatch(/why this quote was lost/i);
    }
  });

  it('accepts lost with a reason', () => {
    expect(setQuoteStatusSchema.safeParse({ ...lock, status: 'lost', lostReason: 'Went with another supplier' }).success).toBe(
      true,
    );
  });

  it('refuses moving a quote back to new', () => {
    expect(setQuoteStatusSchema.safeParse({ ...lock, status: 'new' }).success).toBe(false);
  });

  it('accepts reviewing, quoted and won without extra fields', () => {
    expect(setQuoteStatusSchema.safeParse({ ...lock, status: 'reviewing' }).success).toBe(true);
    expect(setQuoteStatusSchema.safeParse({ ...lock, status: 'quoted' }).success).toBe(true);
    expect(setQuoteStatusSchema.safeParse({ ...lock, status: 'won' }).success).toBe(true);
  });
});

describe('assignQuoteSchema', () => {
  it('needs a real assignee id, not a blank', () => {
    expect(assignQuoteSchema.safeParse({ ...lock, assigneeId: '' }).success).toBe(false);
    expect(
      assignQuoteSchema.safeParse({ ...lock, assigneeId: '22222222-2222-4222-8222-222222222222' }).success,
    ).toBe(true);
  });
});

describe('overrideLinePriceSchema', () => {
  it('rejects a negative price before it reaches the database', () => {
    expect(overrideLinePriceSchema.safeParse({ ...lock, lineId: lock.quoteId, unitPrice: -1 }).success).toBe(
      false,
    );
  });

  it('accepts zero, which is still the unpriced state', () => {
    expect(overrideLinePriceSchema.safeParse({ ...lock, lineId: lock.quoteId, unitPrice: 0 }).success).toBe(
      true,
    );
  });
});

describe('updateQuoteLineSchema', () => {
  it('needs both a quantity and a price', () => {
    expect(
      updateQuoteLineSchema.safeParse({ ...lock, lineId: lock.quoteId, unitPrice: 100 }).success,
    ).toBe(false);
    expect(
      updateQuoteLineSchema.safeParse({
        ...lock,
        lineId: lock.quoteId,
        quantity: 1.5,
        unitPrice: 65000,
      }).success,
    ).toBe(true);
  });
});

describe('updateQuoteLinesSchema', () => {
  it('refuses an empty batch so Save cannot write nothing', () => {
    expect(updateQuoteLinesSchema.safeParse({ ...lock, items: [] }).success).toBe(false);
  });

  it('accepts more than one dirty line', () => {
    expect(
      updateQuoteLinesSchema.safeParse({
        ...lock,
        items: [
          { lineId: lock.quoteId, quantity: 3, unitPrice: 85000 },
          { lineId: '22222222-2222-4222-8222-222222222222', quantity: 0.5, unitPrice: 65000 },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('createCounterQuoteSchema', () => {
  it('only accepts walk_in or phone, never web', () => {
    const base = {
      customerName: 'Achieng',
      customerPhone: '0722333730',
      source: 'web',
      items: [{ description: 'Slab', quantity: 1, unitPrice: 65000 }],
    };
    expect(createCounterQuoteSchema.safeParse(base).success).toBe(false);
    expect(createCounterQuoteSchema.safeParse({ ...base, source: 'walk_in' }).success).toBe(true);
    expect(createCounterQuoteSchema.safeParse({ ...base, source: 'phone' }).success).toBe(true);
  });

  it('takes a picked customer id, treats a blank one as none, and refuses a malformed one (D130)', () => {
    const base = {
      customerName: 'Achieng',
      customerPhone: '0722333730',
      source: 'walk_in',
      items: [{ description: 'Slab', quantity: 1, unitPrice: 65000 }],
    };
    const picked = createCounterQuoteSchema.safeParse({ ...base, customerId: lock.quoteId });
    expect(picked.success && picked.data.customerId).toBe(lock.quoteId);
    const blank = createCounterQuoteSchema.safeParse({ ...base, customerId: '' });
    expect(blank.success && blank.data.customerId).toBeUndefined();
    expect(createCounterQuoteSchema.safeParse({ ...base, customerId: 'nope' }).success).toBe(false);
  });

  it('refuses a quote with no lines', () => {
    expect(
      createCounterQuoteSchema.safeParse({
        customerName: 'Achieng',
        customerPhone: '0722333730',
        source: 'walk_in',
        items: [],
      }).success,
    ).toBe(false);
  });
});

describe('addCustomLineSchema', () => {
  it('rejects a half-step that is not a half', () => {
    expect(
      addCustomLineSchema.safeParse({ ...lock, description: 'Cut to size', quantity: 1.37, unitPrice: 0 }).success,
    ).toBe(false);
  });

  it('accepts a described custom line at a half quantity', () => {
    expect(
      addCustomLineSchema.safeParse({ ...lock, description: 'Site sample pack', quantity: 0.5, unitPrice: 0 })
        .success,
    ).toBe(true);
  });
});

describe('addCatalogueLineSchema', () => {
  it('needs a real product id, not a name typed into the field', () => {
    expect(
      addCatalogueLineSchema.safeParse({ ...lock, productId: 'amber-jade', quantity: 1, unitPrice: 65000 }).success,
    ).toBe(false);
    expect(
      addCatalogueLineSchema.safeParse({
        ...lock,
        productId: '22222222-2222-4222-8222-222222222222',
        quantity: 0.5,
        unitPrice: 65000,
      }).success,
    ).toBe(true);
  });
});

describe('addCatalogueLinesSchema', () => {
  it('needs at least one real product id', () => {
    expect(addCatalogueLinesSchema.safeParse({ ...lock, items: [] }).success).toBe(false);
    expect(
      addCatalogueLinesSchema.safeParse({
        ...lock,
        items: [
          { productId: '22222222-2222-4222-8222-222222222222', quantity: 0.5, unitPrice: 65000 },
          { productId: '33333333-3333-4333-8333-333333333333', quantity: 1, unitPrice: 89000 },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('removeQuoteLineSchema', () => {
  it('needs the line and the lock', () => {
    expect(removeQuoteLineSchema.safeParse({ ...lock, lineId: '22222222-2222-4222-8222-222222222222' }).success).toBe(true);
    expect(removeQuoteLineSchema.safeParse({ ...lock }).success).toBe(false);
    expect(removeQuoteLineSchema.safeParse({ quoteId: lock.quoteId, updatedAt: '', lineId: lock.quoteId }).success).toBe(false);
  });

  it('refuses a line id that is not a uuid, with a sentence', () => {
    const parsed = removeQuoteLineSchema.safeParse({ ...lock, lineId: 'line-1' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe('Pick the item to remove');
  });
});
