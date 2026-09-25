import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, '../fonts');

describe('quote PDF font files', () => {
  it('ships TTF faces, not the site woff2 subsets that render as empty glyphs', () => {
    for (const name of ['titillium-400.ttf', 'titillium-600.ttf', 'cormorant-400.ttf', 'cormorant-500.ttf']) {
      const path = join(fontsDir, name);
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 4).equals(Buffer.from([0x00, 0x01, 0x00, 0x00]))).toBe(true);
      expect(existsSync(path.replace(/\.ttf$/, '.woff2'))).toBe(false);
    }
  });
});
