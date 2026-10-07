import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { CustomerCreate } from '../customer-create';
import { CustomerCard } from '../customer-card';

const createCustomer = vi.fn();
vi.mock('@/app/(app)/customers/actions', () => ({
  createCustomer: (...a: unknown[]) => createCustomer(...a),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('@beco/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@beco/ui')>();
  return { ...actual, toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } };
});

const fill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/^name/i), 'ZZ Wanjiku');
  await user.type(screen.getByLabelText(/^phone/i), '0711000111');
  await user.type(screen.getByLabelText(/^kra pin/i), 'a123456789z');
  await user.selectOptions(screen.getByLabelText(/^client type/i), 'designer');
};

afterEach(() => vi.clearAllMocks());

describe('CustomerCreate (D130)', () => {
  it('posts every field to the action and hands the new record back', async () => {
    const customer = { id: 'c9', name: 'ZZ Wanjiku', phone: '0711000111', email: null, company: null, kraPin: 'A123456789Z' };
    createCustomer.mockResolvedValue({ ok: 'ZZ Wanjiku added.', customerId: 'c9', customer });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<CustomerCreate onCreated={onCreated} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Add customer' }));
    const form = createCustomer.mock.calls[0]?.[1] as FormData;
    expect(form.get('name')).toBe('ZZ Wanjiku');
    expect(form.get('phone')).toBe('0711000111');
    expect(form.get('kraPin')).toBe('a123456789z');
    expect(form.get('clientType')).toBe('designer');
    expect(form.has('notes')).toBe(true);
    expect(onCreated).toHaveBeenCalledWith(customer);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('ZZ Wanjiku added.'));
  });

  it('puts a field refusal under that field, not in a toast, and keeps what was typed', async () => {
    createCustomer.mockResolvedValue({ error: 'A KRA PIN is a letter, nine digits and a letter', field: 'kraPin' });
    const user = userEvent.setup();
    render(<CustomerCreate onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Add customer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A KRA PIN is a letter, nine digits and a letter');
    expect(toastError).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^name/i)).toHaveValue('ZZ Wanjiku');
  });

  it('toasts a refusal that belongs to no field', async () => {
    createCustomer.mockResolvedValue({ error: 'You do not have permission to add customers.' });
    const user = userEvent.setup();
    render(<CustomerCreate onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Add customer' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('You do not have permission to add customers.'));
  });

  it('sends a duplicate number to the existing customer instead of creating a second', async () => {
    createCustomer.mockResolvedValue({
      error: 'That number already belongs to Achieng.',
      field: 'phone',
      existing: { id: 'c1', name: 'Achieng', phone: '0722333730', email: null, company: null, kraPin: null },
    });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<CustomerCreate onCreated={onCreated} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Add customer' }));
    expect(await screen.findByText(/already on file for/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Open Achieng' })).toHaveAttribute('href', '/customers/c1'));
    // No Use button where there is nothing to use them for.
    expect(screen.queryByRole('button', { name: 'Use Achieng' })).toBeNull();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('is axe clean', async () => {
    const { container } = render(<CustomerCreate onCreated={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('CustomerCard', () => {
  it('links the name to the customer page and prints the KRA PIN when there is one', () => {
    render(
      <CustomerCard
        customer={{ id: 'c1', name: 'Achieng', phone: '0722333730', email: 'a@example.com', company: 'Karen Kitchens', kraPin: 'A123456789Z' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Achieng' })).toHaveAttribute('href', '/customers/c1');
    expect(screen.getByText('Karen Kitchens')).toBeInTheDocument();
    expect(screen.getByText('KRA PIN A123456789Z')).toBeInTheDocument();
  });

  it('can show the name without a link', () => {
    render(<CustomerCard linked={false} customer={{ id: 'c1', name: 'Achieng', phone: '07', email: null, company: null, kraPin: null }} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText(/KRA PIN/)).toBeNull();
  });
});
