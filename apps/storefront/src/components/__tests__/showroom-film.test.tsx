import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    // Reported directly as visual noise on a cinematic clip. Autoplay
    // itself is driven by an IntersectionObserver, which jsdom does not
    // implement, so this only asserts the attribute the markup ships,
    // not the play call a real browser would make.
    const { container } = render(<ShowroomFilm />);
    expect(container.querySelector('video')).not.toHaveAttribute('controls');
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
});
