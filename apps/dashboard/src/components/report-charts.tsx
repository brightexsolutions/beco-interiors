'use client';

import { Panel, TrendBars, type TrendPoint } from '@beco/ui';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

/**
 * Money week by week. Collected is the point, invoiced the context, per D8:
 * billed and arrived are two different numbers and the gap between the two
 * bars is the one a director reads. Always the last eight weeks, whatever
 * period the tables below are set to, so the trend is never a single bar.
 */
export function ReportCharts({ points, quiet }: { points: TrendPoint[]; quiet: boolean }) {
  return (
    <Panel
      title={
        <div>
          <h2 className="font-ui text-base font-semibold text-charcoal">Money, week by week</h2>
          <p className="mt-0.5 font-ui text-sm text-neutral-500">Invoiced against collected, the last eight weeks.</p>
        </div>
      }
    >
      <div className="px-4 py-4 sm:px-5">
        {quiet ? (
          <p className="font-ui text-base text-neutral-500">No orders in the last eight weeks yet.</p>
        ) : (
          <TrendBars
            title="Money by week"
            points={points}
            primary={{ key: 'collected', label: 'Collected', format: money }}
            secondary={{ key: 'invoiced', label: 'Invoiced', format: money }}
          />
        )}
      </div>
    </Panel>
  );
}
