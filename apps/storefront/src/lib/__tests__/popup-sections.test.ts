import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { POPUP_SECTIONS } from '@beco/types';

// The dashboard offers exactly POPUP_SECTIONS. A key with no mark on the site
// would be a choice that never fires; a mark with no key is unreachable.
const root = join(process.cwd(), 'apps/storefront/src');
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });

const marks = sources(root).flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/data-popup-section="([a-z0-9-]+)"/g)].map((m) => m[1]),
);

describe('pop up sections (D159)', () => {
  it('marks every section the dashboard offers, once', () => {
    for (const key of POPUP_SECTIONS) {
      expect(marks.filter((mark) => mark === key), key).toHaveLength(1);
    }
  });

  it('marks nothing the dashboard cannot offer', () => {
    expect(marks.filter((mark) => !(POPUP_SECTIONS as readonly string[]).includes(mark!))).toEqual([]);
  });
});
