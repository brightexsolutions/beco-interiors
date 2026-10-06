import type { ClientType } from '@beco/types';

/**
 * Pure helpers for finding a customer record (D130). Until migration 64 a
 * returning customer was inferred from earlier quotes sharing a phone
 * number; now there is a `customers` table, and these build the search it
 * answers. No database access here, so every rule is unit tested.
 */

/** What a quote needs to know about the customer it is raised for. */
export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  kraPin: string | null;
}

/** One customer as the picker shows it, from `customer_overview`. */
export interface CustomerMatch extends CustomerSummary {
  quoteCount: number;
  lastActivityAt: string;
}

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  homeowner: 'Homeowner',
  contractor: 'Contractor',
  designer: 'Designer',
  developer: 'Developer',
  business: 'Business',
  other: 'Other',
};

/** The national part of a Kenyan number, so 0722..., +254722... and 254722... are one person.
 *  The same rule as `customer_phone_key()` in migration 64, which keys the table. */
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
 * The PostgREST `or` filter for a search term: name, company, email and KRA
 * PIN by text, and the phone key when the term looks like a number, so
 * "0722 333" finds +254722333730. Null when the term is too short to search.
 */
export const customerSearchFilter = (term: string): string | null => {
  const q = sanitizeCustomerTerm(term);
  if (q.length < 2) return null;
  const filters = [
    `name.ilike."%${q}%"`,
    `company.ilike."%${q}%"`,
    `email.ilike."%${q}%"`,
    `kra_pin.ilike."%${q.replace(/\s+/g, '')}%"`,
  ];
  const digits = phoneKey(q);
  if (digits.length >= 3 && /^[\d\s+-]+$/.test(q)) filters.push(`phone_key.ilike."%${digits}%"`);
  return filters.join(',');
};

export type CustomerSort = 'recent' | 'name' | 'spent';

export const CUSTOMER_SORTS: Record<CustomerSort, { column: string; ascending: boolean; label: string }> = {
  recent: { column: 'last_activity_at', ascending: false, label: 'Last activity' },
  name: { column: 'name', ascending: true, label: 'Name' },
  spent: { column: 'total_spent', ascending: false, label: 'Total spent' },
};

export const customerSortFrom = (value: string | undefined): CustomerSort =>
  value === 'name' || value === 'spent' ? value : 'recent';

export interface OverviewRow {
  id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  kra_pin: string | null;
  quote_count: number | null;
  last_activity_at: string | null;
}

interface EmbeddedCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  kra_pin: string | null;
  deleted_at?: string | null;
}

/**
 * A customer embedded on a quote or order through its foreign key, as
 * PostgREST returns it: an object, a one-row array, or null. A soft deleted
 * record, which an admin can still read, counts as no customer: its page no
 * longer opens and it cannot be picked.
 */
export const customerFromEmbed = (value: unknown): CustomerSummary | null => {
  const row = (Array.isArray(value) ? value[0] : value) as EmbeddedCustomer | null | undefined;
  if (!row || row.deleted_at) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    kraPin: row.kra_pin,
  };
};

export const toCustomerMatch = (row: OverviewRow): CustomerMatch => ({
  id: row.id ?? '',
  name: row.name ?? '',
  phone: row.phone ?? '',
  email: row.email,
  company: row.company,
  kraPin: row.kra_pin,
  quoteCount: Number(row.quote_count ?? 0),
  lastActivityAt: row.last_activity_at ?? '',
});
