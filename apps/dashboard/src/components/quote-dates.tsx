import { quoteMilestones, type QuoteMilestone } from '@/lib/quotes';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' });

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00+03:00`).toLocaleDateString('en-KE', {
    dateStyle: 'medium',
    timeZone: 'Africa/Nairobi',
  });

const display = (row: QuoteMilestone) => (row.kind === 'date' ? formatDate(row.at) : formatDateTime(row.at));

export function QuoteDates({
  createdAt,
  reviewingAt,
  quotedAt,
  approvedAt,
  wonAt,
  lostAt,
  reopenedAt,
  validUntil,
}: {
  createdAt: string;
  reviewingAt: string | null;
  quotedAt: string | null;
  approvedAt: string | null;
  wonAt: string | null;
  lostAt: string | null;
  reopenedAt: string | null;
  validUntil: string | null;
}) {
  const rows = quoteMilestones({
    createdAt,
    reviewingAt,
    quotedAt,
    approvedAt,
    wonAt,
    lostAt,
    reopenedAt,
    validUntil,
  });

  return (
    <div>
      <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
        Dates
      </h2>
      <dl className="mt-2 space-y-1 font-ui text-base">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
            <dt className="text-neutral-500">{row.label}</dt>
            <dd className="text-right tabular-nums text-charcoal">{display(row)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
