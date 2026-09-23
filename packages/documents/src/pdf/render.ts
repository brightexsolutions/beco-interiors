import { renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
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
  // renderToBuffer types its argument as ReactElement<DocumentProps>, but the element here
  // is our own wrapper component with its own { quote } prop, not the <Document> it renders.
  // DocumentProps is all optional, so TS treats it as a weak type and rejects a props type
  // with no overlapping keys, even though the tree renderToBuffer walks is a real <Document>.
  const element = createElement(QuoteDocument, { quote: input }) as unknown as ReactElement<DocumentProps>;
  const bytes = await renderToBuffer(element);
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

export async function renderReceiptPdf(input: QuotePdfInput): Promise<Buffer> {
  return renderQuotePdf({ ...input, kind: 'receipt' });
}

export async function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  registerQuoteFonts();
  // Same weak type gap as above, for the report wrapper's { report } prop.
  const element = createElement(ReportDocument, { report: input }) as unknown as ReactElement<DocumentProps>;
  const bytes = await renderToBuffer(element);
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

export { summaryCopy, personCopy, catalogueCopy, categoryCopy } from './report-document';
