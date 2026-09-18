import type { OrderStatus, PaymentStatus, QuoteSource } from '@beco/types';
import type { StatusTone } from '@beco/ui';
import { createServerClient } from '@beco/supabase-client';
import { QUOTE_SOURCE_LABEL } from './quotes';

type SupabaseClient = ReturnType<typeof createServerClient>;

export type OrderOwnerFilter = 'mine' | 'all';

export interface OrderListFilters {
  status?: OrderStatus | undefined;
  payment?: PaymentStatus | undefined;
  owner?: OrderOwnerFilter | undefined;
  source?: QuoteSource | undefined;
  search?: string | undefined;
}

export interface OrderListItem {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source: QuoteSource;
  createdAt: string;
  paidAt: string | null;
  salespersonId: string | null;
  salespersonName: string | null;
  quoteReference: string | null;
  value: number;
  isPriced: boolean;
  itemCount: number;
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  confirmed: { label: 'Confirmed', tone: 'positive' },
  fulfilled: { label: 'Fulfilled', tone: 'positive' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  unpaid: { label: 'Unpaid', tone: 'attention' },
  paid: { label: 'Paid', tone: 'positive' },
};

export { QUOTE_SOURCE_LABEL as ORDER_SOURCE_LABEL };

export type OrderMilestoneKind = 'datetime';

export interface OrderMilestone {
  label: string;
  at: string;
  kind: OrderMilestoneKind;
}

export function orderMilestones(input: {
  createdAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
}): OrderMilestone[] {
  const rows: OrderMilestone[] = [{ label: 'Raised', at: input.createdAt, kind: 'datetime' }];
  if (input.confirmedAt) rows.push({ label: 'Confirmed', at: input.confirmedAt, kind: 'datetime' });
  if (input.paidAt) rows.push({ label: 'Paid', at: input.paidAt, kind: 'datetime' });
  if (input.fulfilledAt) rows.push({ label: 'Fulfilled', at: input.fulfilledAt, kind: 'datetime' });
  if (input.cancelledAt) rows.push({ label: 'Cancelled', at: input.cancelledAt, kind: 'datetime' });
  return rows;
}

const sanitizeSearchTerm = (term: string): string => term.replace(/[,()]/g, '').trim();

interface OrderRow {
  id: string;
  reference_number: string;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  source: QuoteSource;
  created_at: string;
  paid_at: string | null;
  salesperson_id: string | null;
  salesperson: { full_name: string } | { full_name: string }[] | null;
  quote: { reference_number: string } | { reference_number: string }[] | null;
  order_items: { unit_price: number; line_total: number }[];
}

const oneName = (v: OrderRow['salesperson']): string | null => {
  if (!v) return null;
  return Array.isArray(v) ? (v[0]?.full_name ?? null) : v.full_name;
};

const oneRef = (v: OrderRow['quote']): string | null => {
  if (!v) return null;
  return Array.isArray(v) ? (v[0]?.reference_number ?? null) : v.reference_number;
};

const toListItem = (row: OrderRow): OrderListItem => {
  const items = row.order_items ?? [];
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    status: row.status,
    paymentStatus: row.payment_status,
    source: row.source,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    salespersonId: row.salesperson_id,
    salespersonName: oneName(row.salesperson),
    quoteReference: oneRef(row.quote),
    value: items.reduce((sum, item) => sum + (item.line_total ?? 0), 0),
    isPriced: items.length > 0 && items.every((item) => item.unit_price > 0),
    itemCount: items.length,
  };
};

export async function fetchOrders(
  supabase: SupabaseClient,
  viewerId: string,
  filters: OrderListFilters,
): Promise<OrderListItem[]> {
  let query = supabase
    .from('orders')
    .select(
      `id, reference_number, customer_name, customer_phone, status, payment_status, source,
       created_at, paid_at, salesperson_id,
       salesperson:users!orders_salesperson_id_fkey(full_name),
       quote:quotes!orders_quote_id_fkey(reference_number),
       order_items(unit_price, line_total)`,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.payment) query = query.eq('payment_status', filters.payment);
  if (filters.source) query = query.eq('source', filters.source);

  const term = filters.search ? sanitizeSearchTerm(filters.search) : '';
  if (term) {
    query = query.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,reference_number.ilike.%${term}%`,
    );
  }

  if (filters.owner === 'mine') query = query.eq('salesperson_id', viewerId);

  const { data, error } = await query.overrideTypes<OrderRow[]>();
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return (data ?? []).map(toListItem);
}
