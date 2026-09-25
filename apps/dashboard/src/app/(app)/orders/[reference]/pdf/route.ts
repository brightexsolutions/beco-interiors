import { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { fetchOrder } from '@/lib/order-detail';
import { fetchQuoteSettings } from '@/lib/quote-detail';
import { persistReceiptPdf, renderReceiptPdfBytes, receiptPdfFilename } from '@/lib/order-pdf';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

const pdfHeaders = (filename: string, download: boolean) => ({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const user = await requirePath('/orders');
  const { reference } = await params;
  const decoded = decodeURIComponent(reference);
  const download = new URL(request.url).searchParams.get('download') === '1';

  const supabase = await getSupabase();
  const [order, settings] = await Promise.all([
    fetchOrder(supabase, decoded),
    fetchQuoteSettings(supabase),
  ]);
  if (!order) notFound();
  if (order.paymentStatus !== 'paid') {
    return new Response('A receipt is only available after the order is marked paid.', {
      status: 409,
      headers: { 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  if (download) {
    const stored = await persistReceiptPdf(supabase, order, settings, user.userId);
    if (!stored.ok) {
      return new Response(stored.error, { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
    }
    return new Response(new Uint8Array(stored.bytes), {
      headers: pdfHeaders(receiptPdfFilename(order.reference, order.customerName), true),
    });
  }

  const rendered = await renderReceiptPdfBytes(order, settings);
  if (!rendered.ok) {
    return new Response(rendered.error, { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  return new Response(new Uint8Array(rendered.bytes), {
    headers: pdfHeaders(receiptPdfFilename(order.reference, order.customerName), false),
  });
}
