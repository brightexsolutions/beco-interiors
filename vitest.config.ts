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
          include: ['packages/**/*.test.tsx', 'apps/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
        },
        esbuild: { jsx: 'automatic' },
      },
    ],
  },
});
