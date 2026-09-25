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
 * Radix menus (DropdownMenu and later Popover) dispatch PointerEvents and
 * call setPointerCapture. jsdom has neither, so a passing click in the
 * browser becomes a silent no-op in tests and looks like the control is
 * decorative. Stub only what the primitive needs; do not fake a full
 * pointer implementation.
 */
if (typeof window !== 'undefined') {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventStub extends MouseEvent {
      pointerId: number;
      pointerType: string;
      isPrimary: boolean;
      constructor(type: string, params: MouseEventInit & { pointerId?: number; pointerType?: string; isPrimary?: boolean } = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 1;
        this.pointerType = params.pointerType ?? 'mouse';
        this.isPrimary = params.isPrimary ?? true;
      }
    }
    window.PointerEvent = PointerEventStub as typeof PointerEvent;
  }
}

if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
}

/**
 * Testing Library auto-cleans only when `globals: true`. We keep globals off,
 * so unmount explicitly. Without this, renders accumulate in the document and
 * a later query finds elements from an earlier test, which fails in a way that
 * looks like a component bug rather than a harness one.
 */
afterEach(() => {
  cleanup();
  // Radix menus lock the body. If a test fails while one is open, jsdom
  // keeps `pointer-events: none` and the next userEvent.click waits forever.
  document.body.style.pointerEvents = '';
  document.body.removeAttribute('data-scroll-locked');
});
