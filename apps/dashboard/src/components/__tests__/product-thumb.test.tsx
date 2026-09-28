import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ProductThumb } from '../product-thumb';

describe('ProductThumb', () => {
  it('shows the 400px derivative of the first photograph', () => {
    const { container } = render(<ProductThumb name="Amber Jade" path="products/amber-jade/hero" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/products\/amber-jade\/hero-400\.webp$/);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('falls back to initials when there is no photograph', () => {
    render(<ProductThumb name="Calacatta Gold" path={null} />);
    expect(screen.getByText('CG')).toBeInTheDocument();
  });

  it('falls back to initials when the image fails, never a broken icon', () => {
    const { container } = render(<ProductThumb name="537 160 Black" path="products/handle/hero" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(<ProductThumb name="Amber Jade" path="products/amber-jade/hero" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
