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

describe('RotatingRoomWord', () => {
  it('starts on "room.", the word already in the static markup this replaces', () => {
    media(false);
    render(<RotatingRoomWord intervalMs={1000} />);
    expect(screen.getByText('room.')).toBeInTheDocument();
  });

  it('cycles to the next word on its own', () => {
    media(false);
    render(<RotatingRoomWord intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('kitchen.')).toBeInTheDocument();
    expect(screen.queryByText('room.')).toBeNull();
  });

  it('holds on "room." under reduced motion rather than cycling', () => {
    media(true);
    render(<RotatingRoomWord intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('room.')).toBeInTheDocument();
  });
});
