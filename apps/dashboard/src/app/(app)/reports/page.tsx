import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { ReportCharts } from '@/components/report-charts';
import { ReportFilters } from '@/components/report-filters';
import { ReportResults } from '@/components/report-results';
import { fetchActivitySeries, hasActivity, toMoneyPoints } from '@/lib/activity';
import { fetchConversionReport, fetchLeaderboard, parseReportQuery } from '@/lib/reports';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Reports',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/reports');
  const params = await searchParams;
  const query = parseReportQuery(one(params.period), one(params.from), one(params.to));

  const supabase = await getSupabase();
  const [leaderboard, conversion, weeks] = await Promise.all([
    fetchLeaderboard(supabase, query),
    fetchConversionReport(supabase, query),
    fetchActivitySeries(supabase, 8),
  ]);

  return (
    <>
      <PageHeading
        eyebrow="Sales"
        title="Reports"
        actions={
          <ReportFilters
            people={leaderboard.people.map((row) => ({ id: row.id, name: row.full_name }))}
          />
        }
      />
      <div className="mb-6">
        <ReportCharts points={toMoneyPoints(weeks)} quiet={!hasActivity(weeks)} />
      </div>
      <ReportResults leaderboard={leaderboard} conversion={conversion} />
    </>
  );
}
