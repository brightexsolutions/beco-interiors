import { quoteTotals, type QuoteMoney } from '@beco/validation';
import type { OrderStatus, PaymentStatus, QuoteSource } from '@beco/types';
import type { createServerClient } from '@beco/supabase-client';
import { fetchQuoteSettings, type QuoteSettings } from './quote-detail';

type SupabaseClient = ReturnType<typeof createServerClient>;

export interface OrderLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  listPrice: number | null;
  lineTotal: number;
  productId: string | null;
}

export interface OrderDetail {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fulfilment: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  source: QuoteSource;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  confirmedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  salespersonId: string | null;
  salespersonName: string | null;
  createdByName: string | null;
  quoteId: string | null;
  quoteReference: string | null;
  lines: OrderLine[];
  totals: QuoteMoney;
}

export async function fetchOrder(
  supabase: SupabaseClient,
  reference: string,
): Promise<OrderDetail | null> {
  const { data: order } = await supabase
    .from('orders')
    .select(
      `id, reference_number, customer_name, customer_phone, customer_email,
       fulfilment, delivery_address, notes, source, status, payment_status,
       created_at, updated_at, paid_at, confirmed_at, fulfilled_at, cancelled_at,
       salesperson_id, quote_id,
       salesperson:users!orders_salesperson_id_fkey(full_name),
       created_user:users!orders_created_by_fkey(full_name),
       quote:quotes!orders_quote_id_fkey(reference_number)`,
    )
    .eq('reference_number', reference)
    .is('deleted_at', null)
    .maybeSingle();

  if (!order) return null;

  const [{ data: items }, settings] = await Promise.all([
    supabase
      .from('order_items')
      .select('id, description, quantity, unit_price, list_price, line_total, product_id')
      .eq('order_id', order.id)
      .order('sort_order', { ascending: true }),
    fetchQuoteSettings(supabase),
  ]);

  const oneName = (v: unknown): string | null => {
    if (!v) return null;
    if (Array.isArray(v)) {
      const first = v[0] as { full_name?: string } | undefined;
      return first?.full_name ?? null;
    }
    return (v as { full_name?: string }).full_name ?? null;
  };

  const oneRef = (v: unknown): string | null => {
    if (!v) return null;
    if (Array.isArray(v)) {
      const first = v[0] as { reference_number?: string } | undefined;
      return first?.reference_number ?? null;
    }
    return (v as { reference_number?: string }).reference_number ?? null;
  };

  const lines: OrderLine[] = (items ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    listPrice: row.list_price == null ? null : Number(row.list_price),
    lineTotal: Number(row.line_total ?? 0),
    productId: row.product_id,
  }));

  return {
    id: order.id,
    reference: order.reference_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    fulfilment: order.fulfilment,
    deliveryAddress: order.delivery_address,
    notes: order.notes,
    source: order.source as QuoteSource,
    status: order.status as OrderStatus,
    paymentStatus: order.payment_status as PaymentStatus,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    paidAt: order.paid_at,
    confirmedAt: order.confirmed_at,
    fulfilledAt: order.fulfilled_at,
    cancelledAt: order.cancelled_at,
    salespersonId: order.salesperson_id,
    salespersonName: oneName(order.salesperson),
    createdByName: oneName(order.created_user),
    quoteId: order.quote_id,
    quoteReference: oneRef(order.quote),
    lines,
    totals: quoteTotals(
      lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
      settings.vatRate,
    ),
  };
}

export type { QuoteSettings };
