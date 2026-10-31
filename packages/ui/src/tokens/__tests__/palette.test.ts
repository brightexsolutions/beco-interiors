import { readdirSync, readFileSync, statSync } from 'node:fs';
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

  it('dashboard dark remaps charcoal and white, and leaves ink and paper alone', () => {
    const dark = css.slice(css.indexOf('html.dark'));
    expect(dark).toContain('--color-charcoal: #eceef0');
    expect(dark).toContain('--color-high-vis-white: #141b22');
    expect(dark).not.toContain('--color-ink:');
    expect(dark).not.toContain('--color-paper:');
  });

  it('a fixed palette surface restores exactly the light values, so it cannot drift from them (D161)', () => {
    const theme = css.slice(css.indexOf('@theme'), css.indexOf('}', css.indexOf('@theme')));
    const block = css.slice(css.indexOf('html.dark .beco-fixed-palette'));
    const restored = [...block.slice(0, block.indexOf('}')).matchAll(/(--color-[\w-]+):\s*(#[0-9a-f]{6})/gi)];
    expect(restored.length).toBeGreaterThanOrEqual(10);
    for (const [, name, hex] of restored) {
      expect(theme, `${name} should be ${hex} in the light palette`).toMatch(new RegExp(`${name}:\\s*${hex}`, 'i'));
    }
  });

  it('dark mode status text reads on its own tile and on the page, at AA (D161)', () => {
    const dark = css.slice(css.indexOf('html.dark {'), css.indexOf('}', css.indexOf('html.dark {')));
    const value = (name: string) => dark.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))![1]!;
    const page = value('high-vis-white');
    const pairs: Array<[string, string]> = [
      ['success-deep', 'success-soft'],
      ['warning', 'warning-soft'],
      ['info', 'info-soft'],
      ['danger', 'danger-soft'],
      ['charcoal', 'tint'],
    ];
    for (const [text, tile] of pairs) {
      expect(contrastRatio(value(text), value(tile)), `${text} on ${tile}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(value(text), page), `${text} on the dark page`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('never puts swapping white type on a fill that does not swap (D161)', () => {
    // Warm Red and the WhatsApp green stay put in dark mode; high-vis-white
    // turns near black, so type on them has to be paper.
    const roots = [join(here, '../../components'), join(here, '../../../../../apps/dashboard/src')];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name !== '__tests__' && name !== 'node_modules') walk(path);
        } else if (name.endsWith('.tsx')) {
          for (const m of readFileSync(path, 'utf8').matchAll(/["'`][^"'`]*\bbg-(?:warm-red(?:-deep)?|whatsapp)\b[^"'`]*\btext-high-vis-white\b[^"'`]*["'`]/g)) {
            offenders.push(`${path}: ${m[0].slice(0, 80)}`);
          }
        }
      }
    };
    roots.forEach(walk);
    expect(offenders).toEqual([]);
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
