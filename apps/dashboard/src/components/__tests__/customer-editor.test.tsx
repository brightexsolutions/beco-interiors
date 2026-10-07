import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { CustomerRecord } from '@/lib/customer-records';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const updateCustomer = vi.fn();
const deleteCustomer = vi.fn();
vi.mock('@/app/(app)/customers/actions', () => ({
  updateCustomer: (...a: unknown[]) => updateCustomer(...a),
  deleteCustomer: (...a: unknown[]) => deleteCustomer(...a),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('@beco/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@beco/ui')>();
  return { ...actual, toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } };
});

const { CustomerEditor } = await import('../customer-editor');

const record: CustomerRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'ZZ Achieng Otieno',
  phone: '0722333730',
  email: 'achieng@example.com',
  company: 'Karen Kitchens',
  kraPin: 'A123456789Z',
  location: 'Karen',
  clientType: 'designer',
  notes: 'Prefers WhatsApp',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00.000001+00:00',
  createdBy: null,
};

afterEach(() => vi.clearAllMocks());

describe('CustomerEditor (D130)', () => {
  it('opens with every stored detail, editable', () => {
    render(<CustomerEditor customer={record} canEdit canDelete={false} />);
    expect(screen.getByLabelText(/^name/i)).toHaveValue('ZZ Achieng Otieno');
    expect(screen.getByLabelText(/^phone/i)).toHaveValue('0722333730');
    expect(screen.getByLabelText(/^email/i)).toHaveValue('achieng@example.com');
    expect(screen.getByLabelText(/^company/i)).toHaveValue('Karen Kitchens');
    expect(screen.getByLabelText(/^kra pin/i)).toHaveValue('A123456789Z');
    expect(screen.getByLabelText(/^location/i)).toHaveValue('Karen');
    expect(screen.getByLabelText(/^client type/i)).toHaveValue('designer');
    expect(screen.getByLabelText(/^notes/i)).toHaveValue('Prefers WhatsApp');
    expect(screen.queryByRole('button', { name: 'Delete customer' })).toBeNull();
  });

  it('saves under the lock, says so, and takes the new lock for the next save', async () => {
    updateCustomer.mockResolvedValueOnce({ ok: 'Saved.', customerId: record.id, updatedAt: 'lock-2' });
    updateCustomer.mockResolvedValueOnce({ ok: 'Saved.', customerId: record.id, updatedAt: 'lock-3' });
    const user = userEvent.setup();
    render(<CustomerEditor customer={record} canEdit canDelete={false} />);
    await user.clear(screen.getByLabelText(/^company/i));
    await user.type(screen.getByLabelText(/^company/i), 'Karen Interiors');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));
    const first = updateCustomer.mock.calls[0]?.[1] as FormData;
    expect(first.get('customerId')).toBe(record.id);
    expect(first.get('updatedAt')).toBe(record.updatedAt);
    expect(first.get('company')).toBe('Karen Interiors');
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Saved.'));
    await user.click(screen.getByRole('button', { name: 'Save customer' }));
    expect((updateCustomer.mock.calls[1]?.[1] as FormData).get('updatedAt')).toBe('lock-2');
  });

  it('refuses a number that belongs to someone else under the phone field, with a link to them', async () => {
    updateCustomer.mockResolvedValue({
      error: 'That number already belongs to ZZ Other.',
      field: 'phone',
      existing: { id: 'c2', name: 'ZZ Other', phone: '0711000222', email: null, company: null, kraPin: null },
    });
    const user = userEvent.setup();
    render(<CustomerEditor customer={record} canEdit canDelete={false} />);
    await user.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(await screen.findByText('That number already belongs to ZZ Other.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Open ZZ Other' })).toHaveAttribute('href', '/customers/c2'));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('is read only, with no save, for a role that cannot edit', () => {
    render(<CustomerEditor customer={record} canEdit={false} canDelete={false} />);
    expect(screen.getByLabelText(/^name/i)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save customer' })).toBeNull();
    expect(screen.getByText(/read only/i)).toBeInTheDocument();
  });

  it('deletes through a ConfirmDialog that names the customer, then returns to the list', async () => {
    deleteCustomer.mockResolvedValue({ ok: 'Customer deleted.', customerId: record.id });
    const user = userEvent.setup();
    render(<CustomerEditor customer={record} canEdit canDelete />);
    await user.click(screen.getByRole('button', { name: 'Delete customer' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete ZZ Achieng Otieno?');
    expect(dialog).toHaveTextContent('Their quotes and orders stay as they are');
    expect(updateCustomer).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Delete customer' }));
    expect((deleteCustomer.mock.calls[0]?.[1] as FormData).get('customerId')).toBe(record.id);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('ZZ Achieng Otieno deleted.'));
    expect(push).toHaveBeenCalledWith('/customers');
    // The confirm button is outside the details form, so it never saved them.
    expect(updateCustomer).not.toHaveBeenCalled();
  });

  it('stays on the page and says why when the delete is refused', async () => {
    deleteCustomer.mockResolvedValue({ error: 'Only an admin can delete a customer.' });
    const user = userEvent.setup();
    render(<CustomerEditor customer={record} canEdit canDelete />);
    await user.click(screen.getByRole('button', { name: 'Delete customer' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete customer' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Only an admin can delete a customer.'));
    expect(push).not.toHaveBeenCalled();
  });

  it('is axe clean', async () => {
    const { container } = render(<CustomerEditor customer={record} canEdit canDelete />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
