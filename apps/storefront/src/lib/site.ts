/**
 * Business facts, in one place.
 *
 * The contact block is CONFIRMED, per docs/CONTENT-AUDIT.md. The prototype
 * invented much of its content, but these came from real client contact.
 *
 * Anything unverified stays out of here entirely, so nothing on the site can
 * quietly assert something nobody has checked.
 */
export const SITE = {
  name: 'Beco Interiors',
  /** From the brand guideline strapline, on every page of it. */
  strapline: 'Sintered Stone · Lighting · Panels · Accessories',
  phone: '+254 722 333 730',
  phoneHref: 'tel:+254722333730',
  whatsapp: '254722333730',
  email: 'info@beco.co.ke',
  address: {
    line1: 'Urban Square, Shop 8 & 9',
    line2: 'Enterprise Road, Industrial Area',
    city: 'Nairobi',
  },
  hours: 'Mon to Sat, 8am to 6pm',
} as const;

/**
 * Beco's social profiles.
 *
 * **Empty on purpose.** The approved prototype had Instagram and Facebook
 * buttons, but every one of them was `href="#"` and one carried the label
 * "profile coming soon", so nobody has ever supplied a real URL. A dead social
 * link on a supplier's site is worse than no link: it is a control that
 * advertises an operation and does not perform it, which rule 3 forbids and a
 * lint rule fails the build on.
 *
 * Fill a value in and the icon appears in the footer. Leave it null and it is
 * not rendered at all. That is the whole change needed once Beco confirms the
 * handles.
 */
export const SOCIAL: { name: string; url: string | null }[] = [
  { name: 'Instagram', url: null },
  { name: 'Facebook', url: null },
  { name: 'LinkedIn', url: null },
];

/** Prefilled, so a buyer never has to explain what they are asking about. */
export const whatsappLink = (context?: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    context ? `Hi Beco, I would like to ask about ${context}.` : 'Hi Beco, I would like to enquire.',
  )}`;
