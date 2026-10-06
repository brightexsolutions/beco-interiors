import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

  it('puts search and the selects on one row from xl, and the four selects two by two below it, no chips', () => {
    render(<OrderFilters ownerOptions={ownerOptions} />);
    expect(screen.getByLabelText('Search orders').closest('form.xl\\:flex-row')).not.toBeNull();
    const grid = screen.getByLabelText('Filter by payment').closest('[data-filter-grid]');
    expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-4', 'xl:flex');
    expect(screen.queryByRole('group', { name: 'Payment' })).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('filters payment from its select, the same param the chips wrote', async () => {
    const user = userEvent.setup();
    render(<OrderFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText('Filter by payment'), 'unpaid');
    expect(push).toHaveBeenLastCalledWith('/orders?payment=unpaid');
  });

  it('switches owner, and shows the first owner when the URL names none', async () => {
    const user = userEvent.setup();
    render(<OrderFilters ownerOptions={ownerOptions} />);
    expect(screen.getByLabelText('Filter by owner')).toHaveValue('all');
    await user.selectOptions(screen.getByLabelText('Filter by owner'), 'mine');
    expect(push).toHaveBeenLastCalledWith('/orders?owner=mine');
  });

  it('shows the count in the filter grid', () => {
    render(<OrderFilters ownerOptions={ownerOptions} count="3 orders" />);
    expect(within(screen.getByLabelText('Filter by payment').closest('[data-filter-grid]') as HTMLElement).getByText('3 orders')).toBeInTheDocument();
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
