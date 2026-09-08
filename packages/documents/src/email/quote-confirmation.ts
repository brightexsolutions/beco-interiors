/**
 * The email a customer gets the moment a web quote is submitted.
 *
 * It confirms receipt and carries the reference, nothing more. The priced
 * quote itself is a separate document, sent by a salesperson once it is
 * actually priced, so this one does not list items or totals it cannot yet
 * stand behind. It mirrors the on-site confirmation copy: we have it, here
 * is the reference, keep it, everything else is on us.
 *
 * No em dashes, per rule 1, in the subject or either body.
 */
export interface QuoteConfirmationInput {
  reference: string;
  customerName: string;
}

export interface QuoteConfirmationEmail {
  subject: string;
  text: string;
  html: string;
}

const PHONE = '+254 722 333 730';

export function buildQuoteConfirmationEmail(input: QuoteConfirmationInput): QuoteConfirmationEmail {
  const { reference, customerName } = input;
  const firstName = customerName.trim().split(/\s+/)[0] || 'there';

  const subject = `We have your request, ${reference}`;

  const text = [
    `Hi ${firstName},`,
    '',
    `We have your request and it is with our team. Your reference is ${reference}.`,
    '',
    'A salesperson will price it and send the quote back to you. If it is urgent,',
    `reply to this email with your reference or call us on ${PHONE}.`,
    '',
    'Keep the reference. Everything else is on us.',
    '',
    'Beco Interiors',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.6;color:#101820">',
    `<p>Hi ${escapeHtml(firstName)},</p>`,
    `<p>We have your request and it is with our team. Your reference is <strong>${escapeHtml(reference)}</strong>.</p>`,
    '<p>A salesperson will price it and send the quote back to you. If it is urgent, reply to this email with your reference or call us on ' +
      `<a href="tel:+254722333730" style="color:#c8102e">${PHONE}</a>.</p>`,
    '<p>Keep the reference. Everything else is on us.</p>',
    '<p style="color:#5b6670;font-size:14px">Beco Interiors<br>Urban Square, Enterprise Road, Industrial Area, Nairobi</p>',
    '</div>',
  ].join('');

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
