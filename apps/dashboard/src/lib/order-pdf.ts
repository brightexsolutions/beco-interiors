import { renderReceiptPdf, type QuotePdfInput } from '@beco/documents';
import { reportOpsFailure } from './ops-alert';
import type { OrderDetail } from './order-detail';
import type { QuoteSettings } from './quote-detail';

export const toReceiptPdfInput = (order: OrderDetail, settings: QuoteSettings): QuotePdfInput => ({
  reference: order.reference,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  customerEmail: order.customerEmail,
  company: null,
  projectDetails: order.notes,
  validUntil: null,
  lines: order.lines.map((line) => ({
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
  issuedAt: order.createdAt,
  kind: 'receipt',
  paidAt: order.paidAt,
});

export const receiptStoragePath = (reference: string, id: string): string =>
  `receipts/${reference}/${id}.pdf`;

export function receiptPdfFilename(reference: string, customerName: string): string {
  const safeName = customerName
    .replace(/["\\/:*?<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return safeName ? `${reference} ${safeName}.pdf` : `${reference}.pdf`;
}

export async function renderReceiptPdfBytes(
  order: OrderDetail,
  settings: QuoteSettings,
): Promise<{ ok: true; bytes: Buffer; isPriced: boolean } | { ok: false; error: string }> {
  try {
    const bytes = await renderReceiptPdf(toReceiptPdfInput(order, settings));
    return { ok: true, bytes, isPriced: order.totals.isPriced };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    await reportOpsFailure({
      area: 'pdf.render',
      summary: `Receipt PDF for ${order.reference} did not render`,
      detail,
      context: { order: order.reference, lines: order.lines.length },
    });
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
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }>;
  };
};

export async function persistReceiptPdf(
  supabase: StorageClient,
  order: OrderDetail,
  settings: QuoteSettings,
  userId: string,
): Promise<{ ok: true; bytes: Buffer; path: string } | { ok: false; error: string }> {
  const rendered = await renderReceiptPdfBytes(order, settings);
  if (!rendered.ok) return rendered;

  const path = receiptStoragePath(order.reference, crypto.randomUUID());
  const { error: uploadError } = await supabase.storage.from('documents').upload(path, rendered.bytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (uploadError) {
    await reportOpsFailure({
      area: 'pdf.store',
      summary: `Receipt PDF for ${order.reference} could not be stored`,
      detail: uploadError.message,
      context: { order: order.reference, bucket: 'documents' },
    });
    return { ok: false, error: `Could not store the PDF: ${uploadError.message}` };
  }

  const { error: rowError } = await supabase.from('documents').insert({
    type: 'receipt',
    order_id: order.id,
    quote_id: order.quoteId,
    reference_number: order.reference,
    storage_path: path,
    generated_by: userId,
  });
  if (rowError) {
    await reportOpsFailure({
      area: 'pdf.record',
      summary: `Receipt PDF for ${order.reference} was stored but its documents row was not written`,
      detail: rowError.message,
      context: { order: order.reference, path },
    });
    return { ok: false, error: rowError.message ?? 'Could not record the PDF.' };
  }

  return { ok: true, bytes: rendered.bytes, path };
}
