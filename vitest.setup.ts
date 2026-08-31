import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Testing Library auto-cleans only when `globals: true`. We keep globals off,
 * so unmount explicitly. Without this, renders accumulate in the document and
 * a later query finds elements from an earlier test, which fails in a way that
 * looks like a component bug rather than a harness one.
 */
afterEach(() => cleanup());
