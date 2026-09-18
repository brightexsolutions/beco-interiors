import { NextRequest } from 'next/server';
import { fetchConversionReport, fetchLeaderboard, parsePeriod } from '@/lib/reports';
import { renderReportPdfBytes, reportPdfFilename } from '@/lib/report-pdf';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

const pdfHeaders = (filename: string) => ({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `attachment; filename="${filename}"`,
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
});

/**
 * On-demand sales review PDF for the period on the reports screen.
 * Not stored in `documents`: that table is quotes and receipts.
 */
export async function GET(request: NextRequest) {
  await requirePath('/reports');
  const period = parsePeriod(new URL(request.url).searchParams.get('period') ?? undefined);

  const supabase = await getSupabase();
  const [leaderboard, conversion] = await Promise.all([
    fetchLeaderboard(supabase, period),
    fetchConversionReport(supabase, period),
  ]);

  const rendered = await renderReportPdfBytes(leaderboard, conversion);
  if (!rendered.ok) {
    return new Response(rendered.error, { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  return new Response(new Uint8Array(rendered.bytes), {
    headers: pdfHeaders(reportPdfFilename(leaderboard.period)),
  });
}
