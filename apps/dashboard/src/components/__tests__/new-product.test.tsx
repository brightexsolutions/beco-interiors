import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewProductFab } from '../new-product';

describe('NewProductFab', () => {
  it('goes to /products?new=1, floats on desktop and on a phone', () => {
    render(<NewProductFab />);
    const link = screen.getByRole('link', { name: 'New product' });
    expect(link).toHaveAttribute('href', '/products?new=1');
    expect(link.className).toContain('fixed');
    expect(link.className).toContain('bg-charcoal');
    expect(link.className).not.toContain('lg:hidden');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewProductFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
