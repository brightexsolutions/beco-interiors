import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import { CinematicBackground } from '../cinematic-background';
import type { ProductImage } from '@beco/types';

const image = (path: string): ProductImage => ({
  role: 'application', path, alt: '', width: 1600, height: 1000, sort: 0,
});

const stubReducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({ matches, addEventListener() {}, removeEventListener() {} }));

beforeEach(() => { vi.useFakeTimers(); stubReducedMotion(false); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('CinematicBackground', () => {
  it('renders nothing at all when given no images', () => {
    const { container } = render(<CinematicBackground images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the first photograph at full opacity before any timer has run', () => {
    const { container } = render(<CinematicBackground images={[image('/a.webp'), image('/b.webp')]} />);
    const layers = container.querySelectorAll(':scope > div > div');
    expect(layers[0]).toHaveClass('opacity-100');
    expect(layers[1]).toHaveClass('opacity-0');
  });

  it('crossfades to the next photograph on its own, no hover or focus needed', () => {
    const { container } = render(
      <CinematicBackground images={[image('/a.webp'), image('/b.webp'), image('/c.webp')]} />,
    );
    act(() => { vi.advanceTimersByTime(4200); });
    const layers = container.querySelectorAll(':scope > div > div');
    expect(layers[1]).toHaveClass('opacity-100');
    expect(layers[0]).toHaveClass('opacity-0');
  });

  it('never cycles under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    const { container } = render(<CinematicBackground images={[image('/a.webp'), image('/b.webp')]} />);
    act(() => { vi.advanceTimersByTime(20_000); });
    const layers = container.querySelectorAll(':scope > div > div');
    expect(layers[0]).toHaveClass('opacity-100');
  });

  it('does not arm a timer at all for a single photograph', () => {
    const { container } = render(<CinematicBackground images={[image('/a.webp')]} />);
    act(() => { vi.advanceTimersByTime(20_000); });
    const layers = container.querySelectorAll(':scope > div > div');
    expect(layers[0]).toHaveClass('opacity-100');
  });
});
