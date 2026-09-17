import { describe, expect, it } from 'vitest';
import { quoteTotals, roundMoney, splitVatInclusive } from '../money';

describe('splitVatInclusive, D50', () => {
  it('backs 16% out of a 65,000 slab: 8,965.52 inside, not 10,400 on top', () => {
    const split = splitVatInclusive(65000, 0.16);
    expect(split.gross).toBe(65000);
    expect(split.vat).toBe(8965.52);
    expect(split.net).toBe(56034.48);
    expect(roundMoney(split.net + split.vat)).toBe(split.gross);
  });

  it('a zero amount is a zero split, not NaN', () => {
    expect(splitVatInclusive(0, 0.16)).toEqual({ gross: 0, net: 0, vat: 0 });
  });

  it('a zero rate leaves the whole amount as net', () => {
    expect(splitVatInclusive(100, 0)).toEqual({ gross: 100, net: 100, vat: 0 });
  });

  it('rejects a percent-style rate, which would add VAT rather than back it out', () => {
    expect(() => splitVatInclusive(65000, 16)).toThrow(/fraction/i);
  });

  it('net plus vat equals gross across a range of inclusive amounts', () => {
    for (let n = 0; n <= 200_000; n += 137.5) {
      const split = splitVatInclusive(n, 0.16);
      expect(roundMoney(split.net + split.vat)).toBe(split.gross);
    }
  });
});

describe('quoteTotals', () => {
  it('an empty quote is unpriced, never a KES 0.00 total', () => {
    expect(quoteTotals([], 0.16).isPriced).toBe(false);
    expect(quoteTotals([{ unitPrice: 0, quantity: 2 }], 0.16).isPriced).toBe(false);
  });

  it('a mixed quote, some lines still at 0, is unpriced until every line is priced', () => {
    const mixed = quoteTotals(
      [
        { unitPrice: 65000, quantity: 1 },
        { unitPrice: 0, quantity: 1 },
      ],
      0.16,
    );
    expect(mixed.isPriced).toBe(false);
    expect(mixed.gross).toBe(0);
  });

  it('sums VAT-inclusive line totals then backs VAT out once', () => {
    const totals = quoteTotals(
      [
        { unitPrice: 65000, quantity: 1 },
        { unitPrice: 20000, quantity: 2 },
      ],
      0.16,
    );
    expect(totals.isPriced).toBe(true);
    expect(totals.gross).toBe(105000);
    expect(totals).toEqual({ isPriced: true, ...splitVatInclusive(105000, 0.16) });
  });
});
