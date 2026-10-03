'use server';

import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import {
  dedupeCustomers,
  phoneKey,
  sanitizeCustomerTerm,
  type CustomerMatch,
  type CustomerQuoteRow,
} from '@/lib/customer-search';

/**
 * Find a returning customer by name, phone, email or company, from the
 * quotes this role can already read. RLS decides the row set (sales and the
 * admins read quotes; nobody else does), so nothing here re-checks a role
 * beyond the route gate.
 */
export async function searchCustomers(term: string): Promise<CustomerMatch[]> {
  await requirePath('/quotes');
  const q = sanitizeCustomerTerm(term);
  if (q.length < 2) return [];

  const filters = [
    `customer_name.ilike."%${q}%"`,
    `customer_email.ilike."%${q}%"`,
    `company.ilike."%${q}%"`,
  ];
  const digits = phoneKey(q);
  if (digits.length >= 3 && /^[\d\s+-]+$/.test(q)) filters.push(`customer_phone.ilike."%${digits}%"`);

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .select('customer_name, customer_phone, customer_email, company, created_at')
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('Customer search is not available right now.');

  return dedupeCustomers((data ?? []) as CustomerQuoteRow[]);
}
