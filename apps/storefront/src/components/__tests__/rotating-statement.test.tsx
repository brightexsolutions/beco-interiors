import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { RotatingStatement } from '../rotating-statement';

const WORDS = ['NAIROBI', 'KITCHENS', 'BATHROOMS'];

/**
 * The component renders an invisible copy of the longest word to reserve the
 * box, so a plain text query finds two of it. This selects only the cycling
 * layers, which are the ones whose opacity carries the state.
 */
const word = (text: string) =>
  screen.getByText(text, { selector: '.beco-outline' });

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches, addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => { vi.useFakeTimers(); reducedMotion(false); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('RotatingStatement', () => {
  it('renders every word, so the section never resizes as a longer one arrives', () => {
    render(<RotatingStatement words={WORDS} />);
    for (const w of WORDS) expect(word(w)).toBeInTheDocument();
  });

  it('shows the first word before any timer has run', () => {
    render(<RotatingStatement words={WORDS} />);
    expect(word('NAIROBI')).toHaveClass('opacity-100');
  });

  it('moves to the next word on the interval', () => {
    render(<RotatingStatement words={WORDS} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(word('KITCHENS')).toHaveClass('opacity-100');
    expect(word('NAIROBI')).toHaveClass('opacity-0');
  });

  it('wraps round rather than stopping at the last word', () => {
    render(<RotatingStatement words={WORDS} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(word('NAIROBI')).toHaveClass('opacity-100');
  });

  it('never cycles under prefers-reduced-motion, and still says something', () => {
    reducedMotion(true);
    render(<RotatingStatement words={WORDS} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(word('NAIROBI')).toHaveClass('opacity-100');
  });

  it('does not set a timer for a single word', () => {
    render(<RotatingStatement words={['NAIROBI']} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(word('NAIROBI')).toHaveClass('opacity-100');
  });
});

/**
 * The photograph behind the word used to be one static image for the whole
 * section, so every word in the sequence sat over the exact same picture.
 * `images`, when given, crossfades in step with the word.
 */
describe('RotatingStatement, with images', () => {
  const image = (n: number) => ({
    role: 'application' as const, path: `/img/${n}.webp`, alt: `Photo ${n}`,
    width: 1600, height: 1200, sort: n,
  });
  const IMAGES = [image(1), image(2), image(3)];

  it('shows the first photograph at full opacity before any timer has run', () => {
    const { container } = render(<RotatingStatement words={WORDS} images={IMAGES} />);
    const layers = container.querySelectorAll('img');
    expect(layers[0]?.className).toContain('opacity-70');
    expect(layers[1]?.className).toContain('opacity-0');
  });

  it('crossfades to the next photograph on the same interval as the word', () => {
    const { container } = render(
      <RotatingStatement words={WORDS} images={IMAGES} intervalMs={1000} />,
    );
    act(() => { vi.advanceTimersByTime(1000); });
    const layers = container.querySelectorAll('img');
    expect(layers[0]?.className).toContain('opacity-0');
    expect(layers[1]?.className).toContain('opacity-70');
    // And the word changed at the same moment, so the two never drift apart.
    expect(word('KITCHENS')).toHaveClass('opacity-100');
  });

  it('renders no image layer at all when none are given, unchanged from before', () => {
    const { container } = render(<RotatingStatement words={WORDS} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
