import { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { fetchQuote, fetchQuoteSettings } from '@/lib/quote-detail';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { persistQuotePdf, renderQuotePdfBytes, quotePdfFilename } from '@/lib/quote-pdf';

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
 * Live PDF for this quote. Preview renders in place. Download is the same
 * bytes as an attachment, and records a documents row.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const user = await requirePath('/quotes');
  const { reference } = await params;
  const decoded = decodeURIComponent(reference);
  const download = new URL(request.url).searchParams.get('download') === '1';

  const supabase = await getSupabase();
  const [quote, settings] = await Promise.all([
    fetchQuote(supabase, decoded),
    fetchQuoteSettings(supabase),
  ]);
  if (!quote) notFound();

  if (download) {
    const stored = await persistQuotePdf(supabase, quote, settings, user.userId);
    if (!stored.ok) {
      return new Response(stored.error, { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
    }
    return new Response(new Uint8Array(stored.bytes), {
      headers: pdfHeaders(quotePdfFilename(quote.reference, quote.customerName), true),
    });
  }

  const rendered = await renderQuotePdfBytes(quote, settings);
  if (!rendered.ok) {
    return new Response(rendered.error, { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  return new Response(new Uint8Array(rendered.bytes), {
    headers: pdfHeaders(quotePdfFilename(quote.reference, quote.customerName), false),
  });
}
