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
 * The email a customer gets once a salesperson has priced the quote and
 * chosen to send it. The PDF is attached by the sender; the email carries
 * the lines and the total so the figure is readable in the inbox list on a
 * phone, before anyone opens an attachment (D109). Nothing here states a
 * figure the quote cannot back: an unpriced quote shows "On application".
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
  /** The quote's lines, for the summary table. Omitted, the table is not drawn. */
  lines?: readonly EmailLine[] | undefined;
  /** VAT inclusive total and its split. Printed only when `isPriced`. */
  totals?: { gross: number; net: number; vat: number } | undefined;
  vatRate?: number | undefined;
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
  const lines = input.lines ?? [];
  const showTotal = input.isPriced && input.totals !== undefined && input.totals.gross > 0;

  const subject = `Your Beco quote, ${input.reference}`;

  const textLines = lines.slice(0, 8).map((line) => {
    const amount = line.lineTotal && line.lineTotal > 0 ? formatKes(line.lineTotal) : 'On application';
    return `  ${line.description}, ${line.quantity}${line.unit ? ` ${line.unit}` : ''}: ${amount}`;
  });
  if (lines.length > 8) textLines.push(`  and ${lines.length - 8} more in the attached PDF`);

  const text = [
    `Hi ${firstName},`,
    '',
    pricedLine,
    '',
    ...(textLines.length > 0 ? ['Your quote:', ...textLines, ''] : []),
    ...(showTotal ? [`Total, VAT inclusive: ${formatKes(input.totals!.gross)}`, ''] : []),
    `Your reference is ${input.reference}. To go ahead, reply to this email or call us on ${PHONE_DISPLAY}.`,
    'We reserve stock once you confirm.',
    '',
    'The Beco Interiors team',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const rows: Array<[string, string]> = [];
  if (input.validUntil) rows.push(['Valid until', input.validUntil]);
  rows.push(['Pricing', input.isPriced ? 'VAT inclusive' : 'Some items on application']);

  const totalRows: Array<[string, string]> = showTotal
    ? [
        ['Before VAT', formatKes(input.totals!.net)],
        [input.vatRate !== undefined ? `VAT at ${input.vatRate}%` : 'VAT', formatKes(input.totals!.vat)],
        ...(input.validUntil ? [['Valid until', input.validUntil] as [string, string]] : []),
      ]
    : [];

  const bodyHtml =
    eyebrow('Your quote') +
    heading(`Here is your quote, ${escapeHtml(firstName)}.`) +
    paragraph(escapeHtml(pricedLine)) +
    referenceBox('Quote reference', input.reference, rows) +
    (lines.length > 0 ? sectionLabel('What is on it') + lineTable(lines, formatKes) : '') +
    (showTotal ? totalBlock('Total, VAT inclusive', formatKes(input.totals!.gross), totalRows) : '') +
    attachmentNote(input.filename ?? `${input.reference}.pdf`, 'Attached. Every line, the VAT and how to pay.') +
    paragraph('Ready to go ahead, or want something changed? Reply to this email, or reach us directly. We reserve stock once you confirm.') +
    contactButtons(`Hi Beco, about quote ${input.reference}`) +
    divider() +
    signOff();

  const preview = showTotal ? `${formatKes(input.totals!.gross)}, VAT inclusive. ${pricedLine}` : pricedLine;
  const html = renderEmailShell({ preview, bodyHtml, hero: emailHero('quote') });

  return { subject, text, html };
}
