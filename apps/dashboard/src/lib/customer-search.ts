/**
 * Returning customers, read from the quotes they have already had. There is
 * no customer table (docs/REVIEW.md 2.6, a deliberate simplification), so a
 * customer here is every quote sharing one phone number, the one field the
 * counter and the website both require.
 */
export interface CustomerQuoteRow {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  company: string | null;
  created_at: string;
}

export interface CustomerMatch {
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  quoteCount: number;
  lastQuotedAt: string;
}

/** The national part of a Kenyan number, so 0722..., +254722... and 254722... are one person. */
export const phoneKey = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
};

/** Strips what could reshape a PostgREST `or` filter, and caps the length. */
export const sanitizeCustomerTerm = (term: string): string =>
  term.replace(/[%_,()*"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

/**
 * One entry per phone number, newest details first. An email or company
 * given on an older quote fills a gap on a newer one, so a returning
 * customer who once left an email does not have to be asked again.
 * `rows` must be newest first.
 */
export function dedupeCustomers(rows: CustomerQuoteRow[], limit = 8): CustomerMatch[] {
  const byPhone = new Map<string, CustomerMatch>();
  for (const row of rows) {
    const key = phoneKey(row.customer_phone) || row.customer_phone;
    const found = byPhone.get(key);
    if (!found) {
      byPhone.set(key, {
        name: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email || null,
        company: row.company || null,
        quoteCount: 1,
        lastQuotedAt: row.created_at,
      });
      continue;
    }
    found.quoteCount += 1;
    found.email ??= row.customer_email || null;
    found.company ??= row.company || null;
  }
  return [...byPhone.values()].slice(0, limit);
}
