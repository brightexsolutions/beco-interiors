import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ShowroomFilm } from '../showroom-film';

const media = (reducedMotion: boolean) => {
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return listeners;
};

afterEach(() => vi.unstubAllGlobals());

describe('ShowroomFilm', () => {
  beforeEach(() => media(false));

  it('renders the configured source and poster', () => {
    const { container } = render(<ShowroomFilm />);
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('poster');
    expect(container.querySelector('source')).toHaveAttribute('src');
  });

  it('carries no native controls for a reader who can see it autoplay', () => {
    // Reported directly as visual noise on a cinematic clip. The play
    // call itself is covered once an observer is installed, below.
    const { container } = render(<ShowroomFilm />);
    expect(container.querySelector('video')).not.toHaveAttribute('controls');
    expect(screen.queryByRole('button', { name: 'Play the showroom film' })).toBeNull();
  });

  it('brings controls back under reduced motion, the only way to start it there', () => {
    media(true);
    const { container } = render(<ShowroomFilm />);
    expect(container.querySelector('video')).toHaveAttribute('controls');
  });

  it('is always muted, looped and inline, regardless of motion preference', () => {
    const { container } = render(<ShowroomFilm />);
    const video = container.querySelector('video') as HTMLVideoElement;
    // React reflects `muted` as the element's own property rather than an
    // HTML attribute, so the property is what actually mutes playback.
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
  });

  it('carries a centred, low opacity BECO watermark on every instance', () => {
    render(<ShowroomFilm />);
    const mark = screen.getByText('BECO');
    expect(mark).toHaveClass('items-center', 'justify-center', 'text-high-vis-white/20');
  });

  it('sizes the whole block, video and watermark alike, from the given className', () => {
    const { container } = render(<ShowroomFilm className="aspect-[16/9] w-full" />);
    const wrapper = container.firstElementChild!;
    expect(wrapper).toHaveClass('relative', 'aspect-[16/9]', 'w-full');
    expect(container.querySelector('video')).toHaveClass('absolute', 'inset-0', 'h-full', 'w-full');
  });

  it('has no accessibility violations on the poster frame', async () => {
    const { container } = render(<ShowroomFilm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

type IoCallback = (entries: { isIntersecting: boolean }[]) => void;

describe('ShowroomFilm playback', () => {
  let notify: IoCallback | null = null;

  beforeEach(() => {
    notify = null;
    media(false);
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: IoCallback) { notify = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const flush = () => act(async () => { await Promise.resolve(); });

  const enter = () => act(() => { notify?.([{ isIntersecting: true }]); });

  it('plays once half the frame is on screen, and pauses when it leaves', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container } = render(<ShowroomFilm />);
    const video = container.querySelector('video') as HTMLVideoElement;

    await enter();
    await flush();

    expect(play).toHaveBeenCalled();
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('webkit-playsinline');
    expect(video.preload).toBe('auto');
    expect(screen.queryByRole('button', { name: 'Play the showroom film' })).toBeNull();

    act(() => { notify?.([{ isIntersecting: false }]); });
    expect(pause).toHaveBeenCalled();
  });

  it('retries when the file is not ready, instead of staying on the poster', async () => {
    let calls = 0;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new DOMException('interrupted', 'AbortError'));
      return Promise.resolve();
    });
    const { container } = render(<ShowroomFilm />);
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'readyState', { configurable: true, get: () => 0 });

    await enter();
    await flush();
    expect(calls).toBe(1);
    expect(screen.queryByRole('button', { name: 'Play the showroom film' })).toBeNull();

    await act(async () => { video.dispatchEvent(new Event('canplay')); });
    await flush();
    expect(calls).toBe(2);
  });

  it('offers Play when the phone refuses autoplay, and that tap starts the film', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() =>
      Promise.reject(new DOMException('blocked', 'NotAllowedError')),
    );
    const { container } = render(<ShowroomFilm />);

    await enter();
    await flush();

    const button = screen.getByRole('button', { name: 'Play the showroom film' });
    expect(button).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();

    play.mockResolvedValue(undefined);
    fireEvent.click(button);
    await flush();
    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Play the showroom film' })).toBeNull();
  });

  it('tries again on the next finger lift while the frame is on screen', async () => {
    let calls = 0;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      return Promise.resolve();
    });
    render(<ShowroomFilm />);

    await enter();
    await flush();
    expect(screen.getByRole('button', { name: 'Play the showroom film' })).toBeVisible();

    await act(async () => { window.dispatchEvent(new Event('touchend')); });
    await flush();
    expect(calls).toBe(2);
    expect(screen.queryByRole('button', { name: 'Play the showroom film' })).toBeNull();
  });

  it('does not autoplay under reduced motion', async () => {
    media(true);
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    render(<ShowroomFilm />);
    await enter();
    await flush();
    expect(play).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Play the showroom film' })).toBeNull();
  });
});
