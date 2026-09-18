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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.6;color:#101820">',
    `<p>Hi ${escapeHtml(firstName)},</p>`,
    `<p>Payment for <strong>${escapeHtml(input.reference)}</strong> is recorded. Your receipt is attached.</p>`,
    `<p>If anything looks off, reply to this email or call us on ` +
      `<a href="tel:+254722333730" style="color:#c8102e">${PHONE}</a>.</p>`,
    '<p style="color:#5b6670;font-size:14px">Beco Interiors<br>Urban Square, Enterprise Road, Industrial Area, Nairobi</p>',
    '</div>',
  ].join('');

  return { subject, text, html };
}
