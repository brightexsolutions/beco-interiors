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
 * The email a customer gets once an order is marked paid. The receipt PDF
 * is attached by the sender. Short, plain, no marketing voice, no em dashes.
 */

export interface ReceiptEmailInput {
  reference: string;
  customerName: string;
  /** The attachment's file name, shown so the reader knows what to open. */
  filename?: string | undefined;
}

export interface ReceiptEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildReceiptEmail(input: ReceiptEmailInput): ReceiptEmail {
  const firstName = input.customerName.trim().split(/\s+/)[0] || 'there';
  const subject = `Your Beco receipt, ${input.reference}`;

  const text = [
    `Hi ${firstName},`,
    '',
    `Payment for ${input.reference} is recorded. Your receipt is attached.`,
    '',
    `If anything looks off, reply to this email or call us on ${PHONE_DISPLAY}.`,
    '',
    'The Beco Interiors team',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const bodyHtml =
    eyebrow('Payment received') +
    heading(`Thank you, ${escapeHtml(firstName)}.`) +
    paragraph('Your payment is recorded. Your receipt is attached, keep it for your records.') +
    referenceBox('Order reference', input.reference, [['Status', 'Paid']]) +
    attachmentNote(input.filename ?? `${input.reference}.pdf`, 'Attached. Your official receipt, VAT shown.') +
    paragraph('Questions about collection, delivery or anything on the receipt? We are one tap away.') +
    contactButtons(`Hi Beco, about order ${input.reference}`) +
    divider() +
    signOff();

  const html = renderEmailShell({ preview: `Payment for ${input.reference} is recorded.`, bodyHtml });

  return { subject, text, html };
}
