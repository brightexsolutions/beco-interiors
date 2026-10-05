import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * D125: corners come from two tokens, a 4px control and a 6px card, never an
 * arbitrary `rounded-[Npx]`, so the radius can be tuned in one place and a
 * stray 2px square-looking corner cannot creep back in.
 */
const tokens = readFileSync(fileURLToPath(new URL('../tokens.css', import.meta.url)), 'utf8');
const repo = fileURLToPath(new URL('../../../../../', import.meta.url));

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === '.next' || name === '__tests__') return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });

/**
 * The exceptions D125 names: the WhatsApp card's speech nub and chat bubbles,
 * drawn to look like WhatsApp's own; the chart legend swatches; and the
 * dashboard's phone bottom navigation, which keeps its own 10px (D111).
 */
const ALLOWED = [
  /rotate-45 rounded-\[2px\]/,
  /rounded-lg rounded-tl-\[3px\]/,
  /rounded-\[1px\]/,
  /rounded-\[10px\]/,
];

describe('corner radius tokens (D125)', () => {
  it('sets a 4px control and a 6px card, and nothing above 6px for a card', () => {
    expect(tokens).toMatch(/--radius-control:\s*4px;/);
    expect(tokens).toMatch(/--radius-card:\s*6px;/);
    expect(tokens).not.toMatch(/--radius-button:/);
  });

  it('uses no arbitrary pixel radius in either app or the shared components', () => {
    const offenders = ['apps/storefront/src', 'apps/dashboard/src', 'packages/ui/src']
      .flatMap((dir) => sources(join(repo, dir)))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .filter((line) => /rounded(-[a-z]{1,2})?-\[\d+px\]/.test(line) && !ALLOWED.some((ok) => ok.test(line)))
          .map((line) => `${file.slice(repo.length)}: ${line.trim().slice(0, 80)}`),
      );
    expect(offenders).toEqual([]);
  });
});
