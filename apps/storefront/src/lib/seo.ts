import type { Metadata } from 'next';
import { SITE } from './site';

/** The canonical origin. Every canonical and every og:url is built on this. */
export const SITE_URL = 'https://www.beco.co.ke';

/** The real logo, served from the storefront's own public folder. */
export const LOGO_URL = `${SITE_URL}/logo-mark.png`;
export const LOGO_SIZE = { width: 400, height: 390 } as const;

/** What WhatsApp, Facebook, LinkedIn and X all render as a large card. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

type Env = Record<string, string | undefined>;

/**
 * Where the share images are served from, which is not always where the
 * canonical points.
 *
 * A scraper fetches og:image by its absolute URL. On production that is the
 * canonical origin. On a Vercel preview it is the preview's own host, or a
 * link shared from a preview would show an image from a domain that does
 * not have it yet. Locally it is NEXT_PUBLIC_SITE_URL, so a local build can
 * be checked end to end. Anything else, including a missing or relative
 * value, falls back to the canonical origin rather than to nothing, because
 * a relative og:image is the classic way a preview breaks.
 */
export const ogOrigin = (env: Env = process.env): string => {
  if (env.VERCEL_ENV === 'production') return SITE_URL;
  if (env.VERCEL_ENV === 'preview' && env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit && /^https?:\/\//.test(explicit)) {
    try {
      return new URL(explicit).origin;
    } catch {
      // A malformed value is ignored, not trusted.
    }
  }
  return SITE_URL;
};

/**
 * The card text and alt for every page that has no photograph of its own.
 * Each is drawn by `/og/[section]` from one of Beco's own site photographs
 * with the real logo, see `lib/og/sections.ts`. Keys are URL segments.
 */
export const OG_SECTIONS = {
  home: {
    eyebrow: 'Beco Interiors · Nairobi',
    title: 'Sintered stone, panels and hardware',
    alt: 'A Beco sintered stone kitchen island in Nairobi, with the Beco Interiors logo',
  },
  shop: {
    eyebrow: 'Shop',
    title: 'Every range we stock',
    alt: 'A charcoal sintered stone kitchen island supplied by Beco Interiors, Nairobi',
  },
  gallery: {
    eyebrow: 'Gallery',
    title: 'Finished interiors in Nairobi',
    alt: 'A finished Nairobi kitchen with a sintered stone island by Beco Interiors',
  },
  about: {
    eyebrow: 'About Beco',
    title: 'Stocked on our own floor',
    alt: 'A curved reception desk in sintered stone, supplied by Beco Interiors',
  },
  contact: {
    eyebrow: 'Showroom',
    title: 'Urban Square, Industrial Area',
    alt: 'A travertine look sintered stone counter, Beco Interiors showroom, Nairobi',
  },
  blog: {
    eyebrow: 'Journal',
    title: 'Buying guides and material notes',
    alt: 'A sintered stone vanity with a bronze basin, from the Beco Interiors journal',
  },
  team: {
    eyebrow: 'Sales team',
    title: 'The people you deal with',
    alt: 'A grey sintered stone kitchen worktop installed by the Beco Interiors team',
  },
  quote: {
    eyebrow: 'Request a quote',
    title: 'One quote for the whole list',
    alt: 'A sandstone beige sintered stone vanity, quoted by Beco Interiors',
  },
  legal: {
    eyebrow: 'Beco Interiors',
    title: 'Terms and privacy',
    alt: 'A gold veined sintered stone vanity by Beco Interiors, Nairobi',
  },
} as const satisfies Record<string, { eyebrow: string; title: string; alt: string }>;

export type OgSection = keyof typeof OG_SECTIONS;
export const OG_SECTION_KEYS = Object.keys(OG_SECTIONS) as OgSection[];
export const isOgSection = (value: string): value is OgSection =>
  Object.prototype.hasOwnProperty.call(OG_SECTIONS, value);

export interface OgImage {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: 'image/jpeg';
}

/** The branded card for a page with no photograph of its own. */
export const sectionOgImage = (section: OgSection, env: Env = process.env): OgImage => ({
  url: `${ogOrigin(env)}/og/${section}`,
  ...OG_SIZE,
  alt: OG_SECTIONS[section].alt,
  type: 'image/jpeg',
});

/** The card drawn from a product's, range's or post's own photograph. */
export const catalogueOgImage = (
  kind: 'product' | 'range' | 'blog',
  slug: string,
  alt: string,
  env: Env = process.env,
): OgImage => ({
  url: `${ogOrigin(env)}/og/${kind}/${encodeURIComponent(slug)}`,
  ...OG_SIZE,
  alt,
  type: 'image/jpeg',
});

/** "Hinges" becomes "Hinges | Beco Interiors"; an absolute title is left alone. */
export const fullTitle = (title: string, absolute = false): string =>
  absolute ? title : `${title} | ${SITE.name}`;

/**
 * Trims long copy to a search snippet at a word boundary, so a description
 * built from a range's buying guide never ends mid word. Markdown emphasis
 * and line breaks are flattened first.
 */
export const snippet = (text: string, max = 158): string => {
  const flat = text.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\s]+$/, '')}…`;
};

export interface PageSeo {
  /** The page part of the title. The layout's template adds the brand. */
  title: string;
  /** True when `title` already carries the brand, as the home page's does. */
  absoluteTitle?: boolean;
  description: string;
  /** The canonical path, always the unfiltered one. */
  path: string;
  image: OgImage;
  robots?: Metadata['robots'];
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Every public page's metadata, complete, from one function.
 *
 * Next merges metadata SHALLOWLY: a page that sets `openGraph` at all
 * replaces the layout's whole `openGraph`, site name and image included.
 * That is how the product page lost its site name and card type while
 * setting only an image. So nothing relies on inheritance here: every page
 * states its own title, description, url, image, alt and card.
 */
export const pageMetadata = (page: PageSeo): Metadata => {
  const title = fullTitle(page.title, page.absoluteTitle);
  const url = page.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${page.path}`;
  const type = page.type ?? 'website';
  return {
    title: page.absoluteTitle ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      type,
      locale: 'en_KE',
      siteName: SITE.name,
      url,
      title,
      description: page.description,
      images: [page.image],
      ...(type === 'article' && page.publishedTime ? { publishedTime: page.publishedTime } : {}),
      ...(type === 'article' && page.modifiedTime ? { modifiedTime: page.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: page.description,
      images: [{ url: page.image.url, alt: page.image.alt, width: page.image.width, height: page.image.height }],
    },
    ...(page.robots ? { robots: page.robots } : {}),
  };
};

const isStone = (categoryName: string | undefined) => /sintered/i.test(categoryName ?? '');

/**
 * A product page's title, before the brand. Every product used to be
 * "<name> sintered stone", hinges and handles included. Now it names the
 * product's own range, and leaves the range out when the name already
 * carries it ("Black Handles", not "Black Handles, Handles").
 */
export const productTitle = (name: string, categoryName?: string | null): string => {
  if (!categoryName) return `${name} in Nairobi`;
  if (name.toLowerCase().includes(categoryName.toLowerCase())) return `${name} in Nairobi`;
  return `${name}, ${categoryName}`;
};

/** A product's description when Beco has not written one for search. */
export const productDescription = (
  name: string,
  categoryName?: string | null,
  shortDescription?: string | null,
): string => {
  const own = shortDescription?.trim();
  if (own) {
    // Beco's own line leads. A short one is finished with where and how to
    // buy, so the snippet is not half empty.
    const closed = /[.!?]$/.test(own) ? own : `${own}.`;
    return snippet(closed.length >= 110 ? closed : `${closed} In stock in Nairobi. Request a quote from Beco Interiors.`);
  }
  if (isStone(categoryName ?? undefined)) {
    return `${name} sintered stone slabs, stocked in Nairobi. Heat, scratch and stain resistant, for worktops, vanities and walls. Request a quote from Beco Interiors.`;
  }
  const range = categoryName ? ` from our ${categoryName} range` : '';
  return `${name}${range}, in stock at our Urban Square showroom in Nairobi. Add it to your list and we price everything you need in one quote.`;
};

/** A range page's title, before the brand. */
export const rangeTitle = (name: string): string => `${name} in Nairobi`;

/** A range page's description: its own buying guide, cut to a snippet. */
export const rangeDescription = (name: string, description?: string | null): string =>
  description?.trim()
    ? snippet(description)
    : `${name} in stock at our Nairobi showroom, Urban Square, Industrial Area. Compare finishes and sizes, then request one quote for your whole list.`;

export const HOME_TITLE ='Sintered Stone and Wall Panels, Nairobi | Beco Interiors';
export const HOME_DESCRIPTION =
  'We stock sintered stone slabs, wall panels, cabinet hardware and accessories at Urban Square, Nairobi. Send us your list and we price all of it in one quote.';

/**
 * The site-wide metadata. Built from the environment so the Search Console
 * verification tag is Beco's own, set on the deployment, never typed into a
 * component (D107, and the ownership rule in docs/OWNERSHIP.md).
 *
 * The share card here is only the fallback for a route that states none of
 * its own, the 404 among them. Every real page calls `pageMetadata`.
 */
export const buildRootMetadata = (env: Env = process.env): Metadata => {
  const verification = env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const image = sectionOgImage('home', env);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: HOME_TITLE,
      // Every page states the brand without each page having to remember to.
      template: `%s | ${SITE.name}`,
    },
    description: HOME_DESCRIPTION,
    applicationName: SITE.name,
    openGraph: {
      type: 'website',
      locale: 'en_KE',
      siteName: SITE.name,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [{ url: image.url, alt: image.alt, width: image.width, height: image.height }],
    },
    ...(verification ? { verification: { google: verification } } : {}),
  };
};
