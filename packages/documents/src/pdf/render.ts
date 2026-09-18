import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { registerQuoteFonts } from './fonts';
import { QuoteDocument } from './quote-document';
import { ReportDocument } from './report-document';
import type { QuotePdfInput, ReportPdfInput } from './types';

/**
 * Render a quote PDF to bytes. Fonts are registered once per process.
 *
 * Use `renderToBuffer`, not `pdf().toBuffer()`. In this version of
 * @react-pdf/renderer, `toBuffer()` returns the PDFKit document stream, and
 * passing that to `Buffer.from` throws "Received an instance of PDFDocument".
 */
export async function renderQuotePdf(input: QuotePdfInput): Promise<Buffer> {
  registerQuoteFonts();
  const bytes = await renderToBuffer(createElement(QuoteDocument, { quote: input }));
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

export async function renderReceiptPdf(input: QuotePdfInput): Promise<Buffer> {
  return renderQuotePdf({ ...input, kind: 'receipt' });
}

export async function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  registerQuoteFonts();
  const bytes = await renderToBuffer(createElement(ReportDocument, { report: input }));
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

export { summaryCopy, personCopy, catalogueCopy, categoryCopy } from './report-document';
