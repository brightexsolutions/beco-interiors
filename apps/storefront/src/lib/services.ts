/**
 * What Beco actually does beyond supplying material, grounded in
 * docs/BECO-COMPANY-PROFILE.md's own "What we do" and "The client journey"
 * sections rather than invented: consultation, a site assessment ahead of
 * anything fabricated or installed, fabrication and installation itself
 * (sintered stone and wall panels specifically, per the profile, not every
 * range), and delivery. Reported directly as missing, clearly, from both
 * Home and About: the range and the quote tool were both on the page, but
 * nothing said plainly that Beco measures, fits and delivers as well as
 * sells.
 *
 * Each one carries its own "Book a consultation" action, on direct request,
 * opening WhatsApp with the service already named in the message rather
 * than a generic enquiry, so the button says what it does and the message
 * on the other end proves it.
 */
export const SERVICES = [
  {
    title: 'Consultation and selection',
    body: 'Real samples, side by side: colours, finishes and thicknesses weighed against your project and your budget, so the choice is informed rather than the most expensive option in the room.',
  },
  {
    title: 'Site assessment',
    body: 'Anything that needs fabrication or installation gets a measurement or a site visit before the quote, not after, so what you are quoted is what actually fits.',
  },
  {
    title: 'Fabrication and installation',
    body: 'Our own technical team fabricates and installs sintered stone and wall panels, checked against the same specification the quote promised.',
  },
  {
    title: 'Delivery',
    body: 'Collect from Urban Square, Industrial Area, or we deliver to site, coordinated alongside installation where that applies.',
  },
] as const;
