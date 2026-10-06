import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackLink, StatusPill } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { CustomerContact } from '@/components/customer-contact';
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
            customerPhone={quote.customerPhone}
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

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[auto_1fr] xl:gap-y-0">
        {/* What someone acts on, first on a phone: status actions and the
            one-tap ways to reach the customer come before the line editor.
            On desktop it is the top of the right hand rail. */}
        <aside className="min-w-0 space-y-4 border-b border-neutral-200 pb-6 xl:col-start-2 xl:row-start-1 xl:border-b-0 xl:border-l xl:pb-0 xl:pl-8">
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
              <div className="text-base font-semibold">{quote.customerName}</div>
              <div className="tabular-nums text-neutral-500">{quote.customerPhone}</div>
              {quote.customerEmail ? <div className="text-neutral-500">{quote.customerEmail}</div> : null}
              {quote.company ? <div className="text-neutral-500">{quote.company}</div> : null}
            </dl>
            {/* One tap to the person, the counter's most common next move. */}
            <div className="mt-3">
              <CustomerContact phone={quote.customerPhone} email={quote.customerEmail} reference={quote.reference} kind="quote" />
            </div>
          </div>

          {quote.fulfilment === 'delivery' || quote.wantsInstallation || quote.wantsSamples ? (
            <div>
              <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Requested
              </h2>
              {/* Captured on submission, priced separately: these are not
                  quote lines, so nothing here totals into the quote's own
                  price. Delivery and installation get the attention tone,
                  Warm Red, because each is a real pricing gap someone has
                  to close with its own custom line before the quote is
                  complete; samples is informational, not a pricing gap, so
                  it stays muted rather than spending the same red. */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quote.fulfilment === 'delivery' ? <StatusPill label="Delivery" tone="attention" /> : null}
                {quote.wantsInstallation ? <StatusPill label="Installation" tone="attention" /> : null}
                {quote.wantsSamples ? <StatusPill label="Samples" tone="muted" /> : null}
              </div>
              {quote.fulfilment === 'delivery' && quote.deliveryAddress ? (
                <p className="mt-2 font-ui text-sm text-neutral-500">{quote.deliveryAddress}</p>
              ) : null}
            </div>
          ) : null}

        </aside>
        <div className="min-w-0 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <QuoteLines
            lines={quote.lines}
            quoteId={quote.id}
            updatedAt={quote.updatedAt}
            canMutate={canMutate}
          />

          <div className="mt-6 flex justify-end">
            <dl className="w-full border border-neutral-200 border-l-4 border-l-charcoal bg-neutral-50 px-5 py-4 font-ui sm:max-w-sm">
              {totals.isPriced ? (
                <>
                  <div className="flex items-baseline justify-between gap-4 text-sm text-neutral-500">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{money(totals.net)}</dd>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-4 text-sm text-neutral-500">
                    <dt>VAT {Math.round(quote.vatRate * 100)}%, included</dt>
                    <dd className="tabular-nums">{money(totals.vat)}</dd>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-neutral-200 pt-3">
                    <dt className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">Total</dt>
                    <dd className="font-display text-2xl leading-none tabular-nums text-charcoal sm:text-3xl">{money(totals.gross)}</dd>
                  </div>
                </>
              ) : (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">Total</dt>
                  <dd className="text-base text-neutral-700">Pricing on application</dd>
                </div>
              )}
            </dl>
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

        <aside className="min-w-0 space-y-4 border-t border-neutral-200 pt-6 xl:col-start-2 xl:row-start-2 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-6">          <div>
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
