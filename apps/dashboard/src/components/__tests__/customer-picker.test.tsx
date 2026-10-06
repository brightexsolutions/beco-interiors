import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { searchCustomers } from '@/lib/customers';
import { CustomerPicker } from '../customer-picker';

vi.mock('@/lib/customers', () => ({
  searchCustomers: vi.fn(async (term: string) =>
    term.toLowerCase().startsWith('ach')
      ? [
          {
            id: 'c1',
            name: 'Achieng Otieno',
            phone: '0722333730',
            email: 'achieng@example.com',
            company: 'Karen Kitchens',
            kraPin: null,
            quoteCount: 3,
            lastActivityAt: '2026-09-12T08:00:00Z',
          },
          {
            id: 'c2',
            name: 'Achieng New',
            phone: '0711000222',
            email: null,
            company: null,
            kraPin: null,
            quoteCount: 0,
            lastActivityAt: '2026-10-01T08:00:00Z',
          },
        ]
      : [],
  ),
}));

const box = () => screen.getByRole('searchbox', { name: /client/i });

describe('CustomerPicker (D130)', () => {
  it('finds a customer record and hands the pick back', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<CustomerPicker onPick={onPick} onAddNew={vi.fn()} />);
    await user.type(box(), 'Ach');
    const result = await screen.findByRole('button', { name: /Achieng Otieno/ });
    expect(result).toHaveTextContent('0722333730 · Karen Kitchens');
    expect(result).toHaveTextContent('3 quotes, last 12 Sep');
    expect(screen.getByRole('button', { name: /Achieng New/ })).toHaveTextContent('No quotes yet');
    await user.click(result);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', phone: '0722333730' }));
    expect(box()).toHaveValue('');
  });

  it('does not search on a single character', async () => {
    const user = userEvent.setup();
    vi.mocked(searchCustomers).mockClear();
    render(<CustomerPicker onPick={vi.fn()} onAddNew={vi.fn()} />);
    await user.type(box(), 'A');
    await new Promise((r) => setTimeout(r, 300));
    expect(searchCustomers).not.toHaveBeenCalled();
  });

  it('says when nobody matches and offers Add new client, which calls back', async () => {
    const onAddNew = vi.fn();
    const user = userEvent.setup();
    render(<CustomerPicker onPick={vi.fn()} onAddNew={onAddNew} />);
    await user.type(box(), 'Zebedee');
    expect(await screen.findByText(/no client matches/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add new client' }));
    expect(onAddNew).toHaveBeenCalledOnce();
  });

  it('says so when search fails, pointing at adding the client', async () => {
    vi.mocked(searchCustomers).mockRejectedValueOnce(new Error('down'));
    const user = userEvent.setup();
    render(<CustomerPicker onPick={vi.fn()} onAddNew={vi.fn()} />);
    await user.type(box(), 'Achieng');
    await waitFor(() => expect(screen.getByText(/not available right now/i)).toBeInTheDocument());
  });

  it('Enter picks the top result', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<CustomerPicker onPick={onPick} onAddNew={vi.fn()} />);
    await user.type(box(), 'Ach');
    await screen.findByRole('button', { name: /Achieng Otieno/ });
    await user.type(box(), '{Enter}');
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('keeps Add new client at the 44px target', () => {
    render(<CustomerPicker onPick={vi.fn()} onAddNew={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add new client' }).className).toContain('h-11');
  });

  it('is axe clean with results showing', async () => {
    const user = userEvent.setup();
    const { container } = render(<CustomerPicker onPick={vi.fn()} onAddNew={vi.fn()} />);
    await user.type(box(), 'Ach');
    await screen.findByRole('button', { name: /Achieng Otieno/ });
    expect(await axe(container)).toHaveNoViolations();
  });
});
