'use server';

import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { searchCustomerRecords } from '@/lib/customer-records';
import type { CustomerMatch } from '@/lib/customer-search';

/**
 * Find a customer record by name, phone, company, email or KRA PIN, for the
 * picker on the new quote form and on a quote's page (D130). Gated on the
 * Quotes route, since only the roles that raise quotes pick a customer for
 * one; RLS on `customers` is still the authority over the rows.
 */
export async function searchCustomers(term: string): Promise<CustomerMatch[]> {
  await requirePath('/quotes');
  const supabase = await getSupabase();
  return searchCustomerRecords(supabase, term);
}
