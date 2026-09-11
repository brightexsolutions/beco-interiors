import type { QuoteSource, QuoteStatus } from '@beco/types';
import type { StatusTone } from '@beco/ui';
import { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

export type QuoteOwnerFilter = 'mine' | 'preparing' | 'unassigned' | 'all';

export interface QuoteListFilters {
  status?: QuoteStatus | undefined;
  owner?: QuoteOwnerFilter | undefined;
  source?: QuoteSource | undefined;
  search?: string | undefined;
}

export interface QuoteListItem {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  status: QuoteStatus;
  source: QuoteSource;
  createdAt: string;
  validUntil: string | null;
  requiresApproval: boolean;
  approvedAt: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  /** Sum of the lines' `line_total`, already VAT inclusive per D50: no
   *  further money math is needed to show a deal-size figure here, only the
   *  document's subtotal/VAT split needs the shared helper (M5, not built
   *  by this list). */
  value: number;
  /** Every line has a real unit_price. Mirrors 0.3: an unpriced quote shows
   *  "Pricing on application" rather than a misleading KES 0. */
  isPriced: boolean;
  itemCount: number;
}

/** The label and tone for a quote's lifecycle status, per StatusPill. */
export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: StatusTone }> = {
  new: { label: 'New', tone: 'neutral' },
  reviewing: { label: 'Reviewing', tone: 'neutral' },
  quoted: { label: 'Quoted', tone: 'positive' },
  won: { label: 'Won', tone: 'positive' },
  lost: { label: 'Lost', tone: 'muted' },
};

export const QUOTE_SOURCE_LABEL: Record<QuoteSource, string> = {
  web: 'Web',
  walk_in: 'Walk in',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
};

/** Africa/Nairobi is a fixed UTC+3 with no DST, so a formula is enough:
 *  no Intl formatter needed to get the boundary right, per the same
 *  Nairobi-explicit rule the stat cards use (`docs/REVIEW.md` 1.6). */
const nairobiToday = (now: Date): string => new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** 0.2: display only. `valid_until` is never written to by this. String
 *  comparison on YYYY-MM-DD, so there is no Date parsing ambiguity to get
 *  wrong across the test runner's own timezone. */
export const isExpired = (validUntil: string | null, status: QuoteStatus, now = new Date()): boolean => {
  if (!validUntil) return false;
  if (status === 'won' || status === 'lost') return false;
  return validUntil < nairobiToday(now);
};

/** PostgREST `.or()` uses `,` and `()` as its own syntax. Strip them from a
 *  search term so a customer name typed with a comma cannot reshape the
 *  filter instead of matching it. RLS is still the authority regardless. */
const sanitizeSearchTerm = (term: string): string => term.replace(/[,()]/g, '').trim();

interface QuoteRow {
  id: string;
  reference_number: string;
  customer_name: string;
  customer_phone: string;
  status: QuoteStatus;
  source: QuoteSource;
  created_at: string;
  valid_until: string | null;
  requires_approval: boolean;
  approved_at: string | null;
  created_by: string | null;
  assigned_to: string | null;
  assigned_user: { full_name: string } | { full_name: string }[] | null;
  created_user: { full_name: string } | { full_name: string }[] | null;
  quote_items: { unit_price: number; line_total: number }[];
}

const oneName = (v: QuoteRow['assigned_user']): string | null => {
  if (!v) return null;
  return Array.isArray(v) ? (v[0]?.full_name ?? null) : v.full_name;
};

const toListItem = (row: QuoteRow): QuoteListItem => {
  const items = row.quote_items ?? [];
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    validUntil: row.valid_until,
    requiresApproval: row.requires_approval,
    approvedAt: row.approved_at,
    assignedTo: row.assigned_to,
    assignedToName: oneName(row.assigned_user),
    createdBy: row.created_by,
    createdByName: oneName(row.created_user),
    value: items.reduce((sum, i) => sum + (i.line_total ?? 0), 0),
    isPriced: items.length > 0 && items.every((i) => i.unit_price > 0),
    itemCount: items.length,
  };
};

/**
 * The quotes list query. Role visibility is RLS's job (`quotes_read_staff`,
 * D87): this only narrows the row set a caller already has SELECT on, per
 * the `owner` filter, which is a usability layer per PRD section 4.2, not a
 * security one.
 */
export async function fetchQuotes(
  supabase: SupabaseClient,
  viewerId: string,
  filters: QuoteListFilters,
): Promise<QuoteListItem[]> {
  let query = supabase
    .from('quotes')
    .select(
      `id, reference_number, customer_name, customer_phone, status, source, created_at,
       valid_until, requires_approval, approved_at, created_by, assigned_to,
       assigned_user:users!quotes_assigned_to_fkey(full_name),
       created_user:users!quotes_created_by_fkey(full_name),
       quote_items(unit_price, line_total)`,
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.source) query = query.eq('source', filters.source);

  const term = filters.search ? sanitizeSearchTerm(filters.search) : '';
  if (term) {
    query = query.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,reference_number.ilike.%${term}%`,
    );
  }

  switch (filters.owner) {
    case 'mine':
      query = query.eq('assigned_to', viewerId);
      break;
    case 'preparing':
      query = query.eq('created_by', viewerId).is('assigned_to', null);
      break;
    case 'unassigned':
      query = query.is('created_by', null).is('assigned_to', null);
      break;
    case 'all':
    default:
      break;
  }

  const { data, error } = await query.overrideTypes<QuoteRow[]>();
  if (error) throw new Error(`Could not load quotes: ${error.message}`);
  return (data ?? []).map(toListItem);
}
