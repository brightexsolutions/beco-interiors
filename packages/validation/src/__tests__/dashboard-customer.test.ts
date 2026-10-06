import { describe, expect, it } from 'vitest';
import {
  createCustomerSchema,
  deleteCustomerSchema,
  linkQuoteCustomerSchema,
  updateCustomerSchema,
} from '../dashboard-customer';

const valid = {
  name: 'Wanjiku Kamau',
  phone: '0722 123 456',
  email: '',
  company: '',
  kraPin: '',
  location: '',
  clientType: '',
  notes: '',
};

const ID = '6f1c1b2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';

describe('createCustomerSchema', () => {
  it('needs only a name and a phone, and turns blank optionals into null', () => {
    const parsed = createCustomerSchema.parse(valid);
    expect(parsed).toEqual({
      name: 'Wanjiku Kamau',
      phone: '0722 123 456',
      email: null,
      company: null,
      kraPin: null,
      location: null,
      clientType: null,
      notes: null,
    });
  });

  it('stores the phone as typed, trimmed, once it is a valid Kenyan number', () => {
    expect(createCustomerSchema.parse({ ...valid, phone: ' +254 722 123 456 ' }).phone).toBe('+254 722 123 456');
    for (const phone of ['12345', '0822123456', '', '0722 123 45']) {
      expect(createCustomerSchema.safeParse({ ...valid, phone }).success, phone).toBe(false);
    }
  });

  it('uppercases and de-spaces a KRA PIN, and refuses the wrong shape', () => {
    expect(createCustomerSchema.parse({ ...valid, kraPin: ' a123 456 789z ' }).kraPin).toBe('A123456789Z');
    for (const kraPin of ['A12345678Z', '1123456789Z', 'A1234567890', 'AA23456789Z']) {
      expect(createCustomerSchema.safeParse({ ...valid, kraPin }).success, kraPin).toBe(false);
    }
  });

  it('refuses a short name, a bad email and an unknown client type', () => {
    expect(createCustomerSchema.safeParse({ ...valid, name: 'W' }).success).toBe(false);
    expect(createCustomerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(createCustomerSchema.safeParse({ ...valid, clientType: 'friend' }).success).toBe(false);
  });

  it('accepts every client type Beco named', () => {
    for (const clientType of ['homeowner', 'contractor', 'designer', 'developer', 'business', 'other']) {
      expect(createCustomerSchema.parse({ ...valid, clientType }).clientType).toBe(clientType);
    }
  });

  it('caps notes, company and location', () => {
    expect(createCustomerSchema.safeParse({ ...valid, notes: 'x'.repeat(4001) }).success).toBe(false);
    expect(createCustomerSchema.safeParse({ ...valid, company: 'x'.repeat(161) }).success).toBe(false);
    expect(createCustomerSchema.safeParse({ ...valid, location: 'x'.repeat(301) }).success).toBe(false);
  });
});

describe('updateCustomerSchema', () => {
  it('needs the record id and its lock token', () => {
    expect(updateCustomerSchema.safeParse({ ...valid, customerId: ID, updatedAt: '2026-10-06T10:00:00Z' }).success).toBe(true);
    expect(updateCustomerSchema.safeParse({ ...valid, customerId: 'nope', updatedAt: 'x' }).success).toBe(false);
    expect(updateCustomerSchema.safeParse({ ...valid, customerId: ID, updatedAt: '' }).success).toBe(false);
  });
});

describe('deleteCustomerSchema and linkQuoteCustomerSchema', () => {
  it('need real ids', () => {
    expect(deleteCustomerSchema.safeParse({ customerId: ID }).success).toBe(true);
    expect(deleteCustomerSchema.safeParse({ customerId: '' }).success).toBe(false);
    expect(linkQuoteCustomerSchema.safeParse({ quoteId: ID, updatedAt: 't', customerId: ID }).success).toBe(true);
    const missing = linkQuoteCustomerSchema.safeParse({ quoteId: ID, updatedAt: 't', customerId: '' });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.message).toBe('Pick a customer first');
  });
});
