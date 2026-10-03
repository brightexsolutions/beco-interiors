import {
  PHONE_DISPLAY,
  contactButtons,
  divider,
  emailHero,
  escapeHtml,
  eyebrow,
  heading,
  paragraph,
  referenceBox,
  renderEmailShell,
  sectionLabel,
  signOff,
  steps,
} from './shell';

/**
 * The email a customer gets the moment a web quote is submitted.
 *
 * It confirms receipt, carries the reference and says what happens next. The
 * priced quote is a separate document, sent once it is actually priced, so
 * this one lists no items or totals it cannot yet stand behind.
 *
 * No em dashes, per rule 1, in the subject or either body.
 */
export interface QuoteConfirmationInput {
  reference: string;
  customerName: string;
  /** How many lines the request carried, so the reader knows the list arrived whole. */
  itemCount?: number | undefined;
}

export interface QuoteConfirmationEmail {
  subject: string;
  text: string;
  html: string;
}

const NEXT_STEPS = [
  'A salesperson checks stock and prices every item on your list.',
  'We send the priced quote to you as a PDF, by email or WhatsApp.',
  'You confirm, and we arrange collection or delivery.',
];

export function buildQuoteConfirmationEmail(input: QuoteConfirmationInput): QuoteConfirmationEmail {
  const { reference, customerName, itemCount } = input;
  const firstName = customerName.trim().split(/\s+/)[0] || 'there';
  const itemsLine =
    itemCount && itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} on your list` : null;

  const subject = `We have your request, ${reference}`;

  const text = [
    `Hi ${firstName},`,
    '',
    `We have your request and it is with our team. Your reference is ${reference}.`,
    ...(itemsLine ? [itemsLine + '.'] : []),
    '',
    'What happens next:',
    ...NEXT_STEPS.map((step, i) => `${i + 1}. ${step}`),
    '',
    `If it is urgent, reply to this email with your reference or call us on ${PHONE_DISPLAY}.`,
    '',
    'The Beco Interiors team',
    'Urban Square, Enterprise Road, Industrial Area, Nairobi',
  ].join('\n');

  const bodyHtml =
    eyebrow('Request received') +
    heading(`Thank you, ${escapeHtml(firstName)}.`) +
    paragraph('We have your request and it is with our team. Keep this reference, it is how we find your list.') +
    referenceBox('Your reference', reference, itemsLine ? [['Request', itemsLine]] : []) +
    sectionLabel('What happens next') +
    steps(NEXT_STEPS) +
    paragraph('Need it sooner? Reply to this email, or reach us directly.') +
    contactButtons(`Hi Beco, following up on my quote request ${reference}`) +
    divider() +
    signOff();

  const html = renderEmailShell({
    preview: `We have your request. Reference ${reference}.`,
    bodyHtml,
    hero: emailHero('request'),
  });

  return { subject, text, html };
}
