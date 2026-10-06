import { describe, expect, it } from 'vitest';
import {
  CLIENT_TYPE_LABEL,
  customerFromEmbed,
  customerSearchFilter,
  customerSortFrom,
  phoneKey,
  sanitizeCustomerTerm,
  toCustomerMatch,
} from '../customer-search';

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

describe('customerSearchFilter', () => {
  it('does not search under two characters', () => {
    expect(customerSearchFilter(' a ')).toBeNull();
    expect(customerSearchFilter('')).toBeNull();
  });

  it('searches name, company, email and KRA PIN by text, and not the phone for a word', () => {
    const filter = customerSearchFilter('Achieng')!;
    expect(filter).toContain('name.ilike."%Achieng%"');
    expect(filter).toContain('company.ilike."%Achieng%"');
    expect(filter).toContain('email.ilike."%Achieng%"');
    expect(filter).toContain('kra_pin.ilike."%Achieng%"');
    expect(filter).not.toContain('phone_key');
  });

  it('matches a number on its national digits, whatever prefix was typed', () => {
    expect(customerSearchFilter('0722 333')).toContain('phone_key.ilike."%722333%"');
    expect(customerSearchFilter('+254722')).toContain('phone_key.ilike."%722%"');
  });

  it('finds a KRA PIN typed with spaces', () => {
    expect(customerSearchFilter('A123 456')).toContain('kra_pin.ilike."%A123456%"');
  });

  it('cannot be steered into a different filter by a comma', () => {
    expect(customerSearchFilter('x,phone.neq.0')!.split(',')).toHaveLength(4);
  });
});

describe('customerSortFrom', () => {
  it('defaults to last activity and accepts only the known sorts', () => {
    expect(customerSortFrom(undefined)).toBe('recent');
    expect(customerSortFrom('name')).toBe('name');
    expect(customerSortFrom('spent')).toBe('spent');
    expect(customerSortFrom('created_by')).toBe('recent');
  });
});

describe('toCustomerMatch', () => {
  it('maps an overview row and counts as numbers', () => {
    expect(
      toCustomerMatch({
        id: 'c1',
        name: 'Achieng',
        phone: '0722333730',
        email: null,
        company: 'Otieno Homes',
        kra_pin: 'A123456789Z',
        quote_count: 3,
        last_activity_at: '2026-10-01T00:00:00Z',
      }),
    ).toEqual({
      id: 'c1',
      name: 'Achieng',
      phone: '0722333730',
      email: null,
      company: 'Otieno Homes',
      kraPin: 'A123456789Z',
      quoteCount: 3,
      lastActivityAt: '2026-10-01T00:00:00Z',
    });
  });
});

describe('customerFromEmbed', () => {
  const row = { id: 'c1', name: 'Achieng', phone: '0722333730', email: null, company: null, kra_pin: 'A123456789Z', deleted_at: null };

  it('reads an object or a one-row array the same way', () => {
    const expected = { id: 'c1', name: 'Achieng', phone: '0722333730', email: null, company: null, kraPin: 'A123456789Z' };
    expect(customerFromEmbed(row)).toEqual(expected);
    expect(customerFromEmbed([row])).toEqual(expected);
  });

  it('is null for no customer and for a soft deleted one', () => {
    expect(customerFromEmbed(null)).toBeNull();
    expect(customerFromEmbed([])).toBeNull();
    expect(customerFromEmbed({ ...row, deleted_at: '2026-10-06T00:00:00Z' })).toBeNull();
  });
});

describe('CLIENT_TYPE_LABEL', () => {
  it('names every client type', () => {
    expect(Object.keys(CLIENT_TYPE_LABEL)).toEqual(['homeowner', 'contractor', 'designer', 'developer', 'business', 'other']);
  });
});
