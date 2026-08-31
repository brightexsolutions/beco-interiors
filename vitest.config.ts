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
        test: {
          name: 'component',
          include: ['apps/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
