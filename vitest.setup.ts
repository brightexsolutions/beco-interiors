// Matchers like toBeInTheDocument and toHaveFocus. Without this import they
// are missing and every assertion using one fails as "Invalid Chai property",
// which reads like a typo rather than a missing setup.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
// toHaveNoViolations, per the component skill's accessibility baseline. The
// type augmentation comes from vitest-axe/extend-expect below; the matcher
// itself has to be registered separately, or the type exists with nothing
// behind it and a real violation would pass silently.
import * as axeMatchers from 'vitest-axe/matchers';
import 'vitest-axe/extend-expect';

expect.extend(axeMatchers);

/**
 * Testing Library auto-cleans only when `globals: true`. We keep globals off,
 * so unmount explicitly. Without this, renders accumulate in the document and
 * a later query finds elements from an earlier test, which fails in a way that
 * looks like a component bug rather than a harness one.
 */
afterEach(() => cleanup());
