/**
 * How much a sale takes off, as a whole percent, D163. Worked out from the
 * two prices Beco already sets, so the badge can never disagree with the
 * price beside it: a product at KES 6,000 with KES 10,000 struck through is
 * "40% off".
 *
 * Rounded down, so the figure never promises more than the price gives:
 * 39.6 percent reads 39, not 40. Null when there is no saving of at least one
 * percent, including a compare at price that is missing, equal or lower, or
 * a price that is not a real amount.
 *
 * Lives in @beco/types because the storefront card, the dashboard quote and
 * the PDF and email all need the same answer, and this package costs the
 * storefront nothing to import.
 */
export const percentOff = (
  price: number | null | undefined,
  compareAt: number | null | undefined,
): number | null => {
  if (price == null || compareAt == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(compareAt) || price < 0 || compareAt <= price) return null;
  // The epsilon keeps 40 from reading 39 when float division lands a hair under.
  const percent = Math.floor(((compareAt - price) / compareAt) * 100 + 1e-9);
  return percent >= 1 ? percent : null;
};

/** "40% off", or null when there is nothing to say. */
export const percentOffLabel = (
  price: number | null | undefined,
  compareAt: number | null | undefined,
): string | null => {
  const percent = percentOff(price, compareAt);
  return percent === null ? null : `${percent}% off`;
};

/**
 * What a quote line says about its sale, D163: "Was KES 10,000, 40% off".
 * The struck through figure is the one the line kept when it was written
 * (`quote_items.compare_at_price`); the saving is measured against what the
 * line actually charges, so a salesperson's further discount shows in the
 * figure and a line priced back up to full says nothing. A line not yet
 * priced (0) says nothing either, rather than "100% off". The formatter is
 * the caller's, so the PDF, the email and the dashboard each print money
 * their own way and still agree on the words.
 */
export const lineSaleLabel = (
  unitPrice: number | null | undefined,
  wasPrice: number | null | undefined,
  formatMoney: (amount: number) => string,
): string | null => {
  if (unitPrice == null || !(unitPrice > 0) || wasPrice == null) return null;
  const percent = percentOff(unitPrice, wasPrice);
  return percent === null ? null : `Was ${formatMoney(wasPrice)}, ${percent}% off`;
};
