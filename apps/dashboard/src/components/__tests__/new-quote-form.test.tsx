import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { NewQuoteForm } from '../new-quote-form';

vi.mock('@/app/(app)/quotes/actions', () => ({
  createCounterQuote: vi.fn(async () => ({})),
}));

vi.mock('@/lib/catalogue', () => ({
  loadPickerCatalogue: vi.fn(async () => ({
    ranges: [],
    products: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Amber Jade',
      slug: 'amber-jade',
      price: 65000,
      unit: 'per slab',
      priceDisplayMode: 'fixed',
      categoryName: '12mm Sintered Stones',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Calacatta Gold',
      slug: 'calacatta-gold',
      price: 89000,
      unit: 'per slab',
      priceDisplayMode: 'fixed',
      categoryName: '12mm Sintered Stones',
    },
    ],
  })),
}));

vi.mock('@/lib/customers', () => ({
  searchCustomers: vi.fn(async () => [
    {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Achieng Otieno',
      phone: '0722333730',
      email: 'achieng@example.com',
      company: 'Karen Kitchens',
      kraPin: 'A123456789Z',
      quoteCount: 2,
      lastActivityAt: '2026-09-12T08:00:00Z',
    },
  ]),
}));

const createCustomer = vi.fn();
vi.mock('@/app/(app)/customers/actions', () => ({
  createCustomer: (...a: unknown[]) => createCustomer(...a),
}));

const saveButtons = () => screen.getAllByRole('button', { name: 'Save quote' });

const hidden = (container: HTMLElement, name: string) =>
  (container.querySelector(`input[type="hidden"][name="${name}"]`) as HTMLInputElement).value;

const addAmber = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
  await user.click(await screen.findByRole('checkbox', { name: /Amber Jade/i }));
  await user.click(screen.getByRole('button', { name: 'Add 1 item' }));
};

const pickAchieng = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('searchbox', { name: /client/i }), 'Achieng');
  await user.click(await screen.findByRole('button', { name: /Achieng Otieno/ }));
};

describe('NewQuoteForm', () => {
  it('picks a client record, posts its id with the snapshot, and Change picks again (D130)', async () => {
    const user = userEvent.setup();
    const { container } = render(<NewQuoteForm />);
    await pickAchieng(user);
    expect(screen.getByRole('link', { name: 'Achieng Otieno' })).toHaveAttribute(
      'href',
      '/customers/55555555-5555-4555-8555-555555555555',
    );
    expect(screen.getByText('KRA PIN A123456789Z')).toBeInTheDocument();
    expect(hidden(container, 'customerId')).toBe('55555555-5555-4555-8555-555555555555');
    expect(hidden(container, 'customerName')).toBe('Achieng Otieno');
    expect(hidden(container, 'customerPhone')).toBe('0722333730');
    expect(hidden(container, 'customerEmail')).toBe('achieng@example.com');
    await user.click(screen.getByRole('button', { name: 'Change' }));
    expect(hidden(container, 'customerId')).toBe('');
    expect(screen.getByRole('searchbox', { name: /client/i })).toBeInTheDocument();
  });

  it('adds a new client from the quote and selects them', async () => {
    createCustomer.mockResolvedValue({
      ok: 'ZZ Wanjiku added.',
      customerId: '66666666-6666-4666-8666-666666666666',
      customer: {
        id: '66666666-6666-4666-8666-666666666666',
        name: 'ZZ Wanjiku',
        phone: '0711000111',
        email: null,
        company: null,
        kraPin: null,
      },
    });
    const user = userEvent.setup();
    const { container } = render(<NewQuoteForm />);
    await user.click(screen.getByRole('button', { name: 'Add new client' }));
    const dialog = screen.getByRole('dialog', { name: 'Add new client' });
    await user.type(within(dialog).getByLabelText(/^name/i), 'ZZ Wanjiku');
    await user.type(within(dialog).getByLabelText(/^phone/i), '0711000111');
    await user.click(within(dialog).getByRole('button', { name: 'Add and use' }));
    expect(await screen.findByRole('link', { name: 'ZZ Wanjiku' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(hidden(container, 'customerId')).toBe('66666666-6666-4666-8666-666666666666');
    // The client form is not nested inside the quote form.
    expect(container.querySelectorAll('form form')).toHaveLength(0);
  });

  it('offers the existing client when a new one collides on the phone number', async () => {
    createCustomer.mockResolvedValue({
      error: 'That number already belongs to Achieng Otieno.',
      field: 'phone',
      existing: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Achieng Otieno',
        phone: '0722333730',
        email: null,
        company: null,
        kraPin: null,
      },
    });
    const user = userEvent.setup();
    const { container } = render(<NewQuoteForm />);
    await user.click(screen.getByRole('button', { name: 'Add new client' }));
    const dialog = screen.getByRole('dialog', { name: 'Add new client' });
    await user.type(within(dialog).getByLabelText(/^name/i), 'A Otieno');
    await user.type(within(dialog).getByLabelText(/^phone/i), '+254722333730');
    await user.click(within(dialog).getByRole('button', { name: 'Add and use' }));
    expect(await within(dialog).findByText(/already on file for/)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Open Achieng Otieno' })).toHaveAttribute(
      'href',
      '/customers/55555555-5555-4555-8555-555555555555',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Use Achieng Otieno' }));
    expect(hidden(container, 'customerId')).toBe('55555555-5555-4555-8555-555555555555');
  });

  it('keeps a phone action bar with the running total and Save, and says what is missing', async () => {
    const user = userEvent.setup();
    render(<NewQuoteForm />);
    const bar = screen.getByTestId('quote-action-bar');
    expect(within(bar).getByText('No items yet')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Save quote' })).toBeDisabled();
    await addAmber(user);
    expect(within(bar).getByText('1 item')).toBeInTheDocument();
    expect(within(bar).getByText('Pick or add a client first.')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Save quote' })).toBeDisabled();
    await pickAchieng(user);
    expect(within(bar).getByRole('button', { name: 'Save quote' })).toBeEnabled();
  });

  it('autofocuses Add from catalogue so no tap is spent reaching it', () => {
    render(<NewQuoteForm />);
    expect(screen.getByRole('button', { name: 'Add from catalogue' })).toHaveFocus();
  });

  it('adds every checked product from the dialog', async () => {
    const user = userEvent.setup();
    render(<NewQuoteForm />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add from catalogue' });
    expect(within(dialog).getByRole('searchbox', { name: /search/i })).toHaveFocus();
    await user.click(await within(dialog).findByRole('checkbox', { name: /Amber Jade/i }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Calacatta Gold/i }));
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 items' }));
    expect(screen.getByText('Amber Jade')).toBeInTheDocument();
    expect(screen.getByText('Calacatta Gold')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add from catalogue' })).toHaveFocus();
  });

  it('keeps Save disabled until there is a line, and says why', () => {
    render(<NewQuoteForm />);
    for (const button of saveButtons()) {
      expect(button).toBeDisabled();
    }
    expect(screen.getAllByText('Add an item first.').length).toBeGreaterThan(0);
  });

  it('adds a custom line that can be named, not an empty catalogue gap', async () => {
    const user = userEvent.setup();
    render(<NewQuoteForm />);
    await user.click(screen.getByRole('button', { name: 'Custom item' }));
    expect(screen.getByRole('textbox', { name: 'Custom item' })).toBeInTheDocument();
    await pickAchieng(user);
    expect(saveButtons()[0]).toBeEnabled();
  });

  it('is axe clean', async () => {
    const { container } = render(<NewQuoteForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sizes Custom item to the catalogue trigger', () => {
    render(<NewQuoteForm />);
    const add = screen.getByRole('button', { name: 'Add from catalogue' });
    const custom = screen.getByRole('button', { name: 'Custom item' });
    expect(add.className.split(/\s+/)).toContain('h-11');
    expect(add.className.split(/\s+/)).toContain('w-full');
    expect(custom.className.split(/\s+/)).toContain('h-11');
    expect(custom.className.split(/\s+/)).toContain('w-full');
  });

  it('lays a catalogue line on a compact shared grid', async () => {
    const user = userEvent.setup();
    const { container } = render(<NewQuoteForm />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('checkbox', { name: /Amber Jade/i }));
    await user.click(within(dialog).getByRole('button', { name: 'Add 1 item' }));
    expect(screen.getByText('per slab')).toBeInTheDocument();
    const row = screen.getByText('Amber Jade').closest('li');
    expect(row).toBeTruthy();
    expect(row?.className).toContain('py-3');
    // The row grid follows the list's own width, a container query, never the
    // screen: beside the summary at 1280 the screen breakpoint left the item
    // name 0px wide.
    expect(row?.className).toMatch(/@3xl:grid-cols-\[/);
    expect(row?.className).not.toMatch(/(^|\s)md:grid/);
    expect(row?.closest('.\\@container')).not.toBeNull();
    expect(within(row as HTMLElement).queryByText('Qty')).toBeNull();
    expect(within(row as HTMLElement).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(container.querySelector('.overflow-y-auto')).not.toBeNull();
  });
});
