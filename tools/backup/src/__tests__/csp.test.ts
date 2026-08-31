import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The CSP is security policy, so it is asserted rather than trusted.
 *
 * This exists because a real bug shipped: the policy omitted 'unsafe-eval',
 * which React needs in DEVELOPMENT for reconstructing callstacks, so the dev
 * server rendered a console error on every page. The fix must not swing the
 * other way and loosen production, which is what these tests pin down.
 */
const read = (app: string) => readFileSync(`apps/${app}/next.config.ts`, 'utf8');

/**
 * Comments stripped, so an assertion cannot be satisfied or broken by prose.
 * The first version of this test failed against its own comment explaining
 * that there is no fonts.gstatic.com entry.
 */
const policy = (app: string) =>
  read(app)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');

describe.each(['storefront', 'dashboard'])('%s CSP', (app) => {
  const src = read(app);

  it("allows 'unsafe-eval' in development only, never unconditionally", () => {
    // Present, but guarded by isDev. React never uses eval in production.
    expect(src).toContain("isDev ? [\"'unsafe-eval'\"] : []");
    // It must not appear as a plain always-on entry.
    expect(src).not.toMatch(/^\s*"'unsafe-eval'",\s*$/m);
  });

  it("keeps font-src as 'self' only, which self hosting is what makes possible", () => {
    expect(src).toContain(`"font-src 'self'"`);
    // A Google Fonts entry here would silently undo D3 and the self hosting.
    const code = policy(app);
    expect(code).not.toContain('fonts.gstatic.com');
    expect(code).not.toContain('fonts.googleapis.com');
  });

  it('denies framing and object embedding outright', () => {
    expect(src).toContain(`"frame-ancestors 'none'"`);
    expect(src).toContain(`"object-src 'none'"`);
  });

  it('has no wildcard source anywhere', () => {
    // A single stray * would make the whole policy decorative.
    const code = policy(app);
    const csp = code.slice(code.indexOf('const csp = ['), code.indexOf("].join('; ')"));
    expect(csp).not.toMatch(/['"]\s*\*\s*['"]/);
    expect(csp).not.toContain('*.');
  });

  it('carries the full header set, not only a CSP', () => {
    for (const header of [
      'Strict-Transport-Security',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(src, `${app} is missing ${header}`).toContain(header);
    }
  });
});

describe('dashboard specifically', () => {
  const src = read('dashboard');

  it('is never indexed, in the header as well as robots.txt', () => {
    // Both, not either. An admin surface reachable by search is a real problem.
    expect(src).toContain('X-Robots-Tag');
    expect(src).toContain('noindex');
  });

  it('loads no analytics, so its CSP needs no analytics origins', () => {
    const code = policy('dashboard');
    expect(code).not.toContain('googletagmanager');
    expect(code).not.toContain('google-analytics');
  });
});
