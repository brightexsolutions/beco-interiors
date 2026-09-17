// Quote and receipt PDFs, and the transactional email templates.
// One template per document type, shared by both quote paths, so a counter
// quote and a web quote produce the SAME document. See the quote-document skill.
export const DOCUMENT_TYPES = ['quote', 'receipt'] as const;

export { buildQuoteConfirmationEmail } from './email/quote-confirmation';
export type { QuoteConfirmationInput, QuoteConfirmationEmail } from './email/quote-confirmation';
export { buildPricedQuoteEmail } from './email/quote-priced';
export type { PricedQuoteEmailInput, PricedQuoteEmail } from './email/quote-priced';
export { sendQuoteConfirmation, sendPricedQuote } from './email/send';
export type { SendResult } from './email/send';
export { renderQuotePdf } from './pdf/render';
export { QuoteDocument } from './pdf/quote-document';
export type { QuotePdfInput, QuotePdfLine } from './pdf/types';
