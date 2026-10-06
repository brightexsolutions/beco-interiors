import { formatKes } from './money-format';
import {
  PHONE_DISPLAY,
  attachmentNote,
  contactButtons,
  divider,
  emailHero,
  escapeHtml,
  eyebrow,
  heading,
  lineTable,
  paragraph,
  referenceBox,
  renderEmailShell,
  sectionLabel,
  signOff,
  totalBlock,
  type EmailLine,
} from './shell';

/**
 * The email a customer gets once an order is marked paid. The receipt PDF
 * is attached by the sender; the amount paid and the lines are in the body
 * so the message stands on its own (D109). Short, plain, no marketing voice,
 * no em dashes.
 */

export interface ReceiptEmailInput {
  reference: string;
  customerName: string;
  /** The attachment's file name, shown so the reader knows what to open. */
  filename?: string | undefined;
  /** VAT inclusive. Printed large when given. */
  amountPaid?: number | undefined;
  /** Already formatted for a reader, "3 October 2026". */
  paidOn?: string | null | undefined;
  lines?: readonly EmailLine[] | undefined;
}

export interface ReceiptEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildReceiptEmail(input: ReceiptEmailInput): ReceiptEmail {
  const firstName = input.customerName.trim().split(/\s+/)[0] || 'there';
  const subject = `Your Beco receipt, ${input.reference}`;
  const lines = input.lines ?? [];
  const showAmount = input.amountPaid !== undefined && input.amountPaid > 0;

  const text = [
    `Hi ${firstName},`,
    '',
    `Payment for ${input.reference} is recorded. Your receipt is attached.`,
    ...(showAmount ? ['', `Amount paid, VAT inclusive: ${formatKes(input.amountPaid!)}`] : []),
    ...(input.paidOn ? [`Paid on: ${input.paidOn}`] : []),
    '',
    `If anything looks off, reply to this email or call us on ${PHONE_DISPLAY}.`,
    '',
    'The Beco Interiors team',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const amountRows: Array<[string, string]> = [];
  if (input.paidOn) amountRows.push(['Paid on', input.paidOn]);
  if (lines.length > 0) amountRows.push(['Items', String(lines.length)]);

  const bodyHtml =
    eyebrow('Payment received') +
    heading(`Thank you, ${escapeHtml(firstName)}.`) +
    paragraph('Your payment is recorded. Your receipt is attached, keep it for your records.') +
    (showAmount ? totalBlock('Amount paid, VAT inclusive', formatKes(input.amountPaid!), amountRows) : '') +
    referenceBox('Order reference', input.reference, [['Status', 'Paid']]) +
    (lines.length > 0 ? sectionLabel('What you paid for') + lineTable(lines, formatKes) : '') +
    attachmentNote(input.filename ?? `${input.reference}.pdf`, 'Attached. Your official receipt, VAT shown.') +
    paragraph('Questions about collection, delivery or anything on the receipt? We are one tap away.') +
    contactButtons(`Hi Beco, about order ${input.reference}`) +
    divider() +
    signOff();

  const preview = showAmount
    ? `${formatKes(input.amountPaid!)} received for ${input.reference}. Your receipt is attached.`
    : `Payment for ${input.reference} is recorded.`;
  const html = renderEmailShell({ preview, bodyHtml, hero: emailHero('receipt') });

  return { subject, text, html };
}
