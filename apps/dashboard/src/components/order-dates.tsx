import { orderMilestones } from '@/lib/orders';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' });

export function OrderDates({
  createdAt,
  confirmedAt,
  paidAt,
  fulfilledAt,
  cancelledAt,
}: {
  createdAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
}) {
  const rows = orderMilestones({ createdAt, confirmedAt, paidAt, fulfilledAt, cancelledAt });

  return (
    <div>
      <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Dates</h2>
      <dl className="mt-2 space-y-1 font-ui text-base">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
            <dt className="text-neutral-500">{row.label}</dt>
            <dd className="text-right tabular-nums text-charcoal">{formatDateTime(row.at)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
