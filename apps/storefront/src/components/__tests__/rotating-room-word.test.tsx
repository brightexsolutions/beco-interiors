import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { RotatingRoomWord } from '../rotating-room-word';

const media = (reducedMotion: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// Timings chosen so each phase lands on a round number: "room." is 5
// characters, deleted at 10ms each (50ms total), "kitchen." is 8 characters,
// typed at 10ms each (80ms total).
const TIMING = { holdMs: 100, typeSpeedMs: 10, deleteSpeedMs: 10 };

describe('RotatingRoomWord', () => {
  it('starts on "room.", the word already in the static markup this replaces', () => {
    media(false);
    render(<RotatingRoomWord {...TIMING} />);
    expect(screen.getByText('room.')).toBeInTheDocument();
  });

  it('holds the word, then deletes it character by character rather than swapping it whole', () => {
    media(false);
    render(<RotatingRoomWord {...TIMING} />);
    act(() => { vi.advanceTimersByTime(100); }); // the hold ends, deleting starts
    act(() => { vi.advanceTimersByTime(15); }); // partway through the 5 delete steps
    // Exactly which tick a given step lands on is an implementation detail;
    // what matters is that it shrank one character at a time rather than
    // jumping straight from the full word to nothing.
    const partial = screen.getByText(/^room?\.?$/).textContent!;
    expect(partial.length).toBeGreaterThan(0);
    expect(partial.length).toBeLessThan('room.'.length);
  });

  it('types the next word in character by character once the old one is gone', () => {
    media(false);
    render(<RotatingRoomWord {...TIMING} />);
    act(() => { vi.advanceTimersByTime(100); }); // hold
    act(() => { vi.advanceTimersByTime(5 * 10); }); // delete all 5 characters of "room."
    expect(screen.queryByText('room.')).toBeNull();
    act(() => { vi.advanceTimersByTime(3 * 10); }); // partway through typing "kitchen."
    const mid = screen.getByText(/^k/).textContent!;
    expect(mid.length).toBeGreaterThan(0);
    expect(mid.length).toBeLessThan('kitchen.'.length);
    act(() => { vi.advanceTimersByTime(10 * 10); }); // finish typing, generously
    expect(screen.getByText('kitchen.')).toBeInTheDocument();
  });

  it('holds on "room." under reduced motion rather than typing or deleting', () => {
    media(true);
    render(<RotatingRoomWord {...TIMING} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('room.')).toBeInTheDocument();
  });

  it('carries a caret that is hidden under reduced motion', () => {
    media(true);
    const { container } = render(<RotatingRoomWord {...TIMING} />);
    expect(container.querySelector('.beco-caret')).toHaveClass('motion-reduce:hidden');
  });
});
