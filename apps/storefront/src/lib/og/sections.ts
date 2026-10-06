import type { OgSection } from '../seo';

/**
 * Which of Beco's own site photographs stands behind each section's share
 * card. Only Beco's own photography: the licensed stock in `public/rooms`
 * and `public/hero` is not theirs to put a logo on.
 *
 * Each URL is a literal `new URL(..., import.meta.url)` so the bundler copies
 * the file into the server output; a computed path would not be followed,
 * and the fallback card a catalogue route serves at request time would fail
 * once deployed.
 *
 * The sources are portrait, 1600 by 2133, so `position` says which band of
 * the frame survives the crop to 1200 by 630.
 */
export const SECTION_PHOTOS: Record<OgSection, { file: URL; position: 'centre' | 'top' | 'bottom' }> = {
  home: { file: new URL('../../../public/site-photos/kitchen-fluted-island.webp', import.meta.url), position: 'centre' },
  shop: { file: new URL('../../../public/site-photos/kitchen-charcoal-island.webp', import.meta.url), position: 'centre' },
  gallery: { file: new URL('../../../public/site-photos/kitchen-pendant-island.webp', import.meta.url), position: 'centre' },
  about: { file: new URL('../../../public/site-photos/reception-curved-desk.webp', import.meta.url), position: 'centre' },
  contact: { file: new URL('../../../public/site-photos/bar-travertine-counter.webp', import.meta.url), position: 'centre' },
  blog: { file: new URL('../../../public/site-photos/vanity-floating-bronze.webp', import.meta.url), position: 'centre' },
  team: { file: new URL('../../../public/site-photos/karen-kitchen-cyprus-grey.webp', import.meta.url), position: 'centre' },
  quote: { file: new URL('../../../public/site-photos/karen-vanity-sandstone-beige.webp', import.meta.url), position: 'centre' },
  legal: { file: new URL('../../../public/site-photos/vanity-gold-marble.webp', import.meta.url), position: 'centre' },
};
