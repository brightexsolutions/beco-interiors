import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const linkQuoteCustomer = vi.fn();
vi.mock('@/app/(app)/quotes/actions', () => ({
  linkQuoteCustomer: (...a: unknown[]) => linkQuoteCustomer(...a),
}));
const createCustomer = vi.fn();
vi.mock('@/app/(app)/customers/actions', () => ({
  createCustomer: (...a: unknown[]) => createCustomer(...a),
}));
vi.mock('@/lib/customers', () => ({
  searchCustomers: vi.fn(async () => [
    {
      id: 'c2',
      name: 'ZZ Wanjiku',
      phone: '0711000222',
      email: null,
      company: null,
      kraPin: null,
      quoteCount: 1,
      lastActivityAt: '2026-10-01T00:00:00Z',
    },
  ]),
}));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('@beco/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@beco/ui')>();
  return { ...actual, toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } };
});

const { QuoteCustomer } = await import('../quote-customer');

const linked = { id: 'c1', name: 'ZZ Achieng', phone: '0722333730', email: null, company: null, kraPin: 'A123456789Z' };
const QUOTE = '11111111-1111-4111-8111-111111111111';

afterEach(() => vi.clearAllMocks());

describe('QuoteCustomer (D130)', () => {
  it('shows the linked record with a link to its page', () => {
    render(<QuoteCustomer quoteId={QUOTE} updatedAt="t1" customer={linked} canMutate />);
    expect(screen.getByRole('link', { name: 'ZZ Achieng' })).toHaveAttribute('href', '/customers/c1');
    expect(screen.getByText('KRA PIN A123456789Z')).toBeInTheDocument();
  });

  it('changes the customer by picking one, under the quote lock', async () => {
    linkQuoteCustomer.mockResolvedValue({ ok: 'Customer linked.' });
    const user = userEvent.setup();
    render(<QuoteCustomer quoteId={QUOTE} updatedAt="t1" customer={linked} canMutate />);
    await user.click(screen.getByRole('button', { name: 'Change' }));
    const dialog = screen.getByRole('dialog', { name: 'Change customer' });
    expect(within(dialog).getByRole('searchbox', { name: /client/i })).toHaveFocus();
    await user.type(within(dialog).getByRole('searchbox', { name: /client/i }), 'Wan');
    await user.click(await within(dialog).findByRole('button', { name: /ZZ Wanjiku/ }));
    const form = linkQuoteCustomer.mock.calls[0]?.[1] as FormData;
    expect(form.get('quoteId')).toBe(QUOTE);
    expect(form.get('updatedAt')).toBe('t1');
    expect(form.get('customerId')).toBe('c2');
    expect(toastSuccess).toHaveBeenCalledWith('Linked to ZZ Wanjiku.');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the dialog open and says why when the link is refused', async () => {
    linkQuoteCustomer.mockResolvedValue({ error: 'This quote changed while you were editing. Reload and try again.' });
    const user = userEvent.setup();
    render(<QuoteCustomer quoteId={QUOTE} updatedAt="t1" customer={null} canMutate />);
    expect(screen.getByText('No customer record linked.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.type(screen.getByRole('searchbox', { name: /client/i }), 'Wan');
    await user.click(await screen.findByRole('button', { name: /ZZ Wanjiku/ }));
    expect(toastError).toHaveBeenCalledWith('This quote changed while you were editing. Reload and try again.');
    expect(screen.getByRole('dialog', { name: 'Link a customer' })).toBeInTheDocument();
  });

  it('adds a new client in the same dialog and links them', async () => {
    createCustomer.mockResolvedValue({
      ok: 'ZZ New added.',
      customerId: 'c9',
      customer: { id: 'c9', name: 'ZZ New', phone: '0700111222', email: null, company: null, kraPin: null },
    });
    linkQuoteCustomer.mockResolvedValue({ ok: 'Customer linked.' });
    const user = userEvent.setup();
    render(<QuoteCustomer quoteId={QUOTE} updatedAt="t1" customer={linked} canMutate />);
    await user.click(screen.getByRole('button', { name: 'Change' }));
    await user.click(screen.getByRole('button', { name: 'Add new client' }));
    const dialog = screen.getByRole('dialog', { name: 'Add new client' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await user.type(within(dialog).getByLabelText(/^name/i), 'ZZ New');
    await user.type(within(dialog).getByLabelText(/^phone/i), '0700111222');
    await user.click(within(dialog).getByRole('button', { name: 'Add and link' }));
    expect((linkQuoteCustomer.mock.calls[0]?.[1] as FormData).get('customerId')).toBe('c9');
  });

  it('offers no change to someone who cannot edit the quote', () => {
    render(<QuoteCustomer quoteId={QUOTE} updatedAt="t1" customer={linked} canMutate={false} />);
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
  });

  it('is axe clean', async () => {
    const { container } = render(<QuoteCustomer quoteId={QUOTE} updatedAt="t1" customer={linked} canMutate />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
