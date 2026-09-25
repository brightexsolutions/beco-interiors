import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { axe } from 'vitest-axe';
import { StoneSlider } from '../stone-slider';
import type { StoneSlide } from '@/lib/products';

const slide = (name: string, path: string): StoneSlide => ({
  name,
  image: { role: 'slab', path, alt: name, width: 1600, height: 3200, sort: 0 },
});

const SLIDES = [slide('Amber Jade', '/a.webp'), slide('Pure White', '/b.webp'), slide('Onyx Black', '/c.webp')];

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches, addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => { vi.useFakeTimers(); reducedMotion(false); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('StoneSlider', () => {
  it('renders nothing for an empty list, rather than an empty frame', () => {
    const { container } = render(<StoneSlider slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first slide at full opacity before any timer has run', () => {
    const { container } = render(<StoneSlider slides={SLIDES} />);
    const layers = container.querySelectorAll('img');
    expect(layers[0]).toHaveClass('opacity-100');
    expect(layers[0]).not.toHaveClass('opacity-0');
    expect(layers[1]).toHaveClass('opacity-0');
    expect(layers[1]).not.toHaveClass('opacity-100');
  });

  it('captions the currently showing stone by its real name', () => {
    render(<StoneSlider slides={SLIDES} />);
    expect(screen.getByText('Amber Jade')).toBeInTheDocument();
  });

  it('advances to the next slide on the interval, and its caption with it', () => {
    const { container } = render(<StoneSlider slides={SLIDES} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(1000); });
    const layers = container.querySelectorAll('img');
    expect(layers[0]).toHaveClass('opacity-0');
    expect(layers[1]).toHaveClass('opacity-100');
    expect(screen.getByText('Pure White')).toBeInTheDocument();
  });

  it('wraps round rather than stopping at the last slide', () => {
    const { container } = render(<StoneSlider slides={SLIDES} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(container.querySelectorAll('img')[0]).toHaveClass('opacity-100');
  });

  it('never cycles under prefers-reduced-motion, and still shows a real stone', () => {
    reducedMotion(true);
    const { container } = render(<StoneSlider slides={SLIDES} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(container.querySelectorAll('img')[0]).toHaveClass('opacity-100');
    expect(screen.getByText('Amber Jade')).toBeInTheDocument();
  });

  it('does not set a timer for a single slide', () => {
    const { container } = render(<StoneSlider slides={[SLIDES[0]!]} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(container.querySelectorAll('img')[0]).toHaveClass('opacity-100');
  });

  it('is decorative end to end, so it never competes with the real page content', () => {
    const { container } = render(<StoneSlider slides={SLIDES} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StoneSlider slides={SLIDES} />);
    // axe's own scan awaits real timers internally, which fake timers, on
    // for every other test in this file, never advance.
    vi.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
  });
});
