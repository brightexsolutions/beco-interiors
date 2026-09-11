import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatusPill } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { QUOTE_SOURCE_LABEL, QUOTE_STATUS, isExpired } from '@/lib/quotes';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Quote',
  robots: { index: false, follow: false },
};

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' });

interface Params {
  reference: string;
}

/**
 * Read only for now: every field a salesperson or admin needs to see, per
 * `quotes_read_staff` (D87), which already lets both roles read any quote.
 * Claiming, assigning, price overrides, status changes, the Approve action
 * and the document all land in the next pass; this is the "View" a row's
 * action actually goes to, not a placeholder.
 */
export default async function QuoteDetailPage({ params }: { params: Promise<Params> }) {
  await requirePath('/quotes');
  const { reference } = await params;

  const supabase = await getSupabase();
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      `id, reference_number, customer_name, customer_phone, customer_email, company,
       project_type, fulfilment, delivery_address, timeline, budget_note, project_details,
       source, status, created_at, updated_at, valid_until, finalized_at, lost_reason,
       requires_approval, approved_at,
       assigned_user:users!quotes_assigned_to_fkey(full_name),
       created_user:users!quotes_created_by_fkey(full_name),
       approved_user:users!quotes_approved_by_fkey(full_name)`,
    )
    .eq('reference_number', decodeURIComponent(reference))
    .maybeSingle()
    .overrideTypes<{
      id: string;
      reference_number: string;
      customer_name: string;
      customer_phone: string;
      customer_email: string | null;
      company: string | null;
      project_type: string | null;
      fulfilment: string | null;
      delivery_address: string | null;
      timeline: string | null;
      budget_note: string | null;
      project_details: string | null;
      source: 'web' | 'walk_in' | 'phone' | 'whatsapp';
      status: 'new' | 'reviewing' | 'quoted' | 'won' | 'lost';
      created_at: string;
      updated_at: string;
      valid_until: string | null;
      finalized_at: string | null;
      lost_reason: string | null;
      requires_approval: boolean;
      approved_at: string | null;
      assigned_user: { full_name: string } | { full_name: string }[] | null;
      created_user: { full_name: string } | { full_name: string }[] | null;
      approved_user: { full_name: string } | { full_name: string }[] | null;
    }>();

  if (!quote) notFound();

  const { data: items } = await supabase
    .from('quote_items')
    .select('id, description, quantity, unit_price, list_price, line_total, product_id')
    .eq('quote_id', quote.id)
    .order('sort_order', { ascending: true });

  const lines = items ?? [];
  const isPriced = lines.length > 0 && lines.every((i) => i.unit_price > 0);
  const total = lines.reduce((sum, i) => sum + (i.line_total ?? 0), 0);
  const name = (v: { full_name: string } | { full_name: string }[] | null) =>
    (Array.isArray(v) ? v[0]?.full_name : v?.full_name) ?? null;
  const assignedToName = name(quote.assigned_user);
  const createdByName = name(quote.created_user);
  const approvedByName = name(quote.approved_user);
  const expired = isExpired(quote.valid_until, quote.status);
  const statusMeta = QUOTE_STATUS[quote.status];

  return (
    <>
      <PageHeading
        eyebrow={QUOTE_SOURCE_LABEL[quote.source]}
        title={quote.reference_number}
        lede={`${quote.customer_name} · ${quote.customer_phone}`}
      />

      <div className="mb-6 flex flex-wrap gap-1.5">
        <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
        {quote.requires_approval && !quote.approved_at ? <StatusPill label="Needs approval" tone="attention" /> : null}
        {quote.approved_at ? <StatusPill label={`Approved by ${approvedByName ?? 'admin'}`} tone="positive" /> : null}
        {expired ? <StatusPill label="Expired" tone="muted" /> : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Line items
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-sm text-neutral-500">
                  <th scope="col" className="py-2 pr-4 font-semibold">Item</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Qty</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Unit price</th>
                  <th scope="col" className="py-2 text-right font-semibold">Line total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const discounted = line.list_price != null && line.unit_price !== line.list_price;
                  return (
                    <tr key={line.id} className="border-b border-neutral-100 text-sm">
                      <td className="py-3 pr-4 text-charcoal">
                        {line.description}
                        {line.product_id === null ? (
                          <span className="ml-2 text-xs text-neutral-500">(custom)</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-charcoal">{line.quantity}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-charcoal">
                        {line.unit_price > 0 ? money(line.unit_price) : '—'}
                        {discounted ? (
                          <span className="ml-2 text-xs text-neutral-500 line-through">{money(line.list_price!)}</span>
                        ) : null}
                      </td>
                      <td className="py-3 text-right tabular-nums text-charcoal">
                        {line.unit_price > 0 ? money(line.line_total ?? 0) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            {isPriced ? (
              <p className="font-ui text-lg font-semibold text-charcoal">Total {money(total)}</p>
            ) : (
              <p className="font-ui text-base text-neutral-500">Pricing on application</p>
            )}
          </div>

          {quote.project_details ? (
            <div className="mt-8">
              <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Project details
              </h2>
              <p className="mt-2 max-w-[68ch] font-ui text-base text-neutral-700">{quote.project_details}</p>
            </div>
          ) : null}

          {quote.status === 'lost' && quote.lost_reason ? (
            <div className="mt-8">
              <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Lost reason
              </h2>
              <p className="mt-2 font-ui text-base text-neutral-700">{quote.lost_reason}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Customer
            </h2>
            <dl className="mt-2 space-y-1 font-ui text-sm text-charcoal">
              <div>{quote.customer_name}</div>
              <div className="text-neutral-500">{quote.customer_phone}</div>
              {quote.customer_email ? <div className="text-neutral-500">{quote.customer_email}</div> : null}
              {quote.company ? <div className="text-neutral-500">{quote.company}</div> : null}
            </dl>
          </div>

          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Ownership
            </h2>
            <dl className="mt-2 space-y-1 font-ui text-sm">
              <div>
                <span className="text-neutral-500">Assigned to: </span>
                <span className="text-charcoal">{assignedToName ?? 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-neutral-500">Prepared by: </span>
                <span className="text-charcoal">{createdByName ?? 'Web submission'}</span>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Dates
            </h2>
            <dl className="mt-2 space-y-1 font-ui text-sm">
              <div>
                <span className="text-neutral-500">Raised: </span>
                <span className="text-charcoal">{formatDateTime(quote.created_at)}</span>
              </div>
              {quote.valid_until ? (
                <div>
                  <span className="text-neutral-500">Valid until: </span>
                  <span className="text-charcoal">{quote.valid_until}</span>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
