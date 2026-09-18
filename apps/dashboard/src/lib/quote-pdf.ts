import { renderQuotePdf, type QuotePdfInput } from '@beco/documents';
import type { QuoteDetail, QuoteSettings } from './quote-detail';

export const toPdfInput = (quote: QuoteDetail, settings: QuoteSettings): QuotePdfInput => ({
  reference: quote.reference,
  customerName: quote.customerName,
  customerPhone: quote.customerPhone,
  customerEmail: quote.customerEmail,
  company: quote.company,
  projectDetails: quote.projectDetails,
  validUntil: quote.validUntil,
  lines: quote.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  })),
  vatRate: settings.vatRate,
  bankDetails: settings.bankDetails,
  tillNumber: settings.tillNumber,
  paybillNumber: settings.paybillNumber,
  paybillAccount: settings.paybillAccount,
  sendMoneyNumber: settings.sendMoneyNumber,
  paymentTerms: settings.paymentTerms,
  footer: settings.footer,
  phone: settings.phone,
  issuedAt: quote.createdAt,
});

export const documentStoragePath = (reference: string, id: string): string =>
  `quotes/${reference}/${id}.pdf`;

/**
 * Download and email attachment name. The reference identifies the quote;
 * the customer name is what a salesperson sees in Downloads and WhatsApp.
 * Path characters are stripped so the browser does not treat the name as a
 * folder.
 */
export function quotePdfFilename(reference: string, customerName: string): string {
  const safeName = customerName
    .replace(/["\\/:*?<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return safeName ? `${reference} ${safeName}.pdf` : `${reference}.pdf`;
}

export async function renderQuotePdfBytes(
  quote: QuoteDetail,
  settings: QuoteSettings,
): Promise<{ ok: true; bytes: Buffer; isPriced: boolean } | { ok: false; error: string }> {
  try {
    const bytes = await renderQuotePdf(toPdfInput(quote, settings));
    return { ok: true, bytes, isPriced: quote.totals.isPriced };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, error: `Could not render the PDF: ${detail}` };
  }
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Buffer,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string; code?: string } | null }>;
  };
};

export async function persistQuotePdf(
  supabase: StorageClient,
  quote: QuoteDetail,
  settings: QuoteSettings,
  userId: string,
): Promise<{ ok: true; bytes: Buffer; path: string; isPriced: boolean } | { ok: false; error: string }> {
  const rendered = await renderQuotePdfBytes(quote, settings);
  if (!rendered.ok) return rendered;

  const path = documentStoragePath(quote.reference, crypto.randomUUID());
  const { error: uploadError } = await supabase.storage.from('documents').upload(path, rendered.bytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (uploadError) return { ok: false, error: `Could not store the PDF: ${uploadError.message}` };

  const { error: rowError } = await supabase.from('documents').insert({
    type: 'quote',
    quote_id: quote.id,
    reference_number: quote.reference,
    storage_path: path,
    generated_by: userId,
  });
  if (rowError) return { ok: false, error: rowError.message ?? 'Could not record the PDF.' };

  return { ok: true, bytes: rendered.bytes, path, isPriced: rendered.isPriced };
}
