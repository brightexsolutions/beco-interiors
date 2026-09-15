// Makes vitest-axe's `toHaveNoViolations` matcher visible to THIS package's
// own typecheck. Registering it at runtime happens once, in the root
// vitest.setup.ts, but each package still typechecks in isolation
// (`pnpm --filter @beco/ui typecheck`), so the type needs its own way in.
//
// Not `import 'vitest-axe/extend-expect'`: that entry point augments the
// OLD global `Vi.Assertion` namespace, which Vitest 4 no longer merges into
// what `expect()` actually returns under this project's globals-off config,
// so the matcher would still read as missing. jest-dom's own /vitest entry
// augments the `vitest` MODULE's `Assertion<T>` directly, which does work
// here, so this copies that shape instead of vitest-axe's own, older one.
import 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
