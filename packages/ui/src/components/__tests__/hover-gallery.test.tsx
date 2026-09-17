import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HoverGallery } from '../hover-gallery';

// Query aware, unlike a flat stub: this component asks two different
// questions of matchMedia (reduced motion, and hover capability) and the
// touch behaviour under test only shows up when they can disagree.
const media = (matching: string[]) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.some((q) => query.includes(q)),
    addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => { vi.useFakeTimers(); media([]); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const frames = [<img key="a" alt="Frame A" />, <img key="b" alt="Frame B" />, <img key="c" alt="Frame C" />];

describe('HoverGallery, touch devices', () => {
  it('cycles on its own when the device has no hover to trigger it', () => {
    media(['hover: none']);
    render(<HoverGallery frames={frames} intervalMs={1000} />);
    // Frame A starts visible, no pointer or focus event fired at all: a
    // touch reader has no equivalent of mouseenter, so the old
    // hover-only version left these siblings permanently unreachable.
    expect(screen.getByAltText('Frame A').parentElement).toHaveAttribute('aria-hidden', 'false');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByAltText('Frame B').parentElement).toHaveAttribute('aria-hidden', 'false');
  });

  it('does not auto cycle on a device that does have hover', () => {
    media([]);
    render(<HoverGallery frames={frames} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByAltText('Frame A').parentElement).toHaveAttribute('aria-hidden', 'false');
  });

  it('respects reduced motion even on a touch device', () => {
    media(['hover: none', 'prefers-reduced-motion']);
    render(<HoverGallery frames={frames} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByAltText('Frame A').parentElement).toHaveAttribute('aria-hidden', 'false');
  });

  it('keeps the frame indicator visible without a hover state to reveal it', () => {
    media(['hover: none']);
    const { container } = render(<HoverGallery frames={frames} />);
    const dots = container.querySelector('[aria-hidden] > span')?.parentElement;
    expect(dots?.className).toContain('opacity-100');
    expect(dots?.className).not.toContain('group-hover:opacity-100');
  });
});

describe('HoverGallery, pointer devices', () => {
  it('starts the cycle on mouse enter and resets to the first frame on leave', () => {
    media([]);
    const { container } = render(<HoverGallery frames={frames} intervalMs={1000} />);
    const root = container.firstElementChild!;
    fireEvent.mouseEnter(root);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByAltText('Frame B').parentElement).toHaveAttribute('aria-hidden', 'false');
    fireEvent.mouseLeave(root);
    expect(screen.getByAltText('Frame A').parentElement).toHaveAttribute('aria-hidden', 'false');
  });
});
