import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/orders',
  useSearchParams: () => params,
}));

const { OrderFilters } = await import('../order-filters');

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

const ownerOptions = [
  { value: 'all' as const, label: 'Everyone' },
  { value: 'mine' as const, label: 'Assigned to me' },
];

describe('OrderFilters', () => {
  it('writes status into the URL, which is what the list reads', async () => {
    const user = userEvent.setup();
    render(<OrderFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'confirmed');
    expect(push).toHaveBeenCalledWith('/orders?status=confirmed');
  });

  it('labels Website for the stored web source', async () => {
    const user = userEvent.setup();
    render(<OrderFilters ownerOptions={ownerOptions} />);
    expect(screen.getByRole('option', { name: 'Website' })).toHaveValue('web');
    await user.selectOptions(screen.getByLabelText('Filter by source'), 'web');
    expect(push).toHaveBeenCalledWith('/orders?source=web');
  });

  it('puts search and the selects on one row from lg', () => {
    const { container } = render(<OrderFilters ownerOptions={ownerOptions} />);
    expect(container.firstChild).toHaveClass('lg:flex', 'lg:items-end');
  });

  it('has no Search label, only a placeholder and aria-label', () => {
    render(<OrderFilters ownerOptions={ownerOptions} />);
    expect(screen.queryByText('Search')).toBeNull();
    expect(screen.getByLabelText('Search orders')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OrderFilters ownerOptions={ownerOptions} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
