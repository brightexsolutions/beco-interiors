import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CustomerListItem } from '@/lib/customer-records';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/customers',
  useSearchParams: () => params,
}));

const { CustomerResults, CustomerFilters } = await import('../customer-results');

const customer = (patch: Partial<CustomerListItem> = {}): CustomerListItem => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Achieng Otieno',
  phone: '0722333730',
  email: null,
  company: 'Karen Kitchens',
  kraPin: 'A123456789Z',
  clientType: 'designer',
  quoteCount: 3,
  orderCount: 1,
  totalSpent: 150800,
  lastActivityAt: '2026-10-01T09:00:00.000Z',
  ...patch,
});

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('CustomerResults (D130)', () => {
  it('shows name, company, phone, type, counts, spent and last activity, each row linking to the customer', () => {
    render(<CustomerResults customers={[customer()]} showFigures />);
    const rows = screen.getByRole('list', { name: 'Customers' });
    const row = within(rows).getByRole('link', { name: 'View Achieng Otieno' });
    expect(row).toHaveAttribute('href', '/customers/11111111-1111-4111-8111-111111111111');
    expect(row).toHaveTextContent('0722333730 · Karen Kitchens · Designer');
    expect(row).toHaveTextContent('3 quotes, 1 order');
    expect(row.textContent).toMatch(/150,800/);
    expect(row).toHaveTextContent('Last activity 1 Oct 2026');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Spent' })).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'Achieng Otieno' })).toHaveAttribute(
      'href',
      '/customers/11111111-1111-4111-8111-111111111111',
    );
  });

  it('leaves out counts and spend for a role that cannot read quotes or orders', () => {
    render(<CustomerResults customers={[customer()]} showFigures={false} />);
    const table = screen.getByRole('table');
    expect(within(table).queryByRole('columnheader', { name: 'Spent' })).toBeNull();
    expect(within(table).queryByRole('columnheader', { name: 'Quotes, orders' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Customers' })).getByRole('link', { name: 'View Achieng Otieno' })).not.toHaveTextContent('3 quotes');
  });

  it('says Not set for a customer with no type, and an empty state when nothing matches', () => {
    const { unmount } = render(<CustomerResults customers={[customer({ clientType: null })]} showFigures />);
    expect(within(screen.getByRole('table')).getByText('Not set')).toBeInTheDocument();
    unmount();
    render(<CustomerResults customers={[]} showFigures />);
    expect(screen.getByText('No customers here')).toBeInTheDocument();
  });

  it('pages through a long list in the URL', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 30 }, (_, i) => customer({ id: `id-${i}`, name: `Customer ${i}` }));
    render(<CustomerResults customers={many} showFigures />);
    await user.click(screen.getAllByRole('button', { name: /next/i })[0]!);
    expect(push).toHaveBeenCalledWith('/customers?page=2');
  });

  it('is axe clean', async () => {
    const { container } = render(<CustomerResults customers={[customer()]} showFigures />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('CustomerFilters (D130)', () => {
  it('filters by client type and sorts, writing the URL', async () => {
    const user = userEvent.setup();
    render(<CustomerFilters showSpent count="3 customers" />);
    await user.selectOptions(screen.getByRole('combobox', { name: /type/i }), 'contractor');
    expect(push).toHaveBeenLastCalledWith('/customers?type=contractor');
    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'spent');
    expect(push).toHaveBeenLastCalledWith('/customers?sort=spent');
    expect(screen.getByText('3 customers')).toBeInTheDocument();
  });

  it('offers no spend sort to a role that cannot see spend', () => {
    render(<CustomerFilters showSpent={false} />);
    const sort = screen.getByRole('combobox', { name: /sort/i });
    expect(within(sort).queryByRole('option', { name: 'Total spent' })).toBeNull();
    expect(within(sort).getByRole('option', { name: 'Name' })).toBeInTheDocument();
  });

  it('searches by name, phone, company or KRA PIN', async () => {
    const user = userEvent.setup();
    render(<CustomerFilters showSpent />);
    const search = screen.getByRole('searchbox', { name: 'Search customers' });
    expect(search).toHaveAttribute('placeholder', 'Name, phone, company or KRA PIN');
    await user.type(search, 'A123');
    await new Promise((r) => setTimeout(r, 400));
    expect(push).toHaveBeenLastCalledWith('/customers?search=A123');
  });
});
