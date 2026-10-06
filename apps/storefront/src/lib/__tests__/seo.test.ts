import { describe, expect, it } from 'vitest';
import {
  buildRootMetadata, catalogueOgImage, fullTitle, HOME_TITLE, LOGO_URL, ogOrigin, OG_SECTION_KEYS, OG_SECTIONS,
  isOgSection, pageMetadata, productDescription, productTitle, rangeDescription, sectionOgImage, snippet,
} from '../seo';
import { localBusinessSchema } from '@/components/local-business-schema';
import { SITE } from '../site';

const PROD = { VERCEL_ENV: 'production' };

describe('ogOrigin', () => {
  it('is the canonical origin on production, whatever else is set', () => {
    expect(ogOrigin({ VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', VERCEL_URL: 'x.vercel.app' }))
      .toBe('https://www.beco.co.ke');
  });

  it('is the preview deployment itself on a Vercel preview, so a preview link previews', () => {
    expect(ogOrigin({ VERCEL_ENV: 'preview', VERCEL_URL: 'beco-abc.vercel.app' })).toBe('https://beco-abc.vercel.app');
  });

  it('honours an absolute NEXT_PUBLIC_SITE_URL locally, reduced to its origin', () => {
    expect(ogOrigin({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000/some/path' })).toBe('http://localhost:3000');
  });

  it('never returns a relative or malformed origin', () => {
    expect(ogOrigin({})).toBe('https://www.beco.co.ke');
    expect(ogOrigin({ NEXT_PUBLIC_SITE_URL: '/relative' })).toBe('https://www.beco.co.ke');
    expect(ogOrigin({ NEXT_PUBLIC_SITE_URL: 'http://' })).toBe('https://www.beco.co.ke');
    expect(ogOrigin({ VERCEL_ENV: 'preview' })).toBe('https://www.beco.co.ke');
  });
});

describe('share images', () => {
  it('builds an absolute 1200 by 630 JPEG card for every section', () => {
    for (const section of OG_SECTION_KEYS) {
      const image = sectionOgImage(section, PROD);
      expect(image).toEqual({
        url: `https://www.beco.co.ke/og/${section}`, width: 1200, height: 630, alt: OG_SECTIONS[section].alt, type: 'image/jpeg',
      });
    }
  });

  it('encodes a catalogue slug into the card URL', () => {
    expect(catalogueOgImage('product', 'a b', 'Alt', PROD).url).toBe('https://www.beco.co.ke/og/product/a%20b');
  });

  it('knows its own sections and nothing else', () => {
    expect(isOgSection('home')).toBe(true);
    expect(isOgSection('toString')).toBe(false);
    expect(isOgSection('product')).toBe(false);
  });
});

describe('pageMetadata', () => {
  const meta = pageMetadata({
    title: 'Hinges in Nairobi', description: 'D', path: '/shop/hinges', image: sectionOgImage('shop', PROD),
  });

  it('states og:url, title, site name, locale and image itself rather than inheriting', () => {
    expect(meta.openGraph).toMatchObject({
      url: 'https://www.beco.co.ke/shop/hinges', title: 'Hinges in Nairobi | Beco Interiors', siteName: 'Beco Interiors',
      locale: 'en_KE', type: 'website', images: [sectionOgImage('shop', PROD)],
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', title: 'Hinges in Nairobi | Beco Interiors' });
    expect(meta.alternates?.canonical).toBe('/shop/hinges');
    expect(meta.robots).toBeUndefined();
  });

  it('carries an absolute title and the home og:url with its trailing slash', () => {
    const home = pageMetadata({ title: HOME_TITLE, absoluteTitle: true, description: 'D', path: '/', image: sectionOgImage('home', PROD) });
    expect(home.title).toEqual({ absolute: HOME_TITLE });
    expect(home.openGraph).toMatchObject({ url: 'https://www.beco.co.ke/', title: HOME_TITLE });
  });

  it('marks a post as an article with its publish date', () => {
    const post = pageMetadata({
      title: 'T', description: 'D', path: '/blog/t', image: sectionOgImage('blog', PROD), type: 'article', publishedTime: '2026-09-01',
    });
    expect(post.openGraph).toMatchObject({ type: 'article', publishedTime: '2026-09-01' });
  });
});

describe('copy helpers', () => {
  it('names a product by its own range, never "sintered stone" by default', () => {
    expect(productTitle('Amber Jade', '12mm Sintered Stones')).toBe('Amber Jade, 12mm Sintered Stones');
    expect(productTitle('Black Handles', 'Handles')).toBe('Black Handles in Nairobi');
    expect(productTitle('Drawer Rails', null)).toBe('Drawer Rails in Nairobi');
    expect(productDescription('Black Handles', 'Handles')).not.toMatch(/sintered/i);
    expect(productDescription('Amber Jade', '12mm Sintered Stones')).toMatch(/sintered stone/);
  });

  it('cuts a long buying guide at a word, never mid word, within 160 characters', () => {
    const long = 'Sintered stone is made by compacting natural minerals under very high pressure. '.repeat(5);
    const cut = rangeDescription('X', long);
    expect(cut.length).toBeLessThanOrEqual(160);
    expect(cut.endsWith('…')).toBe(true);
    expect(long).toContain(cut.slice(0, -1));
    expect(snippet('**Bold** and\n\n_soft_')).toBe('Bold and soft');
  });

  it('adds the brand to a page title once', () => {
    expect(fullTitle('Shop')).toBe('Shop | Beco Interiors');
    expect(fullTitle('Already | Beco Interiors', true)).toBe('Already | Beco Interiors');
  });
});

describe('buildRootMetadata', () => {
  it('carries the Search Console tag only when Beco\'s own code is set on the deployment', () => {
    expect(buildRootMetadata({}).verification).toBeUndefined();
    expect(buildRootMetadata({ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: ' abc123 ' }).verification).toEqual({ google: 'abc123' });
  });

  it('gives a route with nothing of its own the home card, absolute, and a large card', () => {
    const meta = buildRootMetadata(PROD);
    expect((meta.openGraph as { images: unknown[] }).images).toEqual([sectionOgImage('home', PROD)]);
    expect((meta.twitter as { card: string }).card).toBe('summary_large_image');
    expect(String(meta.metadataBase)).toBe('https://www.beco.co.ke/');
  });
});

describe('localBusinessSchema', () => {
  it('states the confirmed NAP and hours, identical to the site constants', () => {
    const schema = localBusinessSchema();
    expect(schema.telephone).toBe(SITE.phone);
    expect(schema.address.streetAddress).toContain('Urban Square');
    expect(schema.openingHoursSpecification[0]).toMatchObject({ opens: '08:00', closes: '16:00' });
    expect(schema.openingHoursSpecification[1]).toMatchObject({ dayOfWeek: 'Saturday', closes: '14:00' });
    expect(schema['@id']).toBe('https://www.beco.co.ke/#business');
  });

  it('points its logo at the real mark, absolute, and its image at a JPEG card', () => {
    const schema = localBusinessSchema();
    expect(schema.logo).toEqual({ '@type': 'ImageObject', url: LOGO_URL, width: 400, height: 390 });
    expect(LOGO_URL).toBe('https://www.beco.co.ke/logo-mark.png');
    expect(schema.image).toBe('https://www.beco.co.ke/og/home');
  });
});
