// Quote and receipt PDFs, and the transactional email templates.
// One template per document type, shared by both quote paths, so a counter
// quote and a web quote produce the SAME document. See the quote-document skill.
export const DOCUMENT_TYPES = ['quote', 'receipt'] as const;

export { buildQuoteConfirmationEmail } from './email/quote-confirmation';
export type { QuoteConfirmationInput, QuoteConfirmationEmail } from './email/quote-confirmation';
export { buildPricedQuoteEmail } from './email/quote-priced';
export type { PricedQuoteEmailInput, PricedQuoteEmail } from './email/quote-priced';
export { buildReceiptEmail } from './email/receipt';
export type { ReceiptEmailInput, ReceiptEmail } from './email/receipt';
export { sendQuoteConfirmation, sendPricedQuote, sendReceipt } from './email/send';
export type { SendResult } from './email/send';
export { formatKes } from './email/money-format';
export type { EmailLine } from './email/shell';
export { buildOpsAlertEmail, sendOpsAlert, DEFAULT_OPS_ALERT_EMAIL } from './email/ops-alert';
export type { OpsAlert, OpsAlertApp, OpsAlertContext } from './email/ops-alert';
export { renderQuotePdf, renderReceiptPdf, renderReportPdf } from './pdf/render';
export { QuoteDocument } from './pdf/quote-document';
export { ReportDocument, summaryCopy, personCopy, catalogueCopy, categoryCopy } from './pdf/report-document';
export type {
  QuotePdfInput,
  QuotePdfLine,
  ReportPdfInput,
  ReportPdfPerson,
  ReportPdfFunnelRow,
} from './pdf/types';
export { customerKraPinLine, quotePaymentBlocks } from './pdf/types';
