import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { assignQuote, reopenQuote, setQuoteStatus } from '@/app/(app)/quotes/actions';
import { convertQuoteToOrder } from '@/app/(app)/orders/actions';
import { QuoteActions } from '../quote-actions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/(app)/quotes/actions', () => ({
  claimQuote: vi.fn(async () => ({})),
  assignQuote: vi.fn(async () => ({})),
  setQuoteStatus: vi.fn(async () => ({})),
  approveQuote: vi.fn(async () => ({})),
  reissueQuote: vi.fn(async () => ({})),
  reopenQuote: vi.fn(async () => ({ ok: 'Quote reopened. It is reviewing again.' })),
}));
vi.mock('@/app/(app)/orders/actions', () => ({
  convertQuoteToOrder: vi.fn(async () => ({ ok: 'Order BEC-O-00001 is ready.', orderReference: 'BEC-O-00001' })),
}));

const base = {
  quoteId: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-09-17T10:00:00.000Z',
  reference: 'BEC-Q-00042',
  status: 'reviewing' as const,
  assignedTo: 'sales-1',
  assignedToName: 'Sam Odhiambo',
  requiresApproval: false,
  approvedAt: null,
  canClaim: false,
  canMutate: true,
  canAssign: false,
  canApprove: false,
  expired: false,
  assignees: [],
  convertedOrderReference: null,
};

describe('QuoteActions', () => {
  beforeEach(() => {
    vi.mocked(assignQuote).mockClear();
    vi.mocked(reopenQuote).mockClear();
    vi.mocked(convertQuoteToOrder).mockClear();
  });
  it('spins only the status button that was pressed while the action runs (D117)', async () => {
    let finish: (value: { ok: string }) => void = () => {};
    vi.mocked(setQuoteStatus).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    render(<QuoteActions {...base} />);
    await user.click(screen.getByRole('button', { name: 'Quoted' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Quoted' })).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByRole('button', { name: 'Quoted' })).toBeDisabled();
    // Only the pressed button carries aria-busy. Lost opens a dialog rather than submitting, so it is not a status submit here.
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('aria-busy') === 'true')).toHaveLength(1);
    finish({ ok: 'Marked quoted.' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Quoted' })).not.toHaveAttribute('aria-busy'));
  });

  it('offers Quoted and Lost on a reviewing quote the viewer owns', () => {
    render(<QuoteActions {...base} />);
    expect(screen.getByRole('button', { name: 'Quoted' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark lost' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim quote' })).toBeNull();
  });

  it('opens a ConfirmDialog named for the quote when marking lost', async () => {
    const user = userEvent.setup();
    render(<QuoteActions {...base} />);
    await user.click(screen.getByRole('button', { name: 'Mark lost' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Mark BEC-Q-00042 lost');
    expect(within(dialog).getByRole('button', { name: 'Mark lost' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ok$/i })).toBeNull();
  });

  it('shows Claim on an unassigned quote, not the lifecycle buttons', () => {
    render(
      <QuoteActions
        {...base}
        status="new"
        assignedTo={null}
        assignedToName={null}
        canClaim
        canMutate={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Claim quote' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quoted' })).toBeNull();
  });

  it('shows Approve only when the viewer is allowed to', () => {
    const { rerender } = render(<QuoteActions {...base} requiresApproval canApprove={false} />);
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    rerender(<QuoteActions {...base} requiresApproval canApprove />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('assigns as soon as a different salesperson is chosen, with no Reassign button', async () => {
    const user = userEvent.setup();
    render(
      <QuoteActions
        {...base}
        canAssign
        assignees={[
          { id: 'sales-1', fullName: 'Ken Mutiso' },
          { id: 'sales-2', fullName: 'Achieng Otieno' },
        ]}
      />,
    );
    expect(screen.queryByRole('button', { name: /reassign|^assign$/i })).toBeNull();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Assign to' }), 'sales-2');
    await waitFor(() => expect(assignQuote).toHaveBeenCalled());
    const form = vi.mocked(assignQuote).mock.calls.at(-1)?.[1];
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('assigneeId')).toBe('sales-2');
  });

  it('opens a ConfirmDialog named for the quote when the client comes back', async () => {
    const user = userEvent.setup();
    render(<QuoteActions {...base} status="lost" />);
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark lost' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Reopen BEC-Q-00042');
    expect(within(dialog).getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ok$/i })).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Reopen' }));
    await waitFor(() => expect(reopenQuote).toHaveBeenCalled());
    const form = vi.mocked(reopenQuote).mock.calls.at(-1)?.[1];
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('quoteId')).toBe(base.quoteId);
  });

  it('does not offer Reopen on a won quote', () => {
    render(<QuoteActions {...base} status="won" />);
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Convert to order' })).toBeInTheDocument();
  });

  it('opens a ConfirmDialog named for the quote when converting to an order', async () => {
    const user = userEvent.setup();
    render(<QuoteActions {...base} status="won" />);
    await user.click(screen.getByRole('button', { name: 'Convert to order' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Convert BEC-Q-00042 to an order');
    expect(dialog).toHaveTextContent(/will become an order with the prices already quoted/i);
    expect(dialog).toHaveTextContent(/confirm, fulfil and mark it paid/i);
    expect(within(dialog).getByRole('button', { name: 'Convert to order' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ok$/i })).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Convert to order' }));
    await waitFor(() => expect(convertQuoteToOrder).toHaveBeenCalled());
  });

  it('links to the order once a won quote has been converted', () => {
    render(<QuoteActions {...base} status="won" convertedOrderReference="BEC-O-00042" />);
    expect(screen.queryByRole('button', { name: 'Convert to order' })).toBeNull();
    expect(screen.getByRole('link', { name: 'View order' })).toHaveAttribute('href', '/orders/BEC-O-00042');
  });

  it('is axe clean in reviewing and lost', async () => {
    const { container, rerender } = render(<QuoteActions {...base} />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<QuoteActions {...base} status="lost" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
