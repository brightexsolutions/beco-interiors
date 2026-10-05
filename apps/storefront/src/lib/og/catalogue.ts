import { readFile } from 'node:fs/promises';
import type { ProductImage } from '@beco/types';
import { absoluteCatalogueUrl } from '../image-loader';
import { primaryImage, type CatalogueProduct } from '../products';
import { OG_SECTIONS, ogOrigin, type OgSection } from '../seo';
import { renderOgCard, type CardText } from './card';
import { SECTION_PHOTOS } from './sections';

/** The largest derivative the import writes. The card is 1200 wide. */
const SOURCE_WIDTH = 1600;
const FETCH_TIMEOUT_MS = 8_000;

/**
 * One catalogue photograph's bytes, or null. Never throws: a scraper that
 * gets an error gets no card at all, so every failure here falls back to a
 * section photograph instead.
 */
export const fetchCataloguePhoto = async (
  key: string,
  base: string = ogOrigin(),
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer | null> => {
  try {
    const response = await fetchImpl(absoluteCatalogueUrl(key, SOURCE_WIDTH, base), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    if (!(response.headers.get('content-type') ?? '').startsWith('image/')) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
};

/** A section's own card, from its own site photograph and text. */
export const renderSectionCard = async (section: OgSection, text: CardText = OG_SECTIONS[section]) => {
  const { file, position } = SECTION_PHOTOS[section];
  return renderOgCard(await readFile(file), text, position);
};

/**
 * A card for a product, range or post: its own photograph when it has one
 * that loads, otherwise the section photograph, still carrying the page's
 * own name so the preview is never generic.
 */
export const renderCatalogueCard = async (
  photoKey: string | undefined,
  text: CardText,
  fallback: OgSection,
  fetchPhoto: (key: string) => Promise<Buffer | null> = (key) => fetchCataloguePhoto(key),
): Promise<Buffer> => {
  if (photoKey) {
    const photo = await fetchPhoto(photoKey);
    if (photo) {
      try {
        return await renderOgCard(photo, text, 'attention');
      } catch {
        // A file sharp cannot read falls through to the section photograph.
      }
    }
  }
  return renderSectionCard(fallback, text);
};

/**
 * Which photograph speaks for a whole range in a wide card: an installed
 * shot first, since a room crops to 1200 by 630 better than a slab does,
 * then a bookmatched pair, then any product's primary photograph.
 */
export const rangeSharePhoto = (products: CatalogueProduct[]): ProductImage | undefined => {
  const all = products.flatMap((p) => p.images ?? []);
  return (
    all.find((i) => i.role === 'application') ??
    all.find((i) => i.role === 'bookmatch') ??
    products.map(primaryImage).find((i) => i !== undefined)
  );
};
