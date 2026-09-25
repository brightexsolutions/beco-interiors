import { escapeHtml, eyebrow, heading, paragraph, referenceBox, renderEmailShell } from './shell';

/**
 * The email a customer gets the moment a web quote is submitted.
 *
 * It confirms receipt and carries the reference, nothing more. The priced
 * quote itself is a separate document, sent by a salesperson once it is
 * actually priced, so this one does not list items or totals it cannot yet
 * stand behind. It mirrors the on-site confirmation screen's own copy and
 * structure, eyebrow, then the reference named plainly, so the email reads
 * as a continuation of the page the customer was just on, not a second,
 * unrelated message.
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

  const bodyHtml =
    eyebrow('Request received') +
    heading(`Hi ${escapeHtml(firstName)},`) +
    paragraph('We have your request and it is with our team.') +
    referenceBox('Your reference', reference) +
    paragraph(
      'A salesperson will price it and send the quote back to you. If it is urgent, reply to ' +
        `this email with your reference or call us on <a href="tel:+254722333730" style="color:#c81419;text-decoration:none">${escapeHtml(PHONE)}</a>.`,
    ) +
    paragraph('Keep the reference. Everything else is on us.');

  const html = renderEmailShell({ preview: `We have your request. Reference ${reference}.`, bodyHtml });

  return { subject, text, html };
}
