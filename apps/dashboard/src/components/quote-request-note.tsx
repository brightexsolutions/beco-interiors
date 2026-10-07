import { requestChanges, type QuoteRequest } from '@/lib/quote-request';

const qty = (n: number) => new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 }).format(n);

const day = (iso: string) =>
  new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(iso));

/**
 * What the customer asked for on the website, against what the quote says
 * now (D131). Drawn only when something differs, so an untouched web quote
 * carries no note. Read from quotes.requested_items, which nobody can edit.
 */
export function QuoteRequestNote({
  request,
  lines,
}: {
  request: QuoteRequest | null;
  lines: { id: string; description: string; code: string | null; quantity: number }[];
}) {
  const changes = requestChanges(request, lines);
  if (!request || changes.length === 0) return null;

  const heading =
    request.source === 'submission' || !request.at
      ? "Changed since the customer's request"
      : `Changed since ${day(request.at)}`;

  return (
    <section
      aria-labelledby="request-changes-heading"
      className="mt-3 border-l-2 border-neutral-300 bg-neutral-50 px-4 py-3 font-ui"
    >
      <h3 id="request-changes-heading" className="text-sm font-semibold text-charcoal">
        {heading}
      </h3>
      {request.source === 'backfill' ? (
        <p className="mt-0.5 text-sm text-neutral-500">Earlier edits were not recorded.</p>
      ) : null}
      <ul className="mt-1.5 space-y-0.5 text-sm text-neutral-700">
        {changes.map((change, i) => (
          <li key={`${change.kind}-${i}`} className="break-words">
            {change.kind === 'removed' ? (
              <>
                <span className="font-semibold">Removed</span> {change.description}
                {change.code ? ` (${change.code})` : ''}, {qty(change.quantity)} asked
              </>
            ) : change.kind === 'quantity' ? (
              <>
                <span className="font-semibold">Quantity</span> {change.description}
                {change.code ? ` (${change.code})` : ''}, {qty(change.from)} asked, now{' '}
                <span className="tabular-nums">{qty(change.to)}</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Added</span> {change.description}
                {change.code ? ` (${change.code})` : ''}, {qty(change.quantity)}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
