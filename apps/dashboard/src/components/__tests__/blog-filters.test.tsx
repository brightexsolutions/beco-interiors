import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

vi.mock('next/navigation', () => ({
  usePathname: () => '/studio/blog',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const { BlogFilters } = await import('../blog-filters');

describe('BlogFilters', () => {
  it('has search and status on one toolbar', () => {
    render(<BlogFilters />);
    expect(screen.getByLabelText('Search articles')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BlogFilters />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
