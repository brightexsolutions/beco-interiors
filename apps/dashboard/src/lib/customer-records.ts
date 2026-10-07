import type { ClientType, OrderStatus, PaymentStatus, QuoteStatus } from '@beco/types';
import type { createServerClient } from '@beco/supabase-client';
import type { CustomerFields } from '@beco/validation';
import {
  CUSTOMER_SORTS,
  customerSearchFilter,
  phoneKey,
  toCustomerMatch,
  type CustomerMatch,
  type CustomerSort,
  type CustomerSummary,
} from './customer-search';

/**
 * The customer record's reads and writes, D130. Every function takes the
 * caller's own Supabase client, so RLS decides what each role may do: these
 * never use the service role. The server actions in
 * `app/(app)/customers/actions.ts` gate the route and validate the input,
 * then call these; the integration tests call these directly as each role.
 */

type SupabaseClient = ReturnType<typeof createServerClient>;

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  kraPin: string | null;
  clientType: ClientType | null;
  quoteCount: number;
  orderCount: number;
  /** VAT inclusive total of orders that are not cancelled. */
  totalSpent: number;
  lastActivityAt: string;
}

export interface CustomerListFilters {
  search?: string | undefined;
  clientType?: ClientType | undefined;
  sort?: CustomerSort | undefined;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  kraPin: string | null;
  location: string | null;
  clientType: ClientType | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface CustomerQuoteRow {
  id: string;
  reference: string;
  status: QuoteStatus;
  createdAt: string;
  total: number;
}

export interface CustomerOrderRow {
  id: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  total: number;
}

export interface CustomerHistory {
  quotes: CustomerQuoteRow[];
  orders: CustomerOrderRow[];
  /** Orders that are not cancelled, VAT inclusive. */
  ordered: number;
  /** Of those, the ones marked paid. */
  paid: number;
}

/** The most rows a list or a picker loads. The list paginates within it. */
export const CUSTOMER_LIST_LIMIT = 500;

const OVERVIEW_COLUMNS =
  'id, name, phone, email, company, kra_pin, client_type, quote_count, order_count, total_spent, last_activity_at';

export async function fetchCustomers(
  supabase: SupabaseClient,
  filters: CustomerListFilters = {},
): Promise<CustomerListItem[]> {
  const sort = CUSTOMER_SORTS[filters.sort ?? 'recent'];
  let query = supabase.from('customer_overview').select(OVERVIEW_COLUMNS);
  const filter = filters.search ? customerSearchFilter(filters.search) : null;
  if (filter) query = query.or(filter);
  if (filters.clientType) query = query.eq('client_type', filters.clientType);
  const { data, error } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(CUSTOMER_LIST_LIMIT);
  if (error) throw new Error(`Could not load customers: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id ?? '',
    name: row.name ?? '',
    phone: row.phone ?? '',
    email: row.email,
    company: row.company,
    kraPin: row.kra_pin,
    clientType: row.client_type,
    quoteCount: Number(row.quote_count ?? 0),
    orderCount: Number(row.order_count ?? 0),
    totalSpent: Number(row.total_spent ?? 0),
    lastActivityAt: row.last_activity_at ?? '',
  }));
}

/** The picker on the new quote form and the quote page: up to eight matches. */
export async function searchCustomerRecords(supabase: SupabaseClient, term: string): Promise<CustomerMatch[]> {
  const filter = customerSearchFilter(term);
  if (!filter) return [];
  const { data, error } = await supabase
    .from('customer_overview')
    .select('id, name, phone, email, company, kra_pin, quote_count, last_activity_at')
    .or(filter)
    .order('last_activity_at', { ascending: false })
    .limit(8);
  if (error) throw new Error('Customer search is not available right now.');
  return (data ?? []).map(toCustomerMatch);
}

const toRecord = (row: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  kra_pin: string | null;
  location: string | null;
  client_type: ClientType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}): CustomerRecord => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  company: row.company,
  kraPin: row.kra_pin,
  location: row.location,
  clientType: row.client_type,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

const RECORD_COLUMNS =
  'id, name, phone, email, company, kra_pin, location, client_type, notes, created_at, updated_at, created_by';

/** A live customer by id. Null when there is none, or it was soft deleted. */
export async function fetchCustomer(supabase: SupabaseClient, id: string): Promise<CustomerRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from('customers')
    .select(RECORD_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  return data ? toRecord(data) : null;
}

/** The live customer holding this number, in any format, if there is one. */
export async function findCustomerByPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<CustomerSummary | null> {
  const key = phoneKey(phone) || phone.trim();
  if (!key) return null;
  const { data } = await supabase
    .from('customers')
    .select('id, name, phone, email, company, kra_pin')
    .eq('phone_key', key)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    company: data.company,
    kraPin: data.kra_pin,
  };
}

/** Quotes and orders for one customer, newest first, as RLS lets this role see them. */
export async function fetchCustomerHistory(supabase: SupabaseClient, customerId: string): Promise<CustomerHistory> {
  const [{ data: quotes }, { data: orders }] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, reference_number, status, created_at, total_amount')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('orders')
      .select('id, reference_number, status, payment_status, created_at, total_amount')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  const orderRows: CustomerOrderRow[] = (orders ?? []).map((row) => ({
    id: row.id,
    reference: row.reference_number,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    total: Number(row.total_amount ?? 0),
  }));
  const live = orderRows.filter((row) => row.status !== 'cancelled');
  return {
    quotes: (quotes ?? []).map((row) => ({
      id: row.id,
      reference: row.reference_number,
      status: row.status,
      createdAt: row.created_at,
      total: Number(row.total_amount ?? 0),
    })),
    orders: orderRows,
    ordered: live.reduce((sum, row) => sum + row.total, 0),
    paid: live.filter((row) => row.paymentStatus === 'paid').reduce((sum, row) => sum + row.total, 0),
  };
}

export type CustomerWriteResult =
  | { ok: true; id: string; updatedAt: string }
  | { ok: false; reason: 'duplicate'; existing: CustomerSummary | null }
  | { ok: false; reason: 'stale' }
  | { ok: false; reason: 'error'; message: string };

const columnsFrom = (fields: CustomerFields) => ({
  name: fields.name,
  phone: fields.phone,
  email: fields.email,
  company: fields.company,
  kra_pin: fields.kraPin,
  location: fields.location,
  client_type: fields.clientType,
  notes: fields.notes,
});

/**
 * Creates a customer as `userId`. A number that already belongs to a live
 * customer is not an error to show raw: it comes back as `duplicate` with
 * that customer, so the screen can send the user there instead.
 */
export async function insertCustomer(
  supabase: SupabaseClient,
  userId: string,
  fields: CustomerFields,
): Promise<CustomerWriteResult> {
  const existing = await findCustomerByPhone(supabase, fields.phone);
  if (existing) return { ok: false, reason: 'duplicate', existing };

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...columnsFrom(fields), created_by: userId })
    .select('id, updated_at')
    .single();
  if (error || !data) {
    if (error?.code === '23505') {
      return { ok: false, reason: 'duplicate', existing: await findCustomerByPhone(supabase, fields.phone) };
    }
    return { ok: false, reason: 'error', message: error?.message ?? 'The database refused that write.' };
  }
  return { ok: true, id: data.id, updatedAt: data.updated_at };
}

/**
 * Saves a customer's details under the optimistic lock: the row is written
 * only if its `updated_at` is still the one the form was opened with.
 * Nothing written means stale, unless the row is gone or not this role's to
 * edit, which the caller has already ruled out by reading it.
 */
export async function updateCustomerRecord(
  supabase: SupabaseClient,
  customerId: string,
  expectedUpdatedAt: string,
  fields: CustomerFields,
): Promise<CustomerWriteResult> {
  const existing = await findCustomerByPhone(supabase, fields.phone);
  if (existing && existing.id !== customerId) return { ok: false, reason: 'duplicate', existing };

  const { data, error } = await supabase
    .from('customers')
    .update(columnsFrom(fields))
    .eq('id', customerId)
    .eq('updated_at', expectedUpdatedAt)
    .is('deleted_at', null)
    .select('id, updated_at');
  if (error) {
    if (error.code === '23505') {
      return { ok: false, reason: 'duplicate', existing: await findCustomerByPhone(supabase, fields.phone) };
    }
    return { ok: false, reason: 'error', message: error.message };
  }
  const row = data?.[0];
  if (!row) return { ok: false, reason: 'stale' };
  return { ok: true, id: row.id, updatedAt: row.updated_at };
}

/** Soft delete: sets `deleted_at`. RLS lets only an admin write it. */
export async function softDeleteCustomer(
  supabase: SupabaseClient,
  customerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', customerId)
    .is('deleted_at', null)
    .select('id');
  if (error) return { ok: false, message: error.code === '42501' ? 'Only an admin can delete a customer.' : error.message };
  if (!data || data.length === 0) return { ok: false, message: 'That customer is no longer here.' };
  return { ok: true };
}

/** Points a quote, and the order it became, at a customer. The quote's own snapshot does not change. */
export async function linkQuoteToCustomer(
  supabase: SupabaseClient,
  quoteId: string,
  customerId: string,
  expectedUpdatedAt: string,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const { error } = await supabase.rpc('link_quote_customer', {
    p_quote_id: quoteId,
    p_customer_id: customerId,
    p_expected_updated_at: expectedUpdatedAt,
  });
  return { error };
}
