import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { CutoutReveal } from '../cutout-reveal';

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches, addEventListener() {}, removeEventListener() {},
  }));

beforeEach(() => { vi.useFakeTimers(); reducedMotion(false); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('CutoutReveal', () => {
  it('renders the copy and each real stat, not an invented count', () => {
    render(
      <CutoutReveal
        eyebrow="Hardware"
        title="Down to the handle."
        body="Six finishes on the floor, ready to specify against any run of cabinetry."
        images={[<img key="gold" src="/cutouts/gold-handle.webp" alt="Gold cabinet handle" />]}
        stats={[
          { value: 6, label: 'Finishes in stock' },
          { value: 12, suffix: 'mm', label: 'Bore centre, most common' },
        ]}
      />,
    );
    expect(screen.getByText('Down to the handle.')).toBeDefined();
    expect(screen.getByText('Hardware')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined();
    expect(screen.getByText('Bore centre, most common').nextElementSibling?.textContent).toBe(
      '12mm',
    );
    expect(screen.getByAltText('Gold cabinet handle')).toBeDefined();
  });

  it('omits the stats row entirely when there is nothing real to report', () => {
    const { container } = render(
      <CutoutReveal
        eyebrow="Hardware"
        title="Down to the handle."
        body="Body copy."
        images={[<img key="gold" src="/cutouts/gold-handle.webp" alt="" />]}
        stats={[]}
      />,
    );
    expect(container.querySelector('dl')).toBeNull();
  });

  it('renders the call to action as a real anchor, not a decorative control', () => {
    render(
      <CutoutReveal
        eyebrow="Hardware" title="Down to the handle." body="Body copy."
        images={[<img key="gold" src="/cutouts/gold-handle.webp" alt="" />]}
        stats={[]}
        cta={{ label: 'Shop handles', href: '/shop/handles' }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Shop handles' });
    expect(link.getAttribute('href')).toBe('/shop/handles');
  });

  it('puts the object on the right when reversed', () => {
    const { container } = render(
      <CutoutReveal
        eyebrow="Hardware" title="Down to the handle." body="Body copy."
        images={[<img key="gold" src="/cutouts/gold-handle.webp" alt="" />]}
        stats={[]}
        reverse
      />,
    );
    const [imageColumn] = container.querySelectorAll(':scope > section > div > div');
    expect(imageColumn?.className).toContain('lg:order-2');
  });

  it('drives the object with the cutout drift class, not the grid photograph parallax', () => {
    const { container } = render(
      <CutoutReveal
        eyebrow="Hardware" title="Down to the handle." body="Body copy."
        images={[<img key="gold" src="/cutouts/gold-handle.webp" alt="" />]}
        stats={[]}
      />,
    );
    expect(container.querySelector('.beco-cutout-drift')).not.toBeNull();
    expect(container.querySelector('[class*="beco-depth-"]')).toBeNull();
  });
});

/**
 * A single photograph used to be the only option. `images` crossfades
 * through more than one the same way `RotatingStatement` crossfades its own
 * photographs, built on the exact same shape on purpose: opacity carried by
 * ONE source, the ternary, never also hardcoded into the base class string,
 * which is the bug that shipped there, D67.
 */
describe('CutoutReveal, with more than one image', () => {
  const IMAGES = [
    <img key="gold" src="/cutouts/gold-handle.webp" alt="Gold cabinet handle" />,
    <img key="black" src="/cutouts/black-handle.webp" alt="Matte black cabinet handle" />,
    <img key="grey" src="/cutouts/grey-handle.webp" alt="Brushed grey cabinet handle" />,
  ];
  const props = {
    eyebrow: 'Hardware', title: 'Down to the handle.', body: 'Body copy.', stats: [],
  };

  it('shows the first photograph at full opacity before any timer has run', () => {
    render(<CutoutReveal {...props} images={IMAGES} />);
    const gold = screen.getByAltText('Gold cabinet handle').parentElement;
    const black = screen.getByAltText('Matte black cabinet handle').parentElement;
    expect(gold).toHaveClass('opacity-100');
    expect(gold).not.toHaveClass('opacity-0');
    expect(black).toHaveClass('opacity-0');
    expect(black).not.toHaveClass('opacity-100');
  });

  it('crossfades to the next photograph on the interval', () => {
    render(<CutoutReveal {...props} images={IMAGES} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(1000); });
    const gold = screen.getByAltText('Gold cabinet handle').parentElement;
    const black = screen.getByAltText('Matte black cabinet handle').parentElement;
    expect(gold).toHaveClass('opacity-0');
    expect(gold).not.toHaveClass('opacity-100');
    expect(black).toHaveClass('opacity-100');
    expect(black).not.toHaveClass('opacity-0');
  });

  it('wraps round rather than stopping at the last photograph', () => {
    render(<CutoutReveal {...props} images={IMAGES} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(3000); });
    const gold = screen.getByAltText('Gold cabinet handle').parentElement;
    expect(gold).toHaveClass('opacity-100');
  });

  it('never cycles under prefers-reduced-motion, and still shows one photograph', () => {
    reducedMotion(true);
    render(<CutoutReveal {...props} images={IMAGES} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    const gold = screen.getByAltText('Gold cabinet handle').parentElement;
    expect(gold).toHaveClass('opacity-100');
  });

  it('does not set a timer for a single photograph', () => {
    render(
      <CutoutReveal
        {...props}
        images={[<img key="gold" src="/cutouts/gold-handle.webp" alt="Gold cabinet handle" />]}
      />,
    );
    act(() => { vi.advanceTimersByTime(10_000); });
    const gold = screen.getByAltText('Gold cabinet handle').parentElement;
    expect(gold).toHaveClass('opacity-100');
  });
});
