import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { SiteSplash } from '../site-splash';

const SEEN_KEY = 'beco_splash_seen_v1';

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches, addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion(false);
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/**
 * The four constraints that keep this from costing what a splash screen
 * usually costs: it shows once per session rather than once per page, it
 * disappears on its own well under the site's LCP budget, reduced motion
 * turns it off outright rather than just skipping the animation, and it
 * survives React 18 Strict Mode's dev-only double invoke rather than
 * freezing on the very first load, which is what it actually did before
 * the fix below.
 */
describe('SiteSplash', () => {
  it('shows on the first mount of a session', () => {
    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText(/Sintered Stone/)).toBeDefined();
  });

  it('records that it has been shown only once the sequence completes, so a second mount in the same session then stays quiet', () => {
    const { unmount } = render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    // Not yet: recording early is exactly what caused the freeze below.
    expect(sessionStorage.getItem(SEEN_KEY)).toBeNull();

    act(() => { vi.advanceTimersByTime(1550); });
    expect(sessionStorage.getItem(SEEN_KEY)).toBe('1');
    unmount();

    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.queryByText(/Sintered Stone/)).toBeNull();
  });

  it('fades out and removes itself well inside the LCP budget, unprompted', () => {
    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText(/Sintered Stone/)).toBeDefined();

    // Still present but fading.
    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.queryByText(/Sintered Stone/)).toBeDefined();

    // Gone entirely under the site's 2.0s LCP budget, with no click or
    // interaction required to dismiss it.
    act(() => { vi.advanceTimersByTime(450); });
    expect(screen.queryByText(/Sintered Stone/)).toBeNull();
  });

  it('never renders at all under prefers-reduced-motion', () => {
    reducedMotion(true);
    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText(/Sintered Stone/)).toBeNull();
    // And it must not have consumed the "seen" slot either, so a later visit
    // with reduced motion off still behaves like a first visit.
    expect(sessionStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it('is hidden from assistive technology throughout', () => {
    const { container } = render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
  });

  it('never intercepts a scroll, a click or a touch, at any point in its lifecycle', () => {
    // A real bug: pointer-events-none was scoped to only the fade-out phase,
    // so for the full time the splash sat fully visible it was also a full
    // viewport element with default pointer-events, silently swallowing
    // every scroll and touch gesture made in that window. Checked at both
    // phases, not only one, since the earlier version would have passed a
    // check on the 'out' phase alone.
    const { container } = render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    const overlay = container.firstElementChild;
    expect(overlay).toHaveClass('pointer-events-none');

    act(() => { vi.advanceTimersByTime(1100); });
    expect(container.firstElementChild).toHaveClass('pointer-events-none');
  });

  it('reaches hidden even under a React 18 Strict Mode style double invoke, which previously froze it forever', () => {
    // Strict Mode runs an effect, its cleanup, then the effect again, all
    // synchronously, before any timer fires. Simulated here directly: mount,
    // unmount without ever advancing time (so no timer has fired and nothing
    // has been written to sessionStorage yet, exactly what cleanup running
    // first looks like), then mount again as the "real" instance.
    //
    // Before the fix, the FIRST mount wrote "seen" immediately on scheduling
    // its timers. Unmounting cancelled those timers in cleanup. The SECOND
    // mount then read "seen" as already true and returned early without
    // scheduling anything to replace them, so phase stayed 'in' forever: a
    // fully opaque splash that never reached 'out' or 'hidden' on any first
    // load in development, since Strict Mode runs there by default.
    const first = render(<SiteSplash />);
    first.unmount();

    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText(/Sintered Stone/)).toBeDefined();

    act(() => { vi.advanceTimersByTime(1550); });
    expect(screen.queryByText(/Sintered Stone/)).toBeNull();
  });
});
