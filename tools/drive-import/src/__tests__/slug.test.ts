import { describe, expect, it } from 'vitest';
import { slugify, titleise } from '../slug';

/**
 * The 24 real folder names, and the slugs the M1 seed already inserted.
 * If these ever disagree the pipeline creates duplicates of products that
 * already exist, which is why this test exists rather than being assumed.
 */
const REAL: Array<[folder: string, slug: string, title: string]> = [
  ['AMBER JADE', 'amber-jade', 'Amber Jade'],
  ['BEVERLY GOLD', 'beverly-gold', 'Beverly Gold'],
  ['CALCATTA GOLD', 'calcatta-gold', 'Calcatta Gold'],
  ['CYPRUS LIGHT GREY', 'cyprus-light-grey', 'Cyprus Light Grey'],
  ['ROME PHANTOM IVORY', 'rome-phantom-ivory', 'Rome Phantom Ivory'],
  ['SANDSTONE BEIGE', 'sandstone-beige', 'Sandstone Beige'],
  ['TRAVERTINE BEIGE', 'travertine-beige', 'Travertine Beige'],
  ['BVLGARI', 'bvlgari', 'Bvlgari'],
];

describe('slugify', () => {
  it('matches the slugs the seed already inserted', () => {
    for (const [folder, slug] of REAL) expect(slugify(folder), folder).toBe(slug);
  });

  it('handles the category folder names too', () => {
    expect(slugify('12MM SINTERED STONES')).toBe('12mm-sintered-stones');
    expect(slugify('ACCOUSTIC WALL PANELS')).toBe('accoustic-wall-panels');
    expect(slugify('SPC FLOORING')).toBe('spc-flooring');
  });

  it('collapses runs of separators rather than producing empty segments', () => {
    expect(slugify('LIMESTONE   IVORY')).toBe('limestone-ivory');
    expect(slugify('SLAB / STONE')).toBe('slab-stone');
    expect(slugify('  PURE WHITE  ')).toBe('pure-white');
  });

  it('never produces a leading or trailing dash', () => {
    for (const name of ['- ODD -', '  SPACED  ', '///SLASHES///']) {
      const s = slugify(name);
      expect(s.startsWith('-'), name).toBe(false);
      expect(s.endsWith('-'), name).toBe(false);
    }
  });
});

describe('titleise', () => {
  it('turns shouted folder names into page titles', () => {
    for (const [folder, , title] of REAL) expect(titleise(folder), folder).toBe(title);
  });
});
