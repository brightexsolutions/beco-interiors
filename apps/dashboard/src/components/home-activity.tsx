'use client';

import Link from 'next/link';
import { Panel, StageBar, TrendBars, type Stage, type TrendPoint } from '@beco/ui';

/**
 * The two pictures the home page carries, both answering a question the
 * tiles cannot: is the week by week flow of quotes healthy, and where does
 * everything open stand right now. Won is the series that matters, so it
 * is the charcoal one; raised is the context behind it. Both figures also
 * live in a table inside the chart for a reader who wants the numbers.
 */
export function HomeActivity({
  points,
  stages,
  quiet,
}: {
  points: TrendPoint[];
  stages: Stage[];
  /** True when the last eight weeks hold no activity at all. */
  quiet: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel
        title={
          <div>
            <h2 className="font-ui text-base font-semibold text-charcoal">Quotes, week by week</h2>
            <p className="mt-0.5 font-ui text-sm text-neutral-500">Raised against won, the last eight weeks.</p>
          </div>
        }
        action={
          <Link href="/reports" className="inline-flex min-h-11 items-center font-ui text-sm font-semibold text-charcoal hover:underline">
            Reports
          </Link>
        }
      >
        <div className="px-4 py-4 sm:px-5">
          {quiet ? (
            <p className="font-ui text-base text-neutral-500">No quotes in the last eight weeks. The first one draws the first bar.</p>
          ) : (
            <TrendBars
              title="Quotes by week"
              points={points}
              primary={{ key: 'won', label: 'Won' }}
              secondary={{ key: 'raised', label: 'Raised' }}
            />
          )}
        </div>
      </Panel>
      <Panel
        title={
          <div>
            <h2 className="font-ui text-base font-semibold text-charcoal">Where quotes stand</h2>
            <p className="mt-0.5 font-ui text-sm text-neutral-500">Everything open, then won and lost this month.</p>
          </div>
        }
        action={
          <Link href="/quotes?owner=all" className="inline-flex min-h-11 items-center font-ui text-sm font-semibold text-charcoal hover:underline">
            Open the list
          </Link>
        }
      >
        <div className="px-4 py-4 sm:px-5">
          <StageBar title="Pipeline" stages={stages} />
        </div>
      </Panel>
    </div>
  );
}
