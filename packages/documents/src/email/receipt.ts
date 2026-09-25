import { escapeHtml, eyebrow, heading, paragraph, referenceBox, renderEmailShell } from './shell';

/**
 * The email a customer gets once an order is marked paid. The receipt PDF
 * is attached by the sender. Short, plain, no marketing voice, no em dashes.
 */

export interface ReceiptEmailInput {
  reference: string;
  customerName: string;
}

export interface ReceiptEmail {
  subject: string;
  text: string;
  html: string;
}

const PHONE = '+254 722 333 730';

export function buildReceiptEmail(input: ReceiptEmailInput): ReceiptEmail {
  const firstName = input.customerName.trim().split(/\s+/)[0] || 'there';
  const subject = `Your Beco receipt, ${input.reference}`;

  const text = [
    `Hi ${firstName},`,
    '',
    `Payment for ${input.reference} is recorded. Your receipt is attached.`,
    '',
    `If anything looks off, reply to this email or call us on ${PHONE}.`,
    '',
    'Beco Interiors',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const bodyHtml =
    eyebrow('Payment received') +
    heading(`Hi ${escapeHtml(firstName)},`) +
    paragraph('Payment is recorded. Your receipt is attached.') +
    referenceBox('Your reference', input.reference) +
    paragraph(
      `If anything looks off, reply to this email or call us on ` +
        `<a href="tel:+254722333730" style="color:#c81419;text-decoration:none">${escapeHtml(PHONE)}</a>.`,
    );

  const html = renderEmailShell({ preview: `Payment for ${input.reference} is recorded.`, bodyHtml });

  return { subject, text, html };
}
