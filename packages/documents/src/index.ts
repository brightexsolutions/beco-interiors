// Quote and receipt PDFs, and the transactional email templates.
// One template per document type, shared by both quote paths, so a counter
// quote and a web quote produce the SAME document. See the quote-document skill.
export const DOCUMENT_TYPES = ['quote', 'receipt'] as const;

export { buildQuoteConfirmationEmail } from './email/quote-confirmation';
export type { QuoteConfirmationInput, QuoteConfirmationEmail } from './email/quote-confirmation';
export { sendQuoteConfirmation } from './email/send';
export type { SendResult } from './email/send';
