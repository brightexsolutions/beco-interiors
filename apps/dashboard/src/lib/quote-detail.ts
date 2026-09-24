import { quoteTotals, type QuoteMoney } from '@beco/validation';
import type { QuoteSource, QuoteStatus } from '@beco/types';
import type { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

export interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  listPrice: number | null;
  lineTotal: number;
  productId: string | null;
  /** From the live product, if it still exists. Custom and deleted lines have none. */
  unit: string | null;
  removedFromCatalogue: boolean;
}

export interface QuoteAssignee {
  id: string;
  fullName: string;
}

export interface QuoteDocumentRow {
  id: string;
  createdAt: string;
  sentTo: string | null;
  sentAt: string | null;
  sentChannel: string | null;
  storagePath: string;
}

export interface QuoteDetail {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  company: string | null;
  projectType: string | null;
  fulfilment: string | null;
  deliveryAddress: string | null;
  /** Captured as intent on submission, never as a priced line: the
   *  salesperson prices delivery and installation separately, once they
   *  have seen the customer asked for either. See D101. */
  wantsInstallation: boolean;
  wantsSamples: boolean;
  timeline: string | null;
  budgetNote: string | null;
  projectDetails: string | null;
  source: QuoteSource;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  validUntil: string | null;
  reviewingAt: string | null;
  quotedAt: string | null;
  wonAt: string | null;
  lostAt: string | null;
  reopenedAt: string | null;
  finalizedAt: string | null;
  lostReason: string | null;
  requiresApproval: boolean;
  approvedAt: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  createdByName: string | null;
  approvedByName: string | null;
  convertedOrderId: string | null;
  convertedOrderReference: string | null;
  lines: QuoteLine[];
  totals: QuoteMoney;
  vatRate: number;
  documents: QuoteDocumentRow[];
}

export interface QuoteSettings {
  vatRate: number;
  validityDays: number;
  bankDetails: string;
  tillNumber: string;
  paybillNumber: string;
  paybillAccount: string;
  sendMoneyNumber: string;
  paymentTerms: string;
  footer: string;
  phone: string;
  whatsapp: string;
}

const settingText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

const settingNumber = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const oneRef = (v: unknown): string | null => {
  if (!v) return null;
  if (Array.isArray(v)) {
    const first = v[0] as { reference_number?: string } | undefined;
    return first?.reference_number ?? null;
  }
  return (v as { reference_number?: string }).reference_number ?? null;
};

export async function fetchQuoteSettings(supabase: SupabaseClient): Promise<QuoteSettings> {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'vat_rate',
      'quote_validity_days',
      'bank_details',
      'till_number',
      'paybill_number',
      'paybill_account',
      'send_money_number',
      'payment_terms',
      'quote_footer',
      'business_phone',
      'whatsapp_number',
    ]);

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    vatRate: settingNumber(map.get('vat_rate'), 0.16),
    validityDays: settingNumber(map.get('quote_validity_days'), 30),
    bankDetails: settingText(map.get('bank_details')),
    tillNumber: settingText(map.get('till_number')),
    paybillNumber: settingText(map.get('paybill_number')),
    paybillAccount: settingText(map.get('paybill_account')),
    sendMoneyNumber: settingText(map.get('send_money_number')),
    paymentTerms: settingText(map.get('payment_terms')),
    footer: settingText(map.get('quote_footer')),
    phone: settingText(map.get('business_phone')) || '+254 722 333 730',
    whatsapp: settingText(map.get('whatsapp_number')) || '254722333730',
  };
}

const oneName = (v: unknown): string | null => {
  if (!v) return null;
  if (Array.isArray(v)) {
    const first = v[0] as { full_name?: string } | undefined;
    return first?.full_name ?? null;
  }
  return (v as { full_name?: string }).full_name ?? null;
};

export async function fetchQuote(
  supabase: SupabaseClient,
  reference: string,
): Promise<QuoteDetail | null> {
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      `id, reference_number, customer_name, customer_phone, customer_email, company,
       project_type, fulfilment, delivery_address, wants_installation, wants_samples,
       timeline, budget_note, project_details,
       source, status, created_at, updated_at, valid_until, finalized_at, lost_reason,
       reviewing_at, quoted_at, won_at, lost_at, reopened_at,
       requires_approval, approved_at, assigned_to, converted_order_id,
       assigned_user:users!quotes_assigned_to_fkey(full_name),
       created_user:users!quotes_created_by_fkey(full_name),
       approved_user:users!quotes_approved_by_fkey(full_name),
       converted_order:orders!quotes_converted_order_fk(reference_number)`,
    )
    .eq('reference_number', reference)
    .maybeSingle();

  if (!quote) return null;

  const [{ data: items }, { data: documents }, settings] = await Promise.all([
    supabase
      .from('quote_items')
      .select('id, description, quantity, unit_price, list_price, line_total, product_id, products(unit)')
      .eq('quote_id', quote.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('documents')
      .select('id, created_at, sent_to, sent_at, sent_channel, storage_path')
      .eq('quote_id', quote.id)
      .eq('type', 'quote')
      .order('created_at', { ascending: false }),
    fetchQuoteSettings(supabase),
  ]);

  const lines: QuoteLine[] = (items ?? []).map((row) => {
    const product = row.products as { unit: string | null } | { unit: string | null }[] | null;
    const unit = Array.isArray(product) ? (product[0]?.unit ?? null) : (product?.unit ?? null);
    return {
      id: row.id,
      description: row.description,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      listPrice: row.list_price == null ? null : Number(row.list_price),
      lineTotal: Number(row.line_total ?? 0),
      productId: row.product_id,
      unit,
      removedFromCatalogue: row.product_id === null && row.list_price != null,
    };
  });

  return {
    id: quote.id,
    reference: quote.reference_number,
    customerName: quote.customer_name,
    customerPhone: quote.customer_phone,
    customerEmail: quote.customer_email,
    company: quote.company,
    projectType: quote.project_type,
    fulfilment: quote.fulfilment,
    deliveryAddress: quote.delivery_address,
    wantsInstallation: quote.wants_installation,
    wantsSamples: quote.wants_samples,
    timeline: quote.timeline,
    budgetNote: quote.budget_note,
    projectDetails: quote.project_details,
    source: quote.source as QuoteSource,
    status: quote.status as QuoteStatus,
    createdAt: quote.created_at,
    updatedAt: quote.updated_at,
    validUntil: quote.valid_until,
    reviewingAt: quote.reviewing_at,
    quotedAt: quote.quoted_at,
    wonAt: quote.won_at,
    lostAt: quote.lost_at,
    reopenedAt: quote.reopened_at,
    finalizedAt: quote.finalized_at,
    lostReason: quote.lost_reason,
    requiresApproval: quote.requires_approval,
    approvedAt: quote.approved_at,
    assignedTo: quote.assigned_to,
    assignedToName: oneName(quote.assigned_user),
    createdByName: oneName(quote.created_user),
    approvedByName: oneName(quote.approved_user),
    convertedOrderId: quote.converted_order_id,
    convertedOrderReference: oneRef(quote.converted_order),
    lines,
    totals: quoteTotals(
      lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
      settings.vatRate,
    ),
    vatRate: settings.vatRate,
    documents: (documents ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      sentTo: row.sent_to,
      sentAt: row.sent_at,
      sentChannel: row.sent_channel,
      storagePath: row.storage_path,
    })),
  };
}

export async function fetchAssignees(supabase: SupabaseClient): Promise<QuoteAssignee[]> {
  const { data } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('is_active', true)
    .in('role', ['beco_sales', 'beco_admin'])
    .order('full_name');
  return (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name }));
}
