import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Beco asked on 7 October 2026 for the staff image section on About to come
 * off: the plate for Irene and the three placeholder sales seats. The page
 * reads live data, so this holds its source, comments stripped, to that.
 */
const source = readFileSync('apps/storefront/src/app/about/page.tsx', 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('About page team section', () => {
  it('keeps the heading and the role cards', () => {
    expect(source).toContain('Who you would be talking to.');
    expect(source).toContain("'The sales team'");
  });

  it('shows no staff name plates', () => {
    expect(source).not.toMatch(/Who you would meet today/);
    expect(source).not.toMatch(/Irene Oketch/);
    expect(source).not.toMatch(/Sales, Urban Square/);
    expect(source).not.toMatch(/Sales person/);
  });
});
