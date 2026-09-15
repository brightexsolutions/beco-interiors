import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(
  fileURLToPath(new URL('../tokens.css', import.meta.url)),
  'utf8',
);

/**
 * Tailwind 4 detects sources from the directory the build runs in, which is
 * the app, not this package. Without an explicit @source, every class used
 * only inside @beco/ui is dropped from the stylesheet.
 *
 * That failure is close to invisible: the markup is correct, the class names
 * are correct, and the element simply has no background. The primary quote
 * button shipped as white text on white and looked like a missing feature
 * rather than a missing rule.
 */
describe('tailwind source detection', () => {
  it('declares the design system itself as a source', () => {
    expect(tokens).toMatch(/@source\s+["']\.\.\/["']/);
  });

  it('declares it before any component could rely on it', () => {
    expect(tokens.indexOf('@source')).toBeLessThan(tokens.indexOf('@theme'));
  });
});
