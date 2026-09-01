import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/**/*.test.ts', 'tools/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        // Component tests run in jsdom. NO browser, no Playwright, per D23.
        test: {
          name: 'component',
          // App code is browser code, so its plain .ts tests belong in jsdom
          // too: the quote list talks to localStorage, which node does not
          // have. The unit project deliberately covers only packages/ and
          // tools/, which run on a server or in CI.
          include: [
            'packages/**/*.test.tsx',
            'apps/**/*.test.tsx',
            'apps/**/*.test.ts',
          ],
          // `apps/**/*.test.ts` also matches `*.integration.test.ts`, which
          // belongs to the integration project and needs real env and real
          // Postgres. Without this it ran twice, once correctly and once in
          // jsdom with no database.
          exclude: ['**/*.integration.test.ts', '**/node_modules/**'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
        },
        // Vitest 4 transforms with oxc, not esbuild, and oxc reads `jsx`
        // from the nearest tsconfig. apps/storefront sets `preserve` because
        // Next needs it, which left JSX untransformed and failing to parse in
        // tests. Stated here so the test transform does not depend on which
        // tsconfig happens to be nearest the file.
        oxc: { jsx: { runtime: 'automatic' } },
        resolve: {
          alias: {
            // Matches apps/storefront/tsconfig.json, so a component test
            // imports exactly what the app imports rather than a copy.
            '@': fileURLToPath(new URL('./apps/storefront/src', import.meta.url)),
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
          include: ['apps/**/*.integration.test.ts', 'packages/**/*.integration.test.ts'],
          environment: 'node',
          // Real network and real Postgres, so slower than the unit default.
          testTimeout: 20_000,
        },
      },
    ],
  },
});
