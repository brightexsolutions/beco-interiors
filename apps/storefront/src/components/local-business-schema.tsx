import { SITE } from '@/lib/site';
import { SITE_URL } from '@/lib/seo';

/**
 * LocalBusiness, not Organization, because Beco sells to people who can
 * drive to Urban Square. The NAP here must match the footer and the Google
 * Business Profile character for character, or the mismatch is a ranking
 * drag. Rendered on the home, contact and about pages, the three a search
 * for the business lands on, from one definition so they cannot disagree.
 */
export const localBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'HomeGoodsStore',
  '@id': `${SITE_URL}/#business`,
  name: SITE.name,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-mark.png`,
  image: `${SITE_URL}/site-photos/living-room-slat-wall.webp`,
  telephone: SITE.phone,
  email: SITE.email,
  priceRange: 'KES',
  address: {
    '@type': 'PostalAddress',
    streetAddress: `${SITE.address.line1}, ${SITE.address.line2}`,
    addressLocality: SITE.address.city,
    addressCountry: 'KE',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '16:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '08:00',
      closes: '14:00',
    },
  ],
  areaServed: { '@type': 'City', name: 'Nairobi' },
  sameAs: ['https://www.instagram.com/becointeriorskenya', 'https://www.tiktok.com/@beco.interiors'],
});

export function LocalBusinessSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema()) }}
    />
  );
}
