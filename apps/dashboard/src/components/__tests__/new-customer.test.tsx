import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const createCustomer = vi.fn();
vi.mock('@/app/(app)/customers/actions', () => ({
  createCustomer: (...a: unknown[]) => createCustomer(...a),
}));

const { NewCustomer } = await import('../new-customer');

describe('NewCustomer (D130)', () => {
  it('opens the customer form and lands on the new record once saved', async () => {
    createCustomer.mockResolvedValue({
      ok: 'ZZ Wanjiku added.',
      customerId: 'c9',
      customer: { id: 'c9', name: 'ZZ Wanjiku', phone: '0711000111', email: null, company: null, kraPin: null },
    });
    const user = userEvent.setup();
    render(<NewCustomer />);
    await user.click(screen.getByRole('button', { name: 'New customer' }));
    const dialog = screen.getByRole('dialog', { name: 'New customer' });
    await user.type(within(dialog).getByLabelText(/^name/i), 'ZZ Wanjiku');
    await user.type(within(dialog).getByLabelText(/^phone/i), '0711000111');
    await user.click(within(dialog).getByRole('button', { name: 'Add customer' }));
    expect(push).toHaveBeenCalledWith('/customers/c9');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
