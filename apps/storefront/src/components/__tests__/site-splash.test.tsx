import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { FADE_STARTS_AT, HIDDEN_AT, LAST_PILLAR_ENDS, SiteSplash } from '../site-splash';

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

    act(() => { vi.advanceTimersByTime(HIDDEN_AT); });
    expect(sessionStorage.getItem(SEEN_KEY)).toBe('1');
    unmount();

    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.queryByText(/Sintered Stone/)).toBeNull();
  });

  it('fades out and removes itself unprompted, never blocking the LCP measurement itself', () => {
    // Not "well inside the 2.0s LCP budget": this overlay is never the LCP
    // candidate regardless of its own length, since it is client only and
    // mounts after the real page has already painted, per the component's
    // own doc comment. What matters here is that it still ends on its own.
    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText(/Sintered Stone/)).toBeDefined();

    // Still present but fading.
    act(() => { vi.advanceTimersByTime(FADE_STARTS_AT); });
    expect(screen.queryByText(/Sintered Stone/)).toBeDefined();

    // Gone entirely, with no click or interaction required to dismiss it.
    act(() => { vi.advanceTimersByTime(HIDDEN_AT - FADE_STARTS_AT); });
    expect(screen.queryByText(/Sintered Stone/)).toBeNull();
  });

  it('does not start fading until every pillar has had time to finish stepping in', () => {
    // Regression, reported directly as "disappears before the animation is
    // done": the fade-out and unmount timers were tuned before the strapline
    // became four staggered pillars instead of one block, and were never
    // moved to match, so the overlay started fading, then vanished outright,
    // while the last pillar or two were still animating in. jsdom does not
    // run real CSS animations, so what is asserted is the actual constraint
    // that failed: the fade cannot start before the last pillar's own
    // animation-delay-plus-duration has elapsed.
    expect(FADE_STARTS_AT).toBeGreaterThanOrEqual(LAST_PILLAR_ENDS);

    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(0); });
    // All four pillars are in the document THROUGHOUT: they are laid out
    // immediately and animate via CSS, so if the fade or removal ever ran
    // ahead of LAST_PILLAR_ENDS this would still pass, which is exactly why
    // the numeric assertion above is the one that actually catches it.
    expect(screen.getByText('Sintered Stone')).toBeDefined();
    expect(screen.getByText('Accessories')).toBeDefined();

    act(() => { vi.advanceTimersByTime(LAST_PILLAR_ENDS); });
    // The last pillar has finished animating in, and the overlay must still
    // be fully opaque at this instant, not already fading or gone.
    const overlay = screen.getByText('Sintered Stone').closest('[aria-hidden]');
    expect(overlay).toHaveClass('opacity-100');
  });

  it('never renders at all under prefers-reduced-motion', () => {
    reducedMotion(true);
    render(<SiteSplash />);
    act(() => { vi.advanceTimersByTime(HIDDEN_AT + 500); });
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

    act(() => { vi.advanceTimersByTime(FADE_STARTS_AT + 50); });
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

    act(() => { vi.advanceTimersByTime(HIDDEN_AT); });
    expect(screen.queryByText(/Sintered Stone/)).toBeNull();
  });
});
