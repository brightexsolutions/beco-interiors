/**
 * Money as an email prints it: `KES 265,000`. Whole shillings, since a quote
 * is priced in whole shillings and a figure with cents reads as a mistake;
 * grouped with commas in the style every Kenyan invoice uses. Deterministic
 * across runtimes, where `Intl` with `en-KE` prints `Ksh` on some and `KES`
 * on others.
 */
export const formatKes = (amount: number): string => {
  const whole = Math.round(amount);
  const grouped = Math.abs(whole).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${whole < 0 ? '-' : ''}KES ${grouped}`;
};
