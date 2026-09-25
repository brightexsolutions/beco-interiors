import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(fileURLToPath(new URL('../tokens.css', import.meta.url)), 'utf8');

/**
 * `--spacing` is Tailwind's step unit, and every numeric spacing utility
 * multiplies it. Setting it to 0.5rem to express "8px base" silently doubled
 * the whole system: the 44px touch target became 88px, and section padding
 * became 224px.
 *
 * It is worth a test because the failure is invisible in review. Nothing looks
 * wrong in the markup, every class name reads correctly, and the page simply
 * comes out too big.
 */
describe('the spacing scale', () => {
  it('uses the 4px step unit the utility names assume', () => {
    const match = tokens.match(/--spacing:\s*([\d.]+)rem/);
    expect(match, '--spacing must be declared in @theme').not.toBeNull();
    expect(Number(match![1])).toBe(0.25);
  });

  it('keeps h-11 on the 44px touch target', () => {
    const step = Number(tokens.match(/--spacing:\s*([\d.]+)rem/)![1]) * 16;
    // The touch target rule is 44px minimum, and h-11 is the utility used for
    // it throughout. At a 0.5rem step it silently became 88px.
    expect(11 * step).toBe(44);
  });

  it('keeps the section rhythm near the 120/88/64 the design direction sets', () => {
    const step = Number(tokens.match(/--spacing:\s*([\d.]+)rem/)![1]) * 16;
    expect(28 * step).toBe(112);
    expect(20 * step).toBe(80);
  });
});
