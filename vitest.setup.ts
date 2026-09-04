// Matchers like toBeInTheDocument and toHaveFocus. Without this import they
// are missing and every assertion using one fails as "Invalid Chai property",
// which reads like a typo rather than a missing setup.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
// toHaveNoViolations, per the component skill's accessibility baseline. This
// registers it at RUNTIME for every project. The TYPE has to be visible to
// each package's own isolated `tsc --noEmit` too, which this file is not
// part of, so that half lives once per package instead, in its own
// vitest-axe.d.ts: vitest-axe's own /extend-expect entry targets an older
// global namespace Vitest 4 no longer merges into what expect() returns
// here, so those files write the augmentation directly rather than trusting
// that entry point.
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// jsdom has no canvas backend, so axe-core's own icon-ligature heuristic
// (part of its colour-contrast check) logs a "not implemented" error to the
// console on every axe() call, real violations and all. Real browsers can
// also legitimately return null here, so axe-core already treats a missing
// context as inconclusive rather than fatal, and a component's axe check
// keeps working either way. This trades console noise on every test run for
// a stub, not a skipped check.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

/**
 * Testing Library auto-cleans only when `globals: true`. We keep globals off,
 * so unmount explicitly. Without this, renders accumulate in the document and
 * a later query finds elements from an earlier test, which fails in a way that
 * looks like a component bug rather than a harness one.
 */
afterEach(() => cleanup());
