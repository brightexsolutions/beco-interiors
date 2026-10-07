import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `server-only` throws outside an RSC render. It is a build-time guard with no
// runtime API, so a stub lets a module that imports it, for example
// @beco/supabase-client, be exercised in a test.
const SERVER_ONLY_STUB = fileURLToPath(
  new URL('./tools/test/server-only-stub.ts', import.meta.url),
);

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/**/*.test.ts', 'tools/**/*.test.ts'],
          exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
          environment: 'node',
        },
      },
      {
        // Component tests run in jsdom. NO browser, no Playwright, per D23.
        // Covers the design system and the STOREFRONT app: app code is
        // browser code, so its plain .ts tests belong in jsdom too, the
        // quote list talks to localStorage which node does not have.
        test: {
          name: 'component',
          include: [
            'packages/**/*.test.tsx',
            'apps/storefront/**/*.test.tsx',
            'apps/storefront/**/*.test.ts',
          ],
          exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
        },
        // Vitest 4 transforms with oxc, not esbuild, and oxc reads `jsx` from
        // the nearest tsconfig. apps/storefront sets `preserve` because Next
        // needs it, which left JSX untransformed in tests. Stated here so the
        // transform does not depend on which tsconfig is nearest the file.
        oxc: { jsx: { runtime: 'automatic' } },
        resolve: {
          alias: {
            // Matches apps/storefront/tsconfig.json, so a component test
            // imports exactly what the app imports rather than a copy.
            '@': fileURLToPath(new URL('./apps/storefront/src', import.meta.url)),
            'server-only': SERVER_ONLY_STUB,
          },
        },
      },
      {
        // The dashboard app. Its own project because `@` cannot point at two
        // apps' src at once, and dashboard modules import `@/lib/...`.
        test: {
          name: 'dashboard',
          include: ['apps/dashboard/**/*.test.tsx', 'apps/dashboard/**/*.test.ts'],
          exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts', './apps/dashboard/vitest.setup.ts'],
        },
        oxc: { jsx: { runtime: 'automatic' } },
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./apps/dashboard/src', import.meta.url)),
            'server-only': SERVER_ONLY_STUB,
          },
        },
      },
      {
        // Integration: real queries against the LOCAL Supabase stack, never a
        // hosted project. `supabase start` must be running. Covers the server
        // actions and query helpers, including their failure paths, which is
        // where the business logic actually lives now that there is no browser
        // automation to walk a journey.
        test: {
          name: 'integration',
          include: ['apps/**/*.integration.test.ts', 'packages/**/*.integration.test.ts', 'tools/**/*.integration.test.ts'],
          environment: 'node',
          // Real network and real Postgres, so slower than the unit default.
          testTimeout: 20_000,
          // One file at a time: every file writes to the same database, and a
          // test that counts rows (fetchNewQuoteCount) failed whenever another
          // file created a web quote in the same instant.
          fileParallelism: false,
        },
        // No `@` alias here: it cannot point at both apps at once, so code
        // an integration test reaches imports relatively. `server-only` is
        // stubbed as in the other projects, since a server action that
        // imports it is exactly what these tests call.
        resolve: {
          alias: {
            'server-only': SERVER_ONLY_STUB,
          },
        },
      },
    ],
  },
});
