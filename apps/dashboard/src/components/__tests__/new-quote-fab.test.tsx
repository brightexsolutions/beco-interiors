import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NewQuoteFab } from '../new-quote-fab';

describe('NewQuoteFab', () => {
  it('goes to /quotes/new, not a hash and not a no-op', () => {
    render(<NewQuoteFab />);
    expect(screen.getByRole('link', { name: 'New quote' })).toHaveAttribute('href', '/quotes/new');
  });

  it('floats rather than sitting in the heading', () => {
    render(<NewQuoteFab />);
    expect(screen.getByRole('link').className).toContain('fixed');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<NewQuoteFab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
