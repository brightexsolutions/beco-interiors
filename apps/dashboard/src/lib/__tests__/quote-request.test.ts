import { describe, expect, it } from 'vitest';
import { parseQuoteRequest, requestChanges } from '../quote-request';

const raw = {
  source: 'submission',
  at: '2026-10-06T08:00:00+00:00',
  lines: [
    { id: 'a', product_id: 'p1', description: 'Amber Jade', code: 'AJ-1', quantity: 2 },
    { id: 'b', product_id: 'p2', description: 'Soft close hinge', code: null, quantity: '10.00' },
  ],
};

describe('parseQuoteRequest', () => {
  it('reads the snapshot submit_quote writes, numbers from strings included', () => {
    expect(parseQuoteRequest(raw)).toEqual({
      source: 'submission',
      at: '2026-10-06T08:00:00+00:00',
      lines: [
        { id: 'a', description: 'Amber Jade', code: 'AJ-1', quantity: 2 },
        { id: 'b', description: 'Soft close hinge', code: null, quantity: 10 },
      ],
    });
  });

  it('keeps a backfill marked as one', () => {
    expect(parseQuoteRequest({ ...raw, source: 'backfill' })?.source).toBe('backfill');
  });

  it('reads anything malformed as no request rather than crashing the page', () => {
    expect(parseQuoteRequest(null)).toBeNull();
    expect(parseQuoteRequest([])).toBeNull();
    expect(parseQuoteRequest({ ...raw, source: 'staff' })).toBeNull();
    expect(parseQuoteRequest({ ...raw, lines: 'x' })).toBeNull();
    expect(parseQuoteRequest({ ...raw, lines: [{ id: 'a', description: 'X', quantity: 'many' }] })).toBeNull();
    expect(parseQuoteRequest({ ...raw, lines: [null] })).toBeNull();
  });
});

describe('requestChanges', () => {
  const request = parseQuoteRequest(raw);

  it('is empty when nothing changed, or when there is no request', () => {
    const same = [
      { id: 'a', description: 'Amber Jade', code: 'AJ-1', quantity: 2 },
      { id: 'b', description: 'Soft close hinge', code: null, quantity: 10 },
    ];
    expect(requestChanges(request, same)).toEqual([]);
    expect(requestChanges(null, same)).toEqual([]);
  });

  it('names a removed line, a changed quantity and an added line, request order first', () => {
    const now = [
      { id: 'a', description: 'Amber Jade', code: 'AJ-1', quantity: 1.5 },
      { id: 'c', description: 'Delivery, Karen', code: null, quantity: 1 },
    ];
    expect(requestChanges(request, now)).toEqual([
      { kind: 'quantity', description: 'Amber Jade', code: 'AJ-1', from: 2, to: 1.5 },
      { kind: 'removed', description: 'Soft close hinge', code: null, quantity: 10 },
      { kind: 'added', description: 'Delivery, Karen', code: null, quantity: 1 },
    ]);
  });
});
