import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/users',
  useSearchParams: () => params,
}));

const { UserFilters } = await import('../user-filters');

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('UserFilters', () => {
  it('writes role into the URL, which is what the list reads', async () => {
    const user = userEvent.setup();
    render(<UserFilters />);
    await user.selectOptions(screen.getByLabelText('Filter by role'), 'beco_sales');
    expect(push).toHaveBeenCalledWith('/users?role=beco_sales');
  });

  it('puts search and the two filters on one row from lg', () => {
    const { container } = render(<UserFilters />);
    expect(container.firstChild).toHaveClass('lg:flex');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<UserFilters />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
