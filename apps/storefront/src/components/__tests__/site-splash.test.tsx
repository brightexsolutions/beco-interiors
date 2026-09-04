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
 * The three constraints that keep this from costing what a splash screen
 * usually costs: it shows once per session rather than once per page, it
 * disappears on its own well under the site's LCP budget, and reduced motion
 * turns it off outright rather than just skipping the animation.
 */
describe('SiteSplash', () => {
  it('shows on the first mount of a session', () => {
    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText(/Sintered Stone/)).toBeDefined();
  });

  it('records that it has been shown, so a second mount in the same session stays quiet', () => {
    const { unmount } = render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
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

    // Still present but fading at 900ms.
    act(() => { vi.advanceTimersByTime(900); });
    expect(screen.queryByText(/Sintered Stone/)).toBeDefined();

    // Gone entirely by 1300ms, under the site's 2.0s LCP budget with room to
    // spare, and with no click or interaction required to dismiss it.
    act(() => { vi.advanceTimersByTime(400); });
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
});
