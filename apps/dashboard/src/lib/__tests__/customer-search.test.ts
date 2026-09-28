import { describe, expect, it } from 'vitest';
import { dedupeCustomers, phoneKey, sanitizeCustomerTerm, type CustomerQuoteRow } from '../customer-search';

const row = (over: Partial<CustomerQuoteRow>): CustomerQuoteRow => ({
  customer_name: 'Achieng Otieno',
  customer_phone: '0722333730',
  customer_email: null,
  company: null,
  created_at: '2026-09-20T10:00:00Z',
  ...over,
});

describe('phoneKey', () => {
  it('treats the local, international and bare forms as one number', () => {
    expect(phoneKey('0722333730')).toBe('722333730');
    expect(phoneKey('+254722333730')).toBe('722333730');
    expect(phoneKey('254 722 333 730')).toBe('722333730');
    expect(phoneKey('722-333-730')).toBe('722333730');
  });
});

describe('sanitizeCustomerTerm', () => {
  it('removes characters that could reshape the filter and caps the length', () => {
    expect(sanitizeCustomerTerm('Mwangi,company.eq.x')).toBe('Mwangi company.eq.x');
    expect(sanitizeCustomerTerm('a%b_c(d)*"e"')).toBe('a b c d e');
    expect(sanitizeCustomerTerm('x'.repeat(100))).toHaveLength(60);
    expect(sanitizeCustomerTerm('   ')).toBe('');
  });
});

describe('dedupeCustomers', () => {
  it('merges quotes that share a phone number in any format, keeping the newest name', () => {
    const matches = dedupeCustomers([
      row({ customer_name: 'Achieng O.', customer_phone: '+254722333730', created_at: '2026-09-25T00:00:00Z' }),
      row({ customer_name: 'Achieng Otieno', customer_phone: '0722333730' }),
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ name: 'Achieng O.', quoteCount: 2, lastQuotedAt: '2026-09-25T00:00:00Z' });
  });

  it('fills a missing email or company from an older quote', () => {
    const [match] = dedupeCustomers([
      row({ created_at: '2026-09-25T00:00:00Z' }),
      row({ customer_email: 'achieng@example.com', company: 'Karen Kitchens' }),
    ]);
    expect(match).toMatchObject({ email: 'achieng@example.com', company: 'Karen Kitchens' });
  });

  it('keeps different people apart and respects the limit', () => {
    const rows = Array.from({ length: 12 }, (_, i) => row({ customer_phone: `07000000${String(i).padStart(2, '0')}` }));
    expect(dedupeCustomers(rows)).toHaveLength(8);
    expect(dedupeCustomers(rows, 3)).toHaveLength(3);
  });

  it('treats an empty email as none rather than an address', () => {
    expect(dedupeCustomers([row({ customer_email: '' })])[0]!.email).toBeNull();
  });
});
