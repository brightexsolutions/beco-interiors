import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewProductButton, NewProductFab } from '../new-product';

describe('NewProductButton', () => {
  it('goes to /products?new=1, not a hash and not a no-op', () => {
    render(<NewProductButton />);
    expect(screen.getByRole('link', { name: 'New product' })).toHaveAttribute('href', '/products?new=1');
  });
});

describe('NewProductFab', () => {
  it('floats rather than sitting in the heading', () => {
    render(<NewProductFab />);
    expect(screen.getByRole('link', { name: 'New product' })).toHaveAttribute('href', '/products?new=1');
    expect(screen.getByRole('link').className).toContain('fixed');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewProductFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
