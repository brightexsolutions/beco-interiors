import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { assignQuote, reopenQuote } from '@/app/(app)/quotes/actions';
import { QuoteActions } from '../quote-actions';

vi.mock('@/app/(app)/quotes/actions', () => ({
  claimQuote: vi.fn(async () => ({})),
  assignQuote: vi.fn(async () => ({})),
  setQuoteStatus: vi.fn(async () => ({})),
  approveQuote: vi.fn(async () => ({})),
  reissueQuote: vi.fn(async () => ({})),
  reopenQuote: vi.fn(async () => ({ ok: 'Quote reopened. It is reviewing again.' })),
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
};

describe('QuoteActions', () => {
  beforeEach(() => {
    vi.mocked(assignQuote).mockClear();
    vi.mocked(reopenQuote).mockClear();
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
  });

  it('is axe clean in reviewing and lost', async () => {
    const { container, rerender } = render(<QuoteActions {...base} />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<QuoteActions {...base} status="lost" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
