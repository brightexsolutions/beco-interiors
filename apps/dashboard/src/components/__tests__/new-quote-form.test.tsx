import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { NewQuoteForm } from '../new-quote-form';

vi.mock('@/app/(app)/quotes/actions', () => ({
  createCounterQuote: vi.fn(async () => ({})),
}));

vi.mock('@/lib/catalogue', () => ({
  listCatalogueRanges: vi.fn(async () => []),
  searchCatalogue: vi.fn(async () => [
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
  ]),
}));

const saveButtons = () => screen.getAllByRole('button', { name: 'Save quote' });

describe('NewQuoteForm', () => {
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
    expect(screen.getByText('Add an item first.')).toBeInTheDocument();
  });

  it('adds a custom line that can be named, not an empty catalogue gap', async () => {
    const user = userEvent.setup();
    render(<NewQuoteForm />);
    await user.click(screen.getByRole('button', { name: 'Custom item' }));
    expect(screen.getByRole('textbox', { name: 'Custom item' })).toBeInTheDocument();
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
    expect(row?.className).toMatch(/md:grid-cols-\[/);
    expect(within(row as HTMLElement).queryByText('Qty')).toBeNull();
    expect(within(row as HTMLElement).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(container.querySelector('.overflow-y-auto')).not.toBeNull();
  });
});
