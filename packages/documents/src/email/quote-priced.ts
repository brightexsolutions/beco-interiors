import { escapeHtml, eyebrow, heading, paragraph, referenceBox, renderEmailShell } from './shell';

/**
 * The email a customer gets once a salesperson has priced the quote and
 * chosen to send it. The PDF is attached by the sender, not inlined here.
 *
 * Short, plain, no marketing voice, no em dashes.
 */

export interface PricedQuoteEmailInput {
  reference: string;
  customerName: string;
  validUntil: string | null;
  isPriced: boolean;
}

export interface PricedQuoteEmail {
  subject: string;
  text: string;
  html: string;
}

const PHONE = '+254 722 333 730';

export function buildPricedQuoteEmail(input: PricedQuoteEmailInput): PricedQuoteEmail {
  const firstName = input.customerName.trim().split(/\s+/)[0] || 'there';
  const validity = input.validUntil ? ` It is valid until ${input.validUntil}.` : '';
  const pricedLine = input.isPriced
    ? `Your quote is attached.${validity}`
    : `Your quote is attached. Some items are still priced on application, so the document does not show a total.`;

  const subject = `Your Beco quote, ${input.reference}`;

  const text = [
    `Hi ${firstName},`,
    '',
    pricedLine,
    '',
    `Your reference is ${input.reference}. If anything looks off, reply to this email or call us on ${PHONE}.`,
    '',
    'Beco Interiors',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const bodyHtml =
    eyebrow('Your quote') +
    heading(`Hi ${escapeHtml(firstName)},`) +
    paragraph(escapeHtml(pricedLine)) +
    referenceBox('Your reference', input.reference) +
    paragraph(
      `If anything looks off, reply to this email or call us on ` +
        `<a href="tel:+254722333730" style="color:#c81419;text-decoration:none">${escapeHtml(PHONE)}</a>.`,
    );

  const html = renderEmailShell({ preview: pricedLine, bodyHtml });

  return { subject, text, html };
}
