// See packages/ui/src/vitest-axe.d.ts for why this file exists and why it
// writes the augmentation directly rather than importing
// vitest-axe/extend-expect: that entry targets an older global namespace
// Vitest 4 no longer merges into what expect() returns under this project's
// globals-off config.
import 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
