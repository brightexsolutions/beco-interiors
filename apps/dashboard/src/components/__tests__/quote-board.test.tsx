import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { QuoteListItem } from '@/lib/quotes';

const setQuoteStatus = vi.fn(async (..._args: unknown[]) => ({ ok: 'Marked.' }) as { ok?: string; error?: string });
vi.mock('@/app/(app)/quotes/actions', () => ({
  setQuoteStatus: (...args: unknown[]) => setQuoteStatus(...args),
}));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('@beco/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@beco/ui')>();
  return { ...actual, toast: Object.assign(vi.fn(), { success: toastSuccess, error: toastError, info: vi.fn(), dismiss: vi.fn() }) };
});

const { QuoteBoard } = await import('../quote-board');

const ME = 'u-sales';
const quote = (over: Partial<QuoteListItem> = {}): QuoteListItem => ({
  id: 'q1',
  referenceNumber: 'BEC-Q-00001',
  customerName: 'Njeri Kamau',
  customerPhone: '0700000001',
  status: 'new',
  source: 'web',
  createdAt: '2026-10-12T08:00:00.000Z',
  validUntil: null,
  requiresApproval: false,
  approvedAt: null,
  updatedAt: '2026-10-12T08:00:00.000Z',
  assignedTo: ME,
  assignedToName: 'Sam Odhiambo',
  createdBy: null,
  createdByName: null,
  value: 65000,
  isPriced: true,
  itemCount: 1,
  ...over,
});

const column = (status: string) => document.querySelector(`[data-column="${status}"]`) as HTMLElement;
const card = (reference: string) => document.querySelector(`[data-quote="${reference}"]`) as HTMLElement;
const columnOf = (reference: string) => (card(reference).closest('[data-column]') as HTMLElement).dataset.column;

/**
 * jsdom does no layout, so the column under the pointer is whatever
 * elementsFromPoint is told it is: the target column the test names.
 */
let under: HTMLElement | null = null;
Object.defineProperty(document, 'elementsFromPoint', {
  configurable: true,
  value: () => (under ? [under] : []),
});

/** A mouse drag: press on the card, move past the slop onto a column, release. */
function drag(from: HTMLElement, to: HTMLElement) {
  under = null;
  fireEvent.pointerDown(from, { pointerId: 1, button: 0, pointerType: 'mouse', clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { pointerId: 1, pointerType: 'mouse', clientX: 40, clientY: 12 });
  under = to;
  fireEvent.pointerMove(window, { pointerId: 1, pointerType: 'mouse', clientX: 300, clientY: 20 });
  const over = to.dataset.over === 'true';
  fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'mouse', clientX: 300, clientY: 20 });
  under = null;
  return over;
}

beforeEach(() => {
  setQuoteStatus.mockClear();
  setQuoteStatus.mockResolvedValue({ ok: 'Marked.' });
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe('QuoteBoard, D148', () => {
  it('lays the quotes out in five status columns with a count and the priced total', () => {
    render(
      <QuoteBoard
        viewerId={ME}
        isAdmin={false}
        quotes={[
          quote(),
          quote({ id: 'q2', referenceNumber: 'BEC-Q-00002', status: 'quoted', value: 95000 }),
          quote({ id: 'q3', referenceNumber: 'BEC-Q-00003', status: 'quoted', value: 5000 }),
        ]}
      />,
    );
    for (const name of ['New', 'Reviewing', 'Quoted', 'Won', 'Lost']) expect(screen.getByRole('heading', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    const quoted = column('quoted');
    expect(within(quoted).getByRole('heading')).toHaveTextContent('Quoted2');
    expect(quoted).toHaveTextContent(/100,000/);
    expect(within(column('won')).getByText('None')).toBeInTheDocument();
    expect(within(card('BEC-Q-00001')).getByRole('link', { name: 'Njeri Kamau' })).toHaveAttribute('href', '/quotes/BEC-Q-00001');
  });

  it('moves a card by drag to an allowed column and sends the status with the lock token', async () => {
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote()]} />);
    expect(drag(card('BEC-Q-00001'), column('reviewing'))).toBe(true);
    await waitFor(() => expect(setQuoteStatus).toHaveBeenCalledTimes(1));
    const form = setQuoteStatus.mock.calls[0]?.[1] as FormData;
    expect(form.get('quoteId')).toBe('q1');
    expect(form.get('status')).toBe('reviewing');
    expect(form.get('updatedAt')).toBe('2026-10-12T08:00:00.000Z');
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('BEC-Q-00001 moved to Reviewing.'));
  });

  it('refuses a drop on a column the quote cannot reach, and never calls the server', () => {
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote()]} />);
    // New cannot jump to Won, and nothing goes back to New.
    expect(drag(card('BEC-Q-00001'), column('won'))).toBe(false);
    expect(setQuoteStatus).not.toHaveBeenCalled();
    expect(columnOf('BEC-Q-00001')).toBe('new');
  });

  it('asks before marking won, and only moves on the confirm', async () => {
    const user = userEvent.setup();
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote({ status: 'quoted' })]} />);
    drag(card('BEC-Q-00001'), column('won'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Mark BEC-Q-00001 won');
    expect(setQuoteStatus).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Mark won' }));
    await waitFor(() => expect(setQuoteStatus).toHaveBeenCalledTimes(1));
    expect((setQuoteStatus.mock.calls[0]?.[1] as FormData).get('status')).toBe('won');
  });

  it('asks why before marking lost, refuses an empty reason, then sends it', async () => {
    const user = userEvent.setup();
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote({ status: 'reviewing' })]} />);
    drag(card('BEC-Q-00001'), column('lost'));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Mark lost' }));
    expect(toastError).toHaveBeenCalledWith('Say why this quote was lost.');
    expect(setQuoteStatus).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText('Why it was lost'), 'Went with a cheaper quartz');
    await user.click(within(dialog).getByRole('button', { name: 'Mark lost' }));
    await waitFor(() => expect(setQuoteStatus).toHaveBeenCalledTimes(1));
    const form = setQuoteStatus.mock.calls[0]?.[1] as FormData;
    expect(form.get('status')).toBe('lost');
    expect(form.get('lostReason')).toBe('Went with a cheaper quartz');
  });

  it('moves from the keyboard: Space lifts, arrows choose among the legal columns, Space drops', async () => {
    const user = userEvent.setup();
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote()]} />);
    const grip = screen.getByRole('button', { name: 'Move BEC-Q-00001' });
    grip.focus();
    await user.keyboard(' ');
    expect(grip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Picked up BEC-Q-00001. Reviewing.');
    expect(column('reviewing').dataset.over).toBe('true');
    await user.keyboard('{ArrowRight}');
    expect(column('quoted').dataset.over).toBe('true');
    expect(screen.getByRole('status')).toHaveTextContent('Quoted');
    // Only two legal columns, so the arrows wrap rather than reaching Won.
    await user.keyboard('{ArrowRight}');
    expect(column('reviewing').dataset.over).toBe('true');
    await user.keyboard('{ArrowLeft} ');
    await waitFor(() => expect((setQuoteStatus.mock.calls[0]?.[1] as FormData).get('status')).toBe('quoted'));
  });

  it('puts a lifted card back on Escape without asking the server', async () => {
    const user = userEvent.setup();
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote()]} />);
    screen.getByRole('button', { name: 'Move BEC-Q-00001' }).focus();
    await user.keyboard(' {ArrowRight}{Escape}');
    expect(screen.getByRole('status')).toHaveTextContent('BEC-Q-00001 put back in New.');
    expect(setQuoteStatus).not.toHaveBeenCalled();
    expect(column('quoted').dataset.over).toBeUndefined();
  });

  it('draws the lifted card under the pointer while a mouse carries it, and only after it moves', () => {
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote()]} />);
    fireEvent.pointerDown(card('BEC-Q-00001'), { pointerId: 1, button: 0, pointerType: 'mouse', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: 'mouse', clientX: 12, clientY: 11 });
    expect(document.querySelector('[data-lifted]')).toBeNull();
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: 'mouse', clientX: 60, clientY: 30 });
    expect(document.querySelector('[data-lifted]')).not.toBeNull();
    expect(document.querySelector('[data-quote-board]')).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'mouse', clientX: 60, clientY: 30 });
    expect(document.querySelector('[data-lifted]')).toBeNull();
    expect(setQuoteStatus).not.toHaveBeenCalled();
  });

  it('lifts on a phone only after a press is held, and lets a quick swipe scroll instead', () => {
    vi.useFakeTimers();
    try {
      render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote()]} />);
      // A swipe: moving before the hold completes is a scroll.
      fireEvent.pointerDown(card('BEC-Q-00001'), { pointerId: 2, button: 0, pointerType: 'touch', clientX: 10, clientY: 10 });
      fireEvent.pointerMove(window, { pointerId: 2, pointerType: 'touch', clientX: 60, clientY: 10 });
      act(() => vi.advanceTimersByTime(400));
      expect(document.querySelector('[data-lifted]')).toBeNull();
      fireEvent.pointerUp(window, { pointerId: 2, pointerType: 'touch' });

      // A hold: still for 300ms, then the card is in the hand.
      fireEvent.pointerDown(card('BEC-Q-00001'), { pointerId: 3, button: 0, pointerType: 'touch', clientX: 10, clientY: 10 });
      act(() => vi.advanceTimersByTime(320));
      expect(document.querySelector('[data-lifted]')).not.toBeNull();
      under = column('reviewing');
      fireEvent.pointerMove(window, { pointerId: 3, pointerType: 'touch', clientX: 300, clientY: 20 });
      fireEvent.pointerUp(window, { pointerId: 3, pointerType: 'touch', clientX: 300, clientY: 20 });
      under = null;
    } finally {
      vi.useRealTimers();
    }
    expect((setQuoteStatus.mock.calls[0]?.[1] as FormData).get('status')).toBe('reviewing');
  });

  it('lets a salesperson move only their own quotes, and nobody move a closed one', () => {
    render(
      <QuoteBoard
        viewerId={ME}
        isAdmin={false}
        quotes={[
          quote({ id: 'q2', referenceNumber: 'BEC-Q-00002', assignedTo: 'someone-else', assignedToName: 'Grace Wanjiru' }),
          quote({ id: 'q3', referenceNumber: 'BEC-Q-00003', status: 'won' }),
        ]}
      />,
    );
    expect(card('BEC-Q-00002')).not.toHaveAttribute('data-movable');
    expect(screen.queryByRole('button', { name: 'Move BEC-Q-00002' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move BEC-Q-00003' })).toBeNull();
    // A press on a card that cannot move lifts nothing.
    expect(drag(card('BEC-Q-00002'), column('reviewing'))).toBe(false);
    expect(setQuoteStatus).not.toHaveBeenCalled();
    expect(within(card('BEC-Q-00002')).getByText('Assigned to Grace Wanjiru')).toBeInTheDocument();
  });

  it('lets an admin move anyone’s quote, but holds one waiting on approval to reviewing', () => {
    render(
      <QuoteBoard
        viewerId="admin"
        isAdmin
        quotes={[quote({ requiresApproval: true, approvedAt: null, assignedTo: 'someone-else' })]}
      />,
    );
    // Already in New, it may go to Reviewing and nowhere further until approved.
    expect(drag(card('BEC-Q-00001'), column('quoted'))).toBe(false);
    expect(drag(card('BEC-Q-00001'), column('reviewing'))).toBe(true);
    expect(screen.getByText('Needs approval')).toBeInTheDocument();
  });

  it('says why when the server refuses the move', async () => {
    setQuoteStatus.mockResolvedValueOnce({ error: 'This quote changed while you were editing' });
    render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote()]} />);
    drag(card('BEC-Q-00001'), column('reviewing'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('BEC-Q-00001: This quote changed while you were editing'));
  });

  it('shows POA for an unpriced quote and has no accessibility violations', async () => {
    const { container } = render(<QuoteBoard viewerId={ME} isAdmin={false} quotes={[quote({ isPriced: false, value: 0 })]} />);
    expect(screen.getByText('POA')).toHaveAttribute('title', 'Pricing on application');
    expect(await axe(container)).toHaveNoViolations();
  });
});
