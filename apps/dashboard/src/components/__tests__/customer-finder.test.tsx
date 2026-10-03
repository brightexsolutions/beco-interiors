import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { searchCustomers } from '@/lib/customers';
import { CustomerFinder } from '../customer-finder';

vi.mock('@/lib/customers', () => ({
  searchCustomers: vi.fn(async (term: string) =>
    term.toLowerCase().startsWith('ach')
      ? [
          {
            name: 'Achieng Otieno',
            phone: '0722333730',
            email: 'achieng@example.com',
            company: 'Karen Kitchens',
            quoteCount: 3,
            lastQuotedAt: '2026-09-12T08:00:00Z',
          },
        ]
      : [],
  ),
}));

describe('CustomerFinder', () => {
  it('finds an earlier customer and hands the pick back', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<CustomerFinder onPick={onPick} />);
    await user.type(screen.getByRole('searchbox', { name: /returning customer/i }), 'Ach');
    const result = await screen.findByRole('button', { name: /Achieng Otieno/ });
    expect(result).toHaveTextContent('0722333730 · Karen Kitchens');
    expect(result).toHaveTextContent('3 quotes, last 12 Sep');
    await user.click(result);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ phone: '0722333730' }));
    expect(screen.getByRole('searchbox', { name: /returning customer/i })).toHaveValue('');
  });

  it('does not search on a single character', async () => {
    const user = userEvent.setup();
    vi.mocked(searchCustomers).mockClear();
    render(<CustomerFinder onPick={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: /returning customer/i }), 'A');
    await new Promise((r) => setTimeout(r, 300));
    expect(searchCustomers).not.toHaveBeenCalled();
  });

  it('says when nobody matches, pointing at the new customer fields', async () => {
    const user = userEvent.setup();
    render(<CustomerFinder onPick={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: /returning customer/i }), 'Zebedee');
    expect(await screen.findByText(/no earlier quotes match/i)).toBeInTheDocument();
  });

  it('degrades to typing the details when search fails', async () => {
    vi.mocked(searchCustomers).mockRejectedValueOnce(new Error('down'));
    const user = userEvent.setup();
    render(<CustomerFinder onPick={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: /returning customer/i }), 'Achieng');
    await waitFor(() => expect(screen.getByText(/not available right now/i)).toBeInTheDocument());
  });

  it('Enter picks the top result', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<CustomerFinder onPick={onPick} />);
    const box = screen.getByRole('searchbox', { name: /returning customer/i });
    await user.type(box, 'Ach');
    await screen.findByRole('button', { name: /Achieng Otieno/ });
    await user.type(box, '{Enter}');
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('is axe clean with results showing', async () => {
    const user = userEvent.setup();
    const { container } = render(<CustomerFinder onPick={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: /returning customer/i }), 'Ach');
    await screen.findByRole('button', { name: /Achieng Otieno/ });
    expect(await axe(container)).toHaveNoViolations();
  });
});
