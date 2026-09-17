/**
 * Money on this platform is VAT-inclusive (D50). A 65,000 slab already
 * contains 8,965.52 of VAT, it does not have 10,400 sitting on top.
 *
 * Round to two decimal places after every operation, never at the end of a
 * chain, so a document and a dashboard card cannot disagree by a cent.
 */

export const roundMoney = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface VatSplit {
  /** Line totals with VAT inside, the figure the customer pays. */
  gross: number;
  /** Gross minus VAT. */
  net: number;
  /** VAT backed out of gross: gross * rate / (1 + rate). */
  vat: number;
}

/**
 * Split a VAT-inclusive amount. `vatRate` is a fraction (0.16), not a
 * percent. The inverse (adding VAT on top) is deliberately not exported:
 * that is the arithmetic D50 exists to forbid.
 */
export const splitVatInclusive = (grossInclusive: number, vatRate: number): VatSplit => {
  if (!(vatRate >= 0) || vatRate >= 1) {
    throw new Error('vatRate must be a fraction in [0, 1)');
  }
  const gross = roundMoney(grossInclusive);
  const vat = roundMoney(gross * (vatRate / (1 + vatRate)));
  const net = roundMoney(gross - vat);
  return { gross, net, vat };
};

export interface QuoteMoney extends VatSplit {
  /** False while any line is still at unit_price 0 (M5 0.3). */
  isPriced: boolean;
}

/** Totals for a set of quote lines. Mixed priced/unpriced is unpriced. */
export const quoteTotals = (
  lines: readonly { unitPrice: number; quantity: number }[],
  vatRate: number,
): QuoteMoney => {
  const isPriced = lines.length > 0 && lines.every((line) => line.unitPrice > 0);
  const gross = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  if (!isPriced) {
    return { isPriced: false, gross: 0, net: 0, vat: 0 };
  }
  return { isPriced: true, ...splitVatInclusive(gross, vatRate) };
};
