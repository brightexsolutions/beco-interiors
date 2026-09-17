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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.6;color:#101820">',
    `<p>Hi ${escapeHtml(firstName)},</p>`,
    `<p>${escapeHtml(pricedLine)}</p>`,
    `<p>Your reference is <strong>${escapeHtml(input.reference)}</strong>. If anything looks off, reply to this email or call us on ` +
      `<a href="tel:+254722333730" style="color:#c8102e">${PHONE}</a>.</p>`,
    '<p style="color:#5b6670;font-size:14px">Beco Interiors<br>Urban Square, Enterprise Road, Industrial Area, Nairobi</p>',
    '</div>',
  ].join('');

  return { subject, text, html };
}
