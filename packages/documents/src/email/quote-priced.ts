import {
  PHONE_DISPLAY,
  attachmentNote,
  contactButtons,
  divider,
  escapeHtml,
  eyebrow,
  heading,
  paragraph,
  referenceBox,
  renderEmailShell,
  signOff,
} from './shell';

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
  /** The attachment's file name, shown so the reader knows what to open. */
  filename?: string | undefined;
}

export interface PricedQuoteEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildPricedQuoteEmail(input: PricedQuoteEmailInput): PricedQuoteEmail {
  const firstName = input.customerName.trim().split(/\s+/)[0] || 'there';
  const validity = input.validUntil ? ` It is valid until ${input.validUntil}.` : '';
  const pricedLine = input.isPriced
    ? `Your quote is attached.${validity}`
    : 'Your quote is attached. Some items are still priced on application, so the document does not show a total.';

  const subject = `Your Beco quote, ${input.reference}`;

  const text = [
    `Hi ${firstName},`,
    '',
    pricedLine,
    '',
    `Your reference is ${input.reference}. To go ahead, reply to this email or call us on ${PHONE_DISPLAY}.`,
    'We reserve stock once you confirm.',
    '',
    'The Beco Interiors team',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const rows: Array<[string, string]> = [];
  if (input.validUntil) rows.push(['Valid until', input.validUntil]);
  rows.push(['Pricing', input.isPriced ? 'VAT inclusive' : 'Some items on application']);

  const bodyHtml =
    eyebrow('Your quote') +
    heading(`Here is your quote, ${escapeHtml(firstName)}.`) +
    paragraph(escapeHtml(pricedLine)) +
    referenceBox('Quote reference', input.reference, rows) +
    attachmentNote(input.filename ?? `${input.reference}.pdf`, 'Attached. Open it for every line, the VAT and how to pay.') +
    paragraph('Ready to go ahead, or want something changed? Reply to this email, or reach us directly. We reserve stock once you confirm.') +
    contactButtons(`Hi Beco, about quote ${input.reference}`) +
    divider() +
    signOff();

  const html = renderEmailShell({ preview: pricedLine, bodyHtml });

  return { subject, text, html };
}
