import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../../../next.config';

/**
 * Every quote, receipt and report PDF failed in production on 6 October 2026
 * with ENOENT on packages/documents/src/pdf/fonts/titillium-400.ttf: the PDF
 * code builds the font paths at run time, which the file tracer cannot
 * follow, so no deployment carried the files. Local runs read them from disk
 * and passed. next.config names them for every route; this holds it to that,
 * and to the files really being where the glob points.
 */
const APP = 'apps/dashboard';
const PDF = 'packages/documents/src/pdf';

describe('PDF fonts and logo ship with the dashboard', () => {
  const globs = config.outputFileTracingIncludes?.['/**'] ?? [];

  it('names the fonts and the logo for every server route', () => {
    expect(globs).toContain('../../packages/documents/src/pdf/fonts/*.ttf');
    expect(globs).toContain('../../packages/documents/src/pdf/assets/*');
  });

  it('points at real files, the four the PDF registers and the logo', () => {
    for (const glob of globs) expect(existsSync(join(APP, glob.replace(/\/\*[^/]*$/, ''))), glob).toBe(true);
    const fonts = readdirSync(join(PDF, 'fonts')).filter((f) => f.endsWith('.ttf')).sort();
    expect(fonts).toEqual(['cormorant-400.ttf', 'cormorant-500.ttf', 'titillium-400.ttf', 'titillium-600.ttf']);
    expect(existsSync(join(PDF, 'assets', 'logo-mark.png'))).toBe(true);
  });
});
