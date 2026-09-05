import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { axe } from 'vitest-axe';
import { LaunchBanner } from '../launch-banner';

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches, addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-20T00:00:00Z'));
  reducedMotion(false);
  window.localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('LaunchBanner', () => {
  it('renders nothing until Beco confirms a date or throws the switch', () => {
    const { container } = render(<LaunchBanner launch={{ launchAt: null, isLive: false }} />);
    expect(container.firstChild).toBeNull();
  });

  it('counts down to the confirmed date once mounted', async () => {
    await act(async () => {
      render(<LaunchBanner launch={{ launchAt: '2026-10-05T00:00:00Z', isLive: false }} />);
    });
    expect(screen.getByText('Beco turns one this October.')).toBeInTheDocument();
    expect(screen.getByText(/Live in 15d/)).toBeInTheDocument();
  });

  it('reads "any moment" once the date passes, rather than a stuck or negative count', async () => {
    await act(async () => {
      render(<LaunchBanner launch={{ launchAt: '2026-09-01T00:00:00Z', isLive: false }} />);
    });
    expect(screen.getByText('Live any moment.')).toBeInTheDocument();
  });

  it('shows the live banner, linking through to the projects it is celebrating', async () => {
    await act(async () => {
      render(<LaunchBanner launch={{ launchAt: '2026-10-05T00:00:00Z', isLive: true }} />);
    });
    expect(screen.getByText('One year in Nairobi.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see the year in projects/i }))
      .toHaveAttribute('href', '/gallery');
  });

  it('plays the confetti reveal once, for a visitor who has not seen it', async () => {
    const { container } = await act(async () =>
      render(<LaunchBanner launch={{ launchAt: null, isLive: true }} />),
    );
    expect(container.querySelectorAll('.beco-confetti-piece').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem('beco-launch-seen')).toBe('true');
  });

  it('never replays the reveal for a visitor who has already seen it', async () => {
    window.localStorage.setItem('beco-launch-seen', 'true');
    const { container } = await act(async () =>
      render(<LaunchBanner launch={{ launchAt: null, isLive: true }} />),
    );
    expect(container.querySelectorAll('.beco-confetti-piece')).toHaveLength(0);
    // The banner itself still says the site is live: only the flourish is gated.
    expect(screen.getByText('One year in Nairobi.')).toBeInTheDocument();
  });

  it('skips the confetti under reduced motion even on a first visit', async () => {
    reducedMotion(true);
    const { container } = await act(async () =>
      render(<LaunchBanner launch={{ launchAt: null, isLive: true }} />),
    );
    expect(container.querySelectorAll('.beco-confetti-piece')).toHaveLength(0);
  });

  it('has no accessibility violations counting down', async () => {
    const { container } = await act(async () =>
      render(<LaunchBanner launch={{ launchAt: '2026-10-05T00:00:00Z', isLive: false }} />),
    );
    // axe-core's own async internals rely on REAL timers, which fake timers
    // block forever rather than fail fast: this hung the full 5s default
    // timeout until traced back here.
    vi.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations once live', async () => {
    const { container } = await act(async () =>
      render(<LaunchBanner launch={{ launchAt: null, isLive: true }} />),
    );
    vi.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
  });
});
