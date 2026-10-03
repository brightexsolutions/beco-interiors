import type { Metadata } from 'next';
import { SITE } from './site';

export const SITE_URL = 'https://www.beco.co.ke';

/** The image every share falls back to when a page has no photograph of its own. */
export const DEFAULT_OG_IMAGE = {
  url: '/site-photos/living-room-slat-wall.webp',
  width: 1600,
  height: 1067,
  alt: 'A Beco interior: a slatted wall panel behind a living room in Nairobi',
};

/**
 * The site-wide metadata. Built from the environment so the Search Console
 * verification tag is Beco's own, set on the deployment, never typed into a
 * component (D107, and the ownership rule in docs/OWNERSHIP.md).
 */
export const buildRootMetadata = (env: Record<string, string | undefined> = process.env): Metadata => {
  const verification = env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: 'Beco Interiors | Sintered stone and interior materials in Nairobi',
      // Every page states the brand without each page having to remember to.
      template: '%s | Beco Interiors',
    },
    description:
      'Sintered stone slabs, wall panels, hardware and interior accessories, stocked in Nairobi. Request a quote for the whole list at once.',
    applicationName: SITE.name,
    openGraph: {
      type: 'website',
      locale: 'en_KE',
      siteName: SITE.name,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
    },
    ...(verification ? { verification: { google: verification } } : {}),
  };
};
