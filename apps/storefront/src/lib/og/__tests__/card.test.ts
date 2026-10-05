// @vitest-environment node
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { BAND_HEIGHT, OG_MAX_BYTES, jpegResponse, renderBand, renderOgCard } from '../card';
import { fetchCataloguePhoto, rangeSharePhoto, renderCatalogueCard, renderSectionCard } from '../catalogue';
import { OG_SECTION_KEYS } from '../../seo';
import type { CatalogueProduct } from '../../products';

/**
 * What a scraper actually receives. WhatsApp shows a bare link, no card, for
 * a WebP, an oversized file, or an image it cannot fetch, so each of those
 * is held here rather than trusted.
 */
const photo = () => readFile(new URL('../../../../public/site-photos/kitchen-fluted-island.webp', import.meta.url));

const expectShareable = async (jpeg: Buffer) => {
  const meta = await sharp(jpeg).metadata();
  expect(meta.format).toBe('jpeg');
  expect(meta.width).toBe(1200);
  expect(meta.height).toBe(630);
  // Baseline, not progressive: the widest scraper support.
  expect(meta.isProgressive).toBe(false);
  expect(jpeg.byteLength).toBeLessThanOrEqual(OG_MAX_BYTES);
};

describe('renderOgCard', () => {
  it('turns a WebP photograph into a 1200 by 630 baseline JPEG under 300KB', async () => {
    await expectShareable(await renderOgCard(await photo(), { eyebrow: 'Shop', title: 'Amber Jade' }));
  }, 30_000);

  it('draws the band in the brand charcoal across the full width', async () => {
    const band = await renderBand({ eyebrow: 'Hardware', title: 'Hinges' });
    const meta = await sharp(band).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(BAND_HEIGHT);
    // Bottom right corner, clear of logo and text, is #101820.
    const { data, info } = await sharp(band).raw().toBuffer({ resolveWithObject: true });
    const at = ((info.height - 4) * info.width + (info.width - 4)) * info.channels;
    expect([data[at], data[at + 1], data[at + 2]]).toEqual([0x10, 0x18, 0x20]);
  }, 30_000);

  it('survives a title far too long for one line', async () => {
    await expectShareable(await renderOgCard(await photo(), { eyebrow: 'Journal', title: 'A'.repeat(300) }));
  }, 30_000);
});

describe('renderSectionCard', () => {
  it.each(OG_SECTION_KEYS)('renders the %s card from a real site photograph', async (section) => {
    await expectShareable(await renderSectionCard(section));
  }, 30_000);
});

describe('renderCatalogueCard', () => {
  it('uses the catalogue photograph when it loads', async () => {
    const fetchPhoto = vi.fn(async () => photo());
    const card = await renderCatalogueCard('12mm/amber-jade/slab-0', { eyebrow: 'Stone', title: 'Amber Jade' }, 'shop', fetchPhoto);
    expect(fetchPhoto).toHaveBeenCalledWith('12mm/amber-jade/slab-0');
    await expectShareable(card);
  }, 30_000);

  it('falls back to the section photograph when the photograph cannot be fetched', async () => {
    const card = await renderCatalogueCard('missing/key', { eyebrow: 'Stone', title: 'Amber Jade' }, 'shop', async () => null);
    await expectShareable(card);
  }, 30_000);

  it('falls back when the bytes are not an image sharp can read', async () => {
    const card = await renderCatalogueCard('bad/key', { eyebrow: 'Stone', title: 'X' }, 'blog', async () => Buffer.from('not an image'));
    await expectShareable(card);
  }, 30_000);

  it('never fetches when there is no photograph at all', async () => {
    const fetchPhoto = vi.fn();
    await expectShareable(await renderCatalogueCard(undefined, { eyebrow: 'Hardware', title: 'Hinges' }, 'shop', fetchPhoto));
    expect(fetchPhoto).not.toHaveBeenCalled();
  }, 30_000);
});

describe('fetchCataloguePhoto', () => {
  const ok = (type: string) =>
    vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': type } }));

  it('asks for the 1600 wide derivative, absolute against the base', async () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_HOST', '/api/img');
    const fetchImpl = ok('image/webp');
    const bytes = await fetchCataloguePhoto('a/b/slab-0', 'https://www.beco.co.ke', fetchImpl as unknown as typeof fetch);
    expect(bytes).toEqual(Buffer.from([1, 2, 3]));
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe('https://www.beco.co.ke/api/img/a/b/slab-0-1600.webp');
    vi.unstubAllEnvs();
  });

  it('returns null on a 404, a non image body, or a network failure', async () => {
    const notFound = vi.fn(async () => new Response('no', { status: 404 }));
    const html = ok('text/html');
    const boom = vi.fn(async () => { throw new Error('offline'); });
    for (const f of [notFound, html, boom]) {
      expect(await fetchCataloguePhoto('a/b', 'https://x.test', f as unknown as typeof fetch)).toBeNull();
    }
  });
});

describe('rangeSharePhoto', () => {
  const img = (role: string, path: string) => ({ role, path, alt: path, width: 1, height: 1 });
  const product = (images: ReturnType<typeof img>[]) => ({ images }) as unknown as CatalogueProduct;

  it('prefers an installed room, then a bookmatch, then any primary', () => {
    expect(rangeSharePhoto([product([img('slab', 's')]), product([img('application', 'a')])])?.path).toBe('a');
    expect(rangeSharePhoto([product([img('slab', 's'), img('bookmatch', 'b')])])?.path).toBe('b');
    expect(rangeSharePhoto([product([]), product([img('slab', 's')])])?.path).toBe('s');
    expect(rangeSharePhoto([])).toBeUndefined();
  });
});

describe('jpegResponse', () => {
  it('serves image/jpeg with a length and a public cache', async () => {
    const res = jpegResponse(Buffer.from([1, 2]), 60);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('content-length')).toBe('2');
    expect(res.headers.get('cache-control')).toContain('public, max-age=60');
  });
});
