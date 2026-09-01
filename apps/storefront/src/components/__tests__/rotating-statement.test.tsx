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
