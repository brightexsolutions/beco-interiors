import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// next.config.ts copies the pdf.js worker into public/ when it loads. That
// is a build step, not something a test should do to the working tree.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, copyFileSync: vi.fn(), mkdirSync: vi.fn() };
});

const { metadata } = await import('../layout');
const { default: robots } = await import('../robots');
const { default: nextConfig } = await import('../../../next.config');

/**
 * The dashboard is never in search and never previews like the shop. Three
 * independent layers, each tested on its own, because any one of them is
 * easy to lose in a refactor and nothing visible breaks when it goes.
 */
describe('dashboard search exclusion', () => {
  it('sets noindex, nofollow at the root, so every route inherits it', () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    });
  });

  it('publishes no Open Graph or Twitter card, and no shop copy, at the root', () => {
    expect(metadata.openGraph).toBeUndefined();
    expect(metadata.twitter).toBeUndefined();
    expect(String(metadata.description)).not.toMatch(/premium|materials in nairobi/i);
  });

  it('disallows every path in robots.txt', () => {
    const rules = [robots().rules].flat();
    expect(rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    expect(robots().sitemap).toBeUndefined();
  });

  it('sends X-Robots-Tag: noindex, nofollow on every path', async () => {
    const all = await nextConfig.headers!();
    const everyPath = all.find((rule) => rule.source === '/:path*');
    expect(everyPath?.headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
  });

  it('has no page that opts back into indexing or sets its own share card', () => {
    // Vitest runs from the repository root; jsdom gives import.meta.url an
    // http scheme, so the path is built from the working directory instead.
    const appDir = join(process.cwd(), 'apps/dashboard/src/app');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name !== '__tests__') walk(path);
        } else if (/^(page|layout)\.tsx$/.test(name)) files.push(path);
      }
    };
    walk(appDir);
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\bindex:\s*true/);
      expect(source, file).not.toMatch(/openGraph|twitter:/);
    }
  });
});
