import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { HoverGallery } from '../hover-gallery';

const FRAMES = [<span key="a">A</span>, <span key="b">B</span>, <span key="c">C</span>];

/** Answers only the queries named true; everything else, reduced motion
    included, defaults to false, so simulating "can hover" never accidentally
    simulates "prefers reduced motion" as a side effect of sharing a string.
    Supports the `change` listener the component subscribes to for a live
    capability switch, a touchscreen laptop docked to a mouse. */
const stubMatchMedia = (trueQueries: string[]) => {
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: trueQueries.includes(query),
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return listeners;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('HoverGallery, a device that can hover', () => {
  beforeEach(() => stubMatchMedia([]));

  it('shows only the first frame until hovered', () => {
    render(<HoverGallery frames={FRAMES} />);
    expect(screen.getByText('A').parentElement).toHaveClass('opacity-100');
    expect(screen.getByText('B').parentElement).toHaveClass('opacity-0');
  });

  it('cycles on hover and resets to the first frame on leave', () => {
    // fireEvent over userEvent: userEvent's own internal delays and fake
    // timers is a known fragile combination that hangs rather than fails,
    // and the component only cares that the mouseEnter/mouseLeave DOM events
    // fired, not that a real pointer produced them.
    const { container } = render(<HoverGallery frames={FRAMES} intervalMs={1000} />);
    const root = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(root);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('B').parentElement).toHaveClass('opacity-100');
    fireEvent.mouseLeave(root);
    expect(screen.getByText('A').parentElement).toHaveClass('opacity-100');
  });
});

describe('HoverGallery, a touch device with no hover', () => {
  beforeEach(() => stubMatchMedia(['(hover: none)']));

  it('cycles on its own without ever being hovered', () => {
    render(<HoverGallery frames={FRAMES} intervalMs={1000} />);
    expect(screen.getByText('A').parentElement).toHaveClass('opacity-100');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('B').parentElement).toHaveClass('opacity-100');
  });

  it('shows the dot row plainly, not gated behind a hover that will never happen', () => {
    const { container } = render(<HoverGallery frames={FRAMES} />);
    const dots = container.querySelector('[aria-hidden].pointer-events-none');
    expect(dots).toHaveClass('opacity-100');
    expect(dots?.className).not.toMatch(/group-hover/);
  });
});
