import type { QuoteMoney } from '@beco/validation';
import type { OrderLine } from '@/lib/order-detail';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

/** Read-only sibling of quote create: Item / Qty / Unit / Line. Amounts need room for Ksh 308,000.00. */
const LINE_COLS = 'md:grid-cols-[minmax(0,1fr)_4.5rem_10rem_10rem]';

function amount(n: number) {
  return n > 0 ? money(n) : 'POA';
}

export function OrderLines({
  lines,
  totals,
}: {
  lines: OrderLine[];
  totals: QuoteMoney;
}) {
  return (
    <div>
      <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Line items</h2>
      <div
        className={`mt-3 hidden gap-x-4 border-b border-neutral-200 pb-2 font-ui text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500 md:grid ${LINE_COLS}`}
      >
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit</span>
        <span className="text-right">Line</span>
      </div>
      <ul className="divide-y divide-neutral-200">
        {lines.map((line) => {
          const discounted = line.listPrice != null && line.unitPrice < line.listPrice;
          return (
            <li key={line.id} className="py-3">
              <div className={`grid grid-cols-1 gap-2 md:items-start md:gap-x-4 ${LINE_COLS}`}>
                <div className="min-w-0">
                  <p className="font-ui text-base text-charcoal">{line.description}</p>
                  {line.code ? <p className="mt-0.5 font-ui text-sm tabular-nums text-neutral-500">Code {line.code}</p> : null}
                  {discounted ? (
                    <p className="mt-0.5 font-ui text-sm text-neutral-500">
                      Catalogue <span className="line-through">{money(line.listPrice ?? 0)}</span>
                    </p>
                  ) : null}
                </div>
                <p className="hidden font-ui text-base tabular-nums md:block md:text-right">{line.quantity}</p>
                <p className="hidden font-ui text-base tabular-nums md:block md:text-right">{amount(line.unitPrice)}</p>
                <p className="hidden font-ui text-base font-semibold tabular-nums md:block md:text-right">
                  {amount(line.lineTotal)}
                </p>
                <div className="flex items-baseline justify-between gap-3 md:hidden">
                  <p className="font-ui text-base tabular-nums text-neutral-500">
                    {line.quantity} × {amount(line.unitPrice)}
                  </p>
                  <p className="font-ui text-base font-semibold tabular-nums text-charcoal">{amount(line.lineTotal)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        {totals.isPriced ? (
          <dl className="ml-auto w-full max-w-[21rem] space-y-1 font-ui text-base">
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="tabular-nums text-charcoal">{money(totals.net)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">VAT included</dt>
              <dd className="tabular-nums text-charcoal">{money(totals.vat)}</dd>
            </div>
            <div className="flex justify-between gap-6 font-semibold text-charcoal">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(totals.gross)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-right font-ui text-base text-neutral-500">Pricing on application</p>
        )}
      </div>
    </div>
  );
}
