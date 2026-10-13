import { describe, expect, it } from 'vitest';
import { QUOTE_FLOW, canMoveQuote, quoteMoves } from '../quote-transitions';

const q = (status: (typeof QUOTE_FLOW)[number], requiresApproval = false, approvedAt: string | null = null) => ({
  status,
  requiresApproval,
  approvedAt,
});

describe('quoteMoves, the rules set_quote_status enforces (D148)', () => {
  it('walks forward and never back to new', () => {
    expect(quoteMoves(q('new'), true)).toEqual(['reviewing', 'quoted']);
    expect(quoteMoves(q('reviewing'), true)).toEqual(['quoted', 'lost']);
    expect(quoteMoves(q('quoted'), true)).toEqual(['won', 'lost']);
    for (const status of QUOTE_FLOW) expect(quoteMoves(q(status), true)).not.toContain('new');
  });

  it('treats won and lost as closed: lost comes back through Reopen, not a move', () => {
    expect(quoteMoves(q('won'), true)).toEqual([]);
    expect(quoteMoves(q('lost'), true)).toEqual([]);
  });

  it('wins only from quoted', () => {
    expect(quoteMoves(q('new'), true)).not.toContain('won');
    expect(quoteMoves(q('reviewing'), true)).not.toContain('won');
  });

  it('holds a quote waiting on approval to reviewing, as the finalized constraint does', () => {
    expect(quoteMoves(q('new', true), true)).toEqual(['reviewing']);
    expect(quoteMoves(q('quoted', true), true)).toEqual([]);
    expect(quoteMoves(q('quoted', true, '2026-10-12T00:00:00.000Z'), true)).toEqual(['won', 'lost']);
  });

  it('offers nothing to someone who cannot change the quote', () => {
    expect(quoteMoves(q('new'), false)).toEqual([]);
  });
});

describe('canMoveQuote', () => {
  it('lets an admin move any quote and a salesperson only their own', () => {
    expect(canMoveQuote(true, 'a', 'b')).toBe(true);
    expect(canMoveQuote(true, 'a', null)).toBe(true);
    expect(canMoveQuote(false, 'a', 'a')).toBe(true);
    expect(canMoveQuote(false, 'a', 'b')).toBe(false);
    expect(canMoveQuote(false, 'a', null)).toBe(false);
  });
});
