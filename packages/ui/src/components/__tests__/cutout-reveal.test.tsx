import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CutoutReveal } from '../cutout-reveal';

describe('CutoutReveal', () => {
  it('renders the copy and each real stat, not an invented count', () => {
    render(
      <CutoutReveal
        eyebrow="Hardware"
        title="Down to the handle."
        body="Six finishes on the floor, ready to specify against any run of cabinetry."
        image={<img src="/cutouts/gold-handle.webp" alt="Gold cabinet handle" />}
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
        image={<img src="/cutouts/gold-handle.webp" alt="" />}
        stats={[]}
      />,
    );
    expect(container.querySelector('dl')).toBeNull();
  });

  it('renders the call to action as a real anchor, not a decorative control', () => {
    render(
      <CutoutReveal
        eyebrow="Hardware" title="Down to the handle." body="Body copy."
        image={<img src="/cutouts/gold-handle.webp" alt="" />}
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
        image={<img src="/cutouts/gold-handle.webp" alt="" />}
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
        image={<img src="/cutouts/gold-handle.webp" alt="" />}
        stats={[]}
      />,
    );
    expect(container.querySelector('.beco-cutout-drift')).not.toBeNull();
    expect(container.querySelector('[class*="beco-depth-"]')).toBeNull();
  });
});
