import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewProductFab } from '../new-product';

describe('NewProductFab', () => {
  it('goes to /products?new=1 as a heading button, not a pill floating over the list (D112)', () => {
    render(<NewProductFab />);
    const link = screen.getByRole('link', { name: 'New product' });
    expect(link).toHaveAttribute('href', '/products?new=1');
    expect(link.className).not.toContain('fixed');
    expect(link.className).toContain('inline-flex');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewProductFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
