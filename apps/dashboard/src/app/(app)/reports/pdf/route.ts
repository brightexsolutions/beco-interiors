import { NextRequest } from 'next/server';
import {
  fetchConversionReport,
  fetchLeaderboard,
  invalidCustomRange,
  parsePersonId,
  parseReportQuery,
} from '@/lib/reports';
import { renderReportPdfBytes, reportPdfFilename } from '@/lib/report-pdf';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

const pdfHeaders = (filename: string, download: boolean) => ({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  // Preview fetches these bytes and paints them. Keep the document itself
  // from being framed anywhere else.
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
});

/**
 * On-demand sales review PDF for the period on the reports screen.
 * Omit `person` for the team document. Pass a salesperson id for theirs.
 * Preview is inline. Download is the same bytes as an attachment.
 * Not stored in `documents`: that table is quotes and receipts.
 */
export async function GET(request: NextRequest) {
  await requirePath('/reports');
  const search = new URL(request.url).searchParams;
  const period = search.get('period') ?? undefined;
  const from = search.get('from') ?? undefined;
  const to = search.get('to') ?? undefined;
  const person = parsePersonId(search.get('person') ?? undefined);
  const download = search.get('download') === '1';

  if (!person.ok) {
    return new Response('That salesperson is not recognised.', {
      status: 400,
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  if (invalidCustomRange(period, from, to)) {
    return new Response('Choose a start and end date.', {
      status: 400,
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  const query = parseReportQuery(period, from, to);
  const supabase = await getSupabase();
  const [leaderboard, conversion] = await Promise.all([
    fetchLeaderboard(supabase, query),
    fetchConversionReport(supabase, query),
  ]);

  if (person.id && !leaderboard.people.some((row) => row.id === person.id)) {
    return new Response('That salesperson is not on the report.', {
      status: 404,
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  const rendered = await renderReportPdfBytes(leaderboard, conversion, undefined, person.id);
  if (!rendered.ok) {
    return new Response(rendered.error, { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  const personName = person.id
    ? (leaderboard.people.find((row) => row.id === person.id)?.full_name ?? null)
    : null;
  return new Response(new Uint8Array(rendered.bytes), {
    headers: pdfHeaders(reportPdfFilename(leaderboard.period, personName), download),
  });
}
