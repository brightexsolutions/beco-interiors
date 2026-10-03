import { describe, expect, it } from 'vitest';
import { buildRootMetadata, DEFAULT_OG_IMAGE } from '../seo';
import { localBusinessSchema } from '@/components/local-business-schema';
import { SITE } from '../site';

describe('buildRootMetadata', () => {
  it('carries the Search Console tag only when Beco\'s own code is set on the deployment', () => {
    expect(buildRootMetadata({}).verification).toBeUndefined();
    expect(buildRootMetadata({ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: ' abc123 ' }).verification).toEqual({ google: 'abc123' });
  });

  it('gives every page a share image and a large card by default', () => {
    const meta = buildRootMetadata({});
    expect((meta.openGraph as { images: unknown[] }).images).toEqual([DEFAULT_OG_IMAGE]);
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
});
