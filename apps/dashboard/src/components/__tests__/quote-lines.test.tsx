import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { addCatalogueLines, addCustomLine, updateQuoteLines } from '@/app/(app)/quotes/actions';
import { QuoteLines } from '../quote-lines';
import type { QuoteLine } from '@/lib/quote-detail';

vi.mock('@/app/(app)/quotes/actions', () => ({
  updateQuoteLines: vi.fn(async () => ({ ok: 'Items saved.' })),
  addCustomLine: vi.fn(async () => ({})),
  addCatalogueLines: vi.fn(async () => ({ ok: 'Items added to the quote.' })),
}));

vi.mock('@/lib/catalogue', () => ({
  loadPickerCatalogue: vi.fn(async () => ({
    ranges: [],
    products: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Calacatta Gold',
      slug: 'calacatta-gold',
      price: 89000,
      unit: 'per slab',
      priceDisplayMode: 'fixed',
      categoryName: '12mm Sintered Stones',
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Nero Marquina',
      slug: 'nero-marquina',
      price: 72000,
      unit: 'per slab',
      priceDisplayMode: 'fixed',
      categoryName: '12mm Sintered Stones',
    },
    ],
  })),
}));

const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  id: '11111111-1111-4111-8111-111111111111',
  description: 'Amber Jade',
  code: null,
  quantity: 1,
  unitPrice: 65000,
  listPrice: 65000,
  lineTotal: 65000,
  productId: '22222222-2222-4222-8222-222222222222',
  unit: 'per slab',
  removedFromCatalogue: false,
  ...over,
});

const jatoba = line({
  id: '44444444-4444-4444-8444-444444444444',
  description: 'ZZ Seed Jatoba Brown',
  quantity: 3,
  unitPrice: 85000,
  listPrice: 85000,
  lineTotal: 255000,
});

describe('QuoteLines', () => {
  it('in read-only mode, a discount is struck through against the catalogue price', () => {
    render(
      <QuoteLines
        lines={[line({ unitPrice: 55000, lineTotal: 55000 })]}
        quoteId="q"
        updatedAt="t"
        canMutate={false}
      />,
    );
    expect(screen.getByText('Amber Jade')).toBeInTheDocument();
    expect(screen.getAllByText(/55,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/65,000/).className).toContain('line-through');
    expect(screen.queryByRole('button', { name: 'Add from catalogue' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('prints the product code under the item, read-only and editable alike (D124)', () => {
    const { rerender } = render(
      <QuoteLines lines={[line({ description: 'Soft close hinge', code: 'H-301' })]} quoteId="q" updatedAt="t" canMutate={false} />,
    );
    expect(screen.getByText('Code H-301')).toBeInTheDocument();
    rerender(<QuoteLines lines={[line({ description: 'Soft close hinge', code: 'H-301' })]} quoteId="q" updatedAt="t" canMutate />);
    // Editable rows are narrow: the code alone on one line, "Code" for screen readers.
    const code = screen.getByTitle('Code H-301');
    expect(code).toHaveTextContent('Code H-301');
    expect(code.className).toContain('whitespace-nowrap');
    rerender(<QuoteLines lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
    expect(screen.queryByText(/^Code /)).toBeNull();
  });

  it('keeps Save disabled until a line actually changes, and says why', () => {
    render(<QuoteLines lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate />);
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('No changes to save.')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved')).toBeNull();
  });

  it('marks a changed row and enables one Save for every dirty line', async () => {
    const user = userEvent.setup();
    render(
      <QuoteLines
        lines={[line(), jatoba]}
        quoteId="11111111-1111-4111-8111-111111111111"
        updatedAt="lock"
        canMutate
      />,
    );
    await user.click(screen.getByRole('button', { name: /increase quantity of amber jade/i }));
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    expect(screen.getByText('Changed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.getByText('Save your line changes first.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateQuoteLines).toHaveBeenCalled());
    const form = vi.mocked(updateQuoteLines).mock.calls.at(-1)?.[1];
    expect(form).toBeInstanceOf(FormData);
    const items = JSON.parse(String((form as FormData).get('items')));
    expect(items).toEqual([{ lineId: line().id, quantity: 1.5, unitPrice: 65000 }]);
  });

  it('opens the catalogue dialog and adds every checked product in one write', async () => {
    const user = userEvent.setup();
    render(<QuoteLines lines={[line()]} quoteId="11111111-1111-4111-8111-111111111111" updatedAt="lock" canMutate />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add from catalogue' });
    expect(within(dialog).getByRole('searchbox', { name: /search/i })).toHaveFocus();
    await user.click(await within(dialog).findByRole('checkbox', { name: /Calacatta Gold/i }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Nero Marquina/i }));
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 items' }));
    await waitFor(() => expect(addCatalogueLines).toHaveBeenCalled());
    const form = vi.mocked(addCatalogueLines).mock.calls.at(-1)?.[1];
    expect(form).toBeInstanceOf(FormData);
    expect(JSON.parse(String((form as FormData).get('items')))).toEqual([
      { productId: '33333333-3333-4333-8333-333333333333', quantity: 0.5, unitPrice: 89000 },
      { productId: '55555555-5555-4555-8555-555555555555', quantity: 0.5, unitPrice: 72000 },
    ]);
  });

  it('pins item, qty, unit and line to one desktop row so they sit under the headers', () => {
    render(<QuoteLines lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
    const row = screen.getByText('Amber Jade').closest('[data-dirty]');
    expect(row).toBeTruthy();
    expect(row?.className).toContain('md:grid-cols-[minmax(0,1fr)_10rem_8.5rem_7.5rem]');
    expect(row?.innerHTML).toContain('md:col-start-1 md:row-start-1');
    expect(row?.innerHTML).toContain('md:col-start-2 md:row-start-1');
    expect(row?.innerHTML).toContain('md:col-start-3 md:row-start-1');
    expect(row?.innerHTML).toContain('md:col-start-4 md:row-start-1');
    expect(row?.innerHTML).not.toContain('md:col-start-5');
    const header = screen.getByText('Item').closest('div');
    expect(header).toBeTruthy();
    expect(within(header as HTMLElement).getByText('Qty')).toBeInTheDocument();
    expect(within(header as HTMLElement).getByText('Unit')).toBeInTheDocument();
    expect(within(header as HTMLElement).getByText('Line')).toBeInTheDocument();
    expect(within(header as HTMLElement).queryByText('Update')).toBeNull();
  });

  it('labels a deleted catalogue line instead of crashing', () => {
    render(
      <QuoteLines
        lines={[line({ productId: null, removedFromCatalogue: true })]}
        quoteId="q"
        updatedAt="t"
        canMutate={false}
      />,
    );
    expect(screen.getByText(/removed from catalogue/i)).toBeInTheDocument();
  });

  it('keeps a refused custom line to fix, and empties the form once one is added', async () => {
    const user = userEvent.setup();
    render(<QuoteLines lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
    const description = screen.getByLabelText('What to quote');
    const add = screen.getByRole('button', { name: 'Add' });

    vi.mocked(addCustomLine).mockResolvedValueOnce({ error: 'This quote changed while you were editing. Reload and try again.' });
    await user.type(description, 'Delivery to Kilimani');
    await user.click(add);
    await waitFor(() => expect(addCustomLine).toHaveBeenCalledTimes(1));
    await screen.findByRole('button', { name: 'Add' });
    expect(description).toHaveValue('Delivery to Kilimani');

    vi.mocked(addCustomLine).mockResolvedValueOnce({ ok: 'Item added to the quote.' });
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(description).toHaveValue(''));
    expect(vi.mocked(addCustomLine).mock.calls.at(-1)?.[1].get('description')).toBe('Delivery to Kilimani');
  });

  it('is axe clean in both treatments', async () => {
    const { container, rerender } = render(
      <QuoteLines lines={[line()]} quoteId="q" updatedAt="t" canMutate={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
    rerender(<QuoteLines lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
