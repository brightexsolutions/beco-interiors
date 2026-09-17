import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { BackLink } from '../back-link';

describe('BackLink', () => {
  it('goes to a real destination rather than back in history', () => {
    render(<BackLink href="/quotes">Quotes</BackLink>);
    expect(screen.getByRole('link', { name: 'Quotes' })).toHaveAttribute('href', '/quotes');
  });

  it('names the destination, so the chevron is not the only clue', () => {
    render(<BackLink href="/orders">Orders</BackLink>);
    // The accessible name must be the destination alone: the chevron is
    // aria-hidden, so a screen reader hears "Orders, link" and nothing else.
    expect(screen.getByRole('link').textContent).toBe('Orders');
  });

  it('meets the 44px touch target floor', () => {
    render(<BackLink href="/quotes">Quotes</BackLink>);
    expect(screen.getByRole('link').className).toContain('min-h-[2.75rem]');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BackLink href="/quotes">Quotes</BackLink>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
