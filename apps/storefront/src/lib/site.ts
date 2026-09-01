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
 * **URLs are placeholders until Beco confirms the handles.** The approved
 * prototype had Instagram and Facebook buttons and every one was `href="#"`,
 * with one labelled "profile coming soon", so no real URL has ever been
 * supplied.
 *
 * A null here still DRAWS the icon, it just does not make it a link: see
 * SocialLinks. That keeps the row visually complete without shipping a
 * control that advertises an operation and does not perform it, which rule 3
 * forbids and a lint rule fails the build on.
 *
 * Filling in a URL is the whole change. Order is the order they appear.
 */
export const SOCIAL: { name: string; url: string | null }[] = [
  { name: 'Instagram', url: null },
  { name: 'Facebook', url: null },
  { name: 'YouTube', url: null },
  { name: 'TikTok', url: null },
  { name: 'X', url: null },
];

/**
 * The showroom film.
 *
 * Beco's own footage, from the SITE VIDEOS folder in Drive. All 52 clips there
 * are PORTRAIT phone video, which is why the section is built around a tall
 * frame rather than a full bleed band: cropping 9:16 into 21:9 throws away
 * most of the picture.
 *
 * The source arrives as QuickTime .MOV between 8 and 80MB, which no browser
 * should be asked to download. This one is transcoded to MP4 at 1.7MB, which
 * fits the page budget on a Nairobi mobile connection. That step is manual
 * today; see docs/PLAN.md for folding it into the import pipeline.
 */
export const SHOWROOM_FILM: { src: string; type: string; poster: string } | null = {
  src: '/video/showroom.mp4',
  type: 'video/mp4',
  poster: '/video/showroom-poster.jpg',
};

/** Prefilled, so a buyer never has to explain what they are asking about. */
export const whatsappLink = (context?: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    context ? `Hi Beco, I would like to ask about ${context}.` : 'Hi Beco, I would like to enquire.',
  )}`;
