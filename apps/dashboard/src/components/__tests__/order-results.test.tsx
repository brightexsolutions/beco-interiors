import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { OrderListItem } from '@/lib/orders';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/orders',
  useSearchParams: () => params,
}));

const { OrderResults } = await import('../order-results');

const order = (patch: Partial<OrderListItem> = {}): OrderListItem => ({
  id: '11111111-1111-4111-8111-111111111111',
  referenceNumber: 'BEC-O-00001',
  customerName: 'Njeri Kamau',
  customerPhone: '0711222333',
  status: 'pending',
  paymentStatus: 'unpaid',
  source: 'web',
  createdAt: '2026-09-18T10:28:00.000Z',
  paidAt: null,
  salespersonId: 'sales-1',
  salespersonName: 'Sam Odhiambo',
  quoteReference: 'BEC-Q-00001',
  value: 65000,
  isPriced: true,
  itemCount: 1,
  ...patch,
});

const many = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    order({
      id: `id-${i + 1}`,
      referenceNumber: `BEC-O-${String(i + 1).padStart(5, '0')}`,
      customerName: `Customer ${i + 1}`,
    }),
  );

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('OrderResults', () => {
  it('labels a web order as Website, never Web', () => {
    render(<OrderResults orders={[order()]} />);
    expect(screen.getAllByText('Website').length).toBeGreaterThan(0);
    expect(screen.queryByText('Web')).toBeNull();
  });

  it('gives every order an explicit View action', () => {
    render(<OrderResults orders={[order()]} />);
    const views = screen.getAllByRole('link', { name: /view.*BEC-O-00001/i });
    expect(views.length).toBeGreaterThan(0);
    for (const link of views) {
      expect(link).toHaveAttribute('href', '/orders/BEC-O-00001');
    }
  });

  it('paginates a long list', () => {
    render(<OrderResults orders={many(9)} />);
    expect(screen.getAllByRole('link', { name: 'BEC-O-00001' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'BEC-O-00009' })).toBeNull();
  });

  it('Next writes page into the URL', async () => {
    const user = userEvent.setup();
    render(<OrderResults orders={many(9)} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(push).toHaveBeenCalledWith('/orders?page=2');
  });

  it('makes the phone card itself the View action', () => {
    render(<OrderResults orders={[order()]} />);
    const views = screen.getAllByRole('link', { name: 'View BEC-O-00001' });
    expect(views.length).toBeGreaterThan(0);
  });

  it('keeps a desktop table and phone cards, never the other way round', () => {
    const { container } = render(<OrderResults orders={[order()]} />);
    expect(container.querySelector('.hidden.lg\\:block')).not.toBeNull();
    expect(container.querySelector('ul.lg\\:hidden')).not.toBeNull();
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('explains the empty list without offering a blank New order', () => {
    render(<OrderResults orders={[]} />);
    expect(screen.getByText('No orders here')).toBeInTheDocument();
    expect(screen.getByText(/convert a won quote/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new order/i })).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OrderResults orders={[order()]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
