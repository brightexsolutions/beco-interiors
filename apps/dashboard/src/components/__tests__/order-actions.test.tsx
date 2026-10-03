import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { markOrderPaid, setOrderStatus } from '@/app/(app)/orders/actions';
import { OrderActions } from '../order-actions';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/app/(app)/orders/actions', () => ({
  setOrderStatus: vi.fn(async () => ({ ok: 'Marked confirmed.' })),
  markOrderPaid: vi.fn(async () => ({ ok: 'Marked paid.' })),
}));

const base = {
  orderId: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-09-18T10:00:00.000Z',
  reference: 'BEC-O-00042',
  status: 'pending' as const,
  paymentStatus: 'unpaid' as const,
  canMutate: true,
  canCancel: true,
};

describe('OrderActions', () => {
  beforeEach(() => {
    vi.mocked(setOrderStatus).mockClear();
    vi.mocked(markOrderPaid).mockClear();
    refresh.mockClear();
  });

  it('offers Confirm on a pending order', () => {
    render(<OrderActions {...base} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
  });

  it('hides Cancel order from a salesperson, who confirms, fulfils and records payment only (D110)', () => {
    render(<OrderActions {...base} canCancel={false} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('opens a ConfirmDialog named for the order when cancelling', async () => {
    const user = userEvent.setup();
    render(<OrderActions {...base} />);
    await user.click(screen.getByRole('button', { name: 'Cancel order' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Cancel BEC-O-00042');
    expect(within(dialog).getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ok$/i })).toBeNull();
  });

  it('opens a ConfirmDialog named for the order when marking paid', async () => {
    const user = userEvent.setup();
    render(<OrderActions {...base} />);
    await user.click(screen.getByRole('button', { name: 'Mark paid' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Mark BEC-O-00042 paid');
    expect(dialog).toHaveTextContent(/will be recorded as paid/i);
    expect(dialog).toHaveTextContent(/view, download or email the receipt/i);
    expect(dialog).not.toHaveTextContent(/offline/i);
    expect(dialog).not.toHaveTextContent(/stock/i);
    expect(within(dialog).getByRole('button', { name: 'Mark paid' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Mark paid' }));
    await waitFor(() => expect(markOrderPaid).toHaveBeenCalled());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('offers Fulfil on a confirmed order, not Confirm', () => {
    render(<OrderActions {...base} status="confirmed" />);
    expect(screen.getByRole('button', { name: 'Fulfil' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('hides writes when the viewer cannot mutate', () => {
    render(<OrderActions {...base} canMutate={false} />);
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.getByText(/cannot change it/i)).toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(<OrderActions {...base} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
