import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackLink, StatusPill } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { QuoteActions } from '@/components/quote-actions';
import { QuoteDates } from '@/components/quote-dates';
import { QuoteDocumentPanel } from '@/components/quote-document-panel';
import { QuoteDraftFlushProvider } from '@/components/quote-draft-flush';
import { QuoteLines } from '@/components/quote-lines';
import { fetchAssignees, fetchQuote } from '@/lib/quote-detail';
import { QUOTE_SOURCE_LABEL, QUOTE_STATUS, isExpired } from '@/lib/quotes';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Quote',
  robots: { index: false, follow: false },
};

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

interface Params {
  reference: string;
}

export default async function QuoteDetailPage({ params }: { params: Promise<Params> }) {
  const user = await requirePath('/quotes');
  const { reference } = await params;
  const decoded = decodeURIComponent(reference);

  const supabase = await getSupabase();
  const quote = await fetchQuote(supabase, decoded);
  if (!quote) notFound();

  const isAdmin = user.role === 'beco_admin' || user.role === 'brightex_admin';
  const canMutate = isAdmin || quote.assignedTo === user.userId;
  const canClaim = quote.assignedTo === null;
  const canAssign = isAdmin;
  const canApprove = isAdmin && quote.requiresApproval && !quote.approvedAt;
  const expired = isExpired(quote.validUntil, quote.status);
  const statusMeta = QUOTE_STATUS[quote.status];
  const totals = quote.totals;
  const assignees = canAssign ? await fetchAssignees(supabase) : [];

  return (
    <QuoteDraftFlushProvider>
      <BackLink href="/quotes" className="mb-2">
        Quotes
      </BackLink>
      <PageHeading
        eyebrow={QUOTE_SOURCE_LABEL[quote.source]}
        title={quote.reference}
        lede={`${quote.customerName} · ${quote.customerPhone}`}
        actions={
          <QuoteDocumentPanel
            quoteId={quote.id}
            updatedAt={quote.updatedAt}
            reference={quote.reference}
            customerEmail={quote.customerEmail}
            canMutate={canMutate}
          />
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
        {quote.requiresApproval && !quote.approvedAt ? (
          <StatusPill label="Needs approval" tone="attention" />
        ) : null}
        {quote.approvedAt ? (
          <StatusPill label={`Approved by ${quote.approvedByName ?? 'admin'}`} tone="positive" />
        ) : null}
        {expired ? <StatusPill label="Expired" tone="muted" /> : null}
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <QuoteLines
            lines={quote.lines}
            quoteId={quote.id}
            updatedAt={quote.updatedAt}
            canMutate={canMutate}
          />

          <div className="mt-4 flex justify-end">
            {totals.isPriced ? (
              <div className="text-right font-ui">
                <p className="text-sm text-neutral-500">Subtotal {money(totals.net)}</p>
                <p className="text-sm text-neutral-500">VAT included {money(totals.vat)}</p>
                <p className="text-lg font-semibold text-charcoal">Total {money(totals.gross)}</p>
              </div>
            ) : (
              <p className="font-ui text-base text-neutral-500">Pricing on application</p>
            )}
          </div>

          {quote.projectDetails ? (
            <div className="mt-8">
              <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Project details
              </h2>
              <p className="mt-2 max-w-[68ch] font-ui text-base text-neutral-700">{quote.projectDetails}</p>
            </div>
          ) : null}

          {quote.status === 'lost' && quote.lostReason ? (
            <div className="mt-8">
              <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Lost reason
              </h2>
              <p className="mt-2 font-ui text-base text-neutral-700">{quote.lostReason}</p>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4 border-t border-neutral-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Actions
            </h2>
            <div className="mt-2">
              <QuoteActions
                quoteId={quote.id}
                updatedAt={quote.updatedAt}
                reference={quote.reference}
                status={quote.status}
                assignedTo={quote.assignedTo}
                assignedToName={quote.assignedToName}
                requiresApproval={quote.requiresApproval}
                approvedAt={quote.approvedAt}
                canClaim={canClaim}
                canMutate={canMutate}
                canAssign={canAssign}
                canApprove={canApprove}
                expired={expired}
                assignees={assignees}
                convertedOrderReference={quote.convertedOrderReference}
              />
            </div>
          </div>

          <div>
            <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Customer
            </h2>
            <dl className="mt-2 space-y-1 break-words font-ui text-sm text-charcoal">
              <div>{quote.customerName}</div>
              <div>
                <a className="text-neutral-500 underline-offset-2 hover:underline" href={`tel:${quote.customerPhone}`}>
                  {quote.customerPhone}
                </a>
              </div>
              {quote.customerEmail ? <div className="text-neutral-500">{quote.customerEmail}</div> : null}
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
                <span className="text-charcoal">{quote.assignedToName ?? 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-neutral-500">Prepared by: </span>
                <span className="text-charcoal">{quote.createdByName ?? 'Website submission'}</span>
              </div>
            </dl>
          </div>

          <QuoteDates
            createdAt={quote.createdAt}
            reviewingAt={quote.reviewingAt}
            quotedAt={quote.quotedAt}
            approvedAt={quote.approvedAt}
            wonAt={quote.wonAt}
            lostAt={quote.lostAt}
            reopenedAt={quote.reopenedAt}
            validUntil={quote.validUntil}
          />
        </aside>
      </div>
    </QuoteDraftFlushProvider>
  );
}
