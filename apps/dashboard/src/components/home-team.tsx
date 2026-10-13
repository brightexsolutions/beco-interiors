'use client';

import Link from 'next/link';
import { Panel, RankedBars } from '@beco/ui';
import type { LeaderboardPerson } from '@/lib/reports';

const money = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

/** The team ranked by won value this month, the figure a director asks for first. */
export const rankTeam = (people: LeaderboardPerson[], limit = 6): { label: string; value: number }[] =>
  [...people]
    .filter((person) => person.won_value > 0 || person.won > 0 || person.raised > 0)
    .sort((a, b) => b.won_value - a.won_value || b.won - a.won || b.raised - a.raised)
    .slice(0, limit)
    .map((person) => ({ label: person.full_name, value: person.won_value }));

/**
 * Who is winning the month, D142: the sales team ranked by value won, with
 * raised and won counts in the table under the chart. Answers the question
 * the tiles cannot: not how much was won, but by whom.
 */
export function HomeTeam({ people }: { people: LeaderboardPerson[] }) {
  const ranked = rankTeam(people);
  const raised = people.reduce((sum, person) => sum + person.raised, 0);
  const won = people.reduce((sum, person) => sum + person.won, 0);
  return (
    <Panel
      title={
        <div>
          <h2 className="font-ui text-base font-semibold text-charcoal">The team this month</h2>
          <p className="mt-0.5 font-ui text-sm text-neutral-500">
            {raised === 0 ? 'No quotes raised yet this month.' : `${raised} raised, ${won} won, by value won.`}
          </p>
        </div>
      }
      action={
        <Link href="/reports" className="inline-flex min-h-11 items-center font-ui text-sm font-semibold text-charcoal hover:underline">
          Full report
        </Link>
      }
    >
      <div className="px-4 py-4 sm:px-5">
        {ranked.length === 0 ? (
          <p className="font-ui text-base text-neutral-500">The first won quote puts a name here.</p>
        ) : (
          <RankedBars title="Won this month, by person" items={ranked} valueLabel="Won value" format={money} />
        )}
      </div>
    </Panel>
  );
}
