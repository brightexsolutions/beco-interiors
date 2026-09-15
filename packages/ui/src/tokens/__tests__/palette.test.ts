import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../palette';
import { contrastRatio, PAIRS } from '../contrast-check';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../tokens.css'), 'utf8');

describe('palette', () => {
  it('tokens.css contains every value in palette.ts, so they cannot drift', () => {
    for (const [name, hex] of Object.entries(PALETTE)) {
      expect(css, `${name} (${hex}) missing from tokens.css`).toContain(hex);
    }
  });

  it('has no secondary colour. The guideline calls the palette intentionally narrow', () => {
    // The prototype's gold is retired, not merely unused. See D2.
    expect(css.toLowerCase()).not.toContain('#c4972a');
  });

  it('white on pure warm red FAILS AA for body text, which is why the deep variant exists', () => {
    expect(contrastRatio(PALETTE.highVisWhite, PALETTE.warmRed)).toBeLessThan(4.5);
    expect(contrastRatio(PALETTE.highVisWhite, PALETTE.warmRedDeep)).toBeGreaterThanOrEqual(4.5);
  });

  it('every declared pair meets its threshold', () => {
    for (const p of PAIRS) {
      expect(contrastRatio(p.fg, p.bg), p.name).toBeGreaterThanOrEqual(p.min);
    }
  });
});
