import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { ReportFilters } from '@/components/report-filters';
import { ReportResults } from '@/components/report-results';
import { fetchConversionReport, fetchLeaderboard, parsePeriod } from '@/lib/reports';
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
  const period = parsePeriod(one(params.period));

  const supabase = await getSupabase();
  const [leaderboard, conversion] = await Promise.all([
    fetchLeaderboard(supabase, period),
    fetchConversionReport(supabase, period),
  ]);

  return (
    <>
      <PageHeading
        eyebrow="Sales"
        title="Reports"
        actions={<ReportFilters />}
      />
      <ReportResults leaderboard={leaderboard} conversion={conversion} />
    </>
  );
}
