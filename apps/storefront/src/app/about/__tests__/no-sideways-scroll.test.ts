import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The blurred glow behind the About photograph is drawn 40px past its frame
 * (-inset-10). On a 390px phone that pushed the page 8px wider than the
 * screen, so the whole page slid sideways under a thumb. Its section clips
 * horizontal overflow; jsdom cannot lay out, so this holds the source to it.
 */
describe('About page sections with an oversized glow', () => {
  const source = readFileSync('apps/storefront/src/app/about/page.tsx', 'utf8');

  it('clips sideways overflow on every section that holds a negative inset glow', () => {
    const sections = source.split('<section').slice(1);
    const withGlow = sections.filter((s) => /-inset-\d/.test(s.split('</section>')[0]!));
    expect(withGlow.length).toBeGreaterThan(0);
    for (const s of withGlow) expect(s.slice(0, 200)).toMatch(/overflow-x-clip|overflow-hidden/);
  });
});
