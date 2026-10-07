import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { addCatalogueLines, addCustomLine, claimQuote, removeQuoteLine, updateQuoteLines } from '@/app/(app)/quotes/actions';
import { QuoteLines } from '../quote-lines';
import type { QuoteLine } from '@/lib/quote-detail';
import type { QuoteRequest } from '@/lib/quote-request';

vi.mock('@/app/(app)/quotes/actions', () => ({
  updateQuoteLines: vi.fn(async () => ({ ok: 'Items saved.' })),
  addCustomLine: vi.fn(async () => ({})),
  addCatalogueLines: vi.fn(async () => ({ ok: 'Items added to the quote.' })),
  claimQuote: vi.fn(async () => ({ ok: 'This quote is now yours.' })),
  removeQuoteLine: vi.fn(async () => ({ ok: 'Removed ZZ Seed Jatoba Brown. Total updated.' })),
}));

// The toast is what tells the user the removal landed (D117).
const actionToast = vi.fn();
vi.mock('@beco/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@beco/ui')>();
  return { ...actual, useActionToast: (state: { ok?: string; error?: string }) => actionToast(state) };
});

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
      <QuoteLines reference="BEC-Q-00012"
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
      <QuoteLines reference="BEC-Q-00012" lines={[line({ description: 'Soft close hinge', code: 'H-301' })]} quoteId="q" updatedAt="t" canMutate={false} />,
    );
    expect(screen.getByText('Code H-301')).toBeInTheDocument();
    rerender(<QuoteLines reference="BEC-Q-00012" lines={[line({ description: 'Soft close hinge', code: 'H-301' })]} quoteId="q" updatedAt="t" canMutate />);
    // Editable rows are narrow: the code alone on one line, "Code" for screen readers.
    const code = screen.getByTitle('Code H-301');
    expect(code).toHaveTextContent('Code H-301');
    expect(code.className).toContain('whitespace-nowrap');
    rerender(<QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
    expect(screen.queryByText(/^Code /)).toBeNull();
  });

  it('keeps Save disabled until a line actually changes, and says why', () => {
    render(<QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate />);
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('No changes to save.')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved')).toBeNull();
  });

  it('marks a changed row and enables one Save for every dirty line', async () => {
    const user = userEvent.setup();
    render(
      <QuoteLines reference="BEC-Q-00012"
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
    // Once on the catalogue add, once as the reason Remove is held (D131).
    expect(screen.getAllByText('Save your line changes first.')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateQuoteLines).toHaveBeenCalled());
    const form = vi.mocked(updateQuoteLines).mock.calls.at(-1)?.[1];
    expect(form).toBeInstanceOf(FormData);
    const items = JSON.parse(String((form as FormData).get('items')));
    expect(items).toEqual([{ lineId: line().id, quantity: 1.5, unitPrice: 65000 }]);
  });

  it('opens the catalogue dialog and adds every checked product in one write', async () => {
    const user = userEvent.setup();
    render(<QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="11111111-1111-4111-8111-111111111111" updatedAt="lock" canMutate />);
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

  it('pins item, qty, unit and line to one row once the list itself is wide, so they sit under the headers', () => {
    render(<QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
    const row = screen.getByText('Amber Jade').closest('[data-dirty]');
    expect(row).toBeTruthy();
    // A container query on the list, not a screen breakpoint: beside the
    // quote page's rail, md: gave the item column about 80px at 1280.
    expect(row?.className).toContain('@3xl:grid-cols-[minmax(0,1fr)_10rem_8.5rem_7.5rem]');
    expect(row?.className).not.toMatch(/(^|\s)md:/);
    expect(row?.innerHTML).not.toMatch(/(^|[\s"])md:/);
    expect(row?.closest('.\\@container')).not.toBeNull();
    expect(row?.innerHTML).toContain('@3xl:col-start-1 @3xl:row-start-1');
    expect(row?.innerHTML).toContain('@3xl:col-start-2 @3xl:row-start-1');
    expect(row?.innerHTML).toContain('@3xl:col-start-3 @3xl:row-start-1');
    expect(row?.innerHTML).toContain('@3xl:col-start-4 @3xl:row-start-1');
    // Remove sits under the line amount, not in a fifth column (D131): measured
    // at 1280, a fifth column left the item column no width at all.
    expect(row?.innerHTML).toContain('@3xl:col-start-4 @3xl:row-start-2');
    expect(row?.innerHTML).not.toContain('col-start-5');
    const header = screen.getByText('Item').closest('div');
    expect(header).toBeTruthy();
    // The header switches on the same container and the same columns as the rows.
    expect(header?.className).toContain('@3xl:grid');
    expect(header?.className).toContain('@3xl:grid-cols-[minmax(0,1fr)_10rem_8.5rem_7.5rem]');
    expect(header?.className).toContain('hidden');
    expect(header?.closest('.\\@container')).toBe(row?.closest('.\\@container'));
    expect(within(header as HTMLElement).getByText('Qty')).toBeInTheDocument();
    expect(within(header as HTMLElement).getByText('Unit')).toBeInTheDocument();
    expect(within(header as HTMLElement).getByText('Line')).toBeInTheDocument();
    expect(within(header as HTMLElement).queryByText('Update')).toBeNull();
  });

  it('labels a deleted catalogue line instead of crashing', () => {
    render(
      <QuoteLines reference="BEC-Q-00012"
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
    render(<QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
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
      <QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="q" updatedAt="t" canMutate={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
    rerender(<QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('Remove (D131)', () => {
    it('gives every line its own 44px Remove, named for the item', () => {
      render(<QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate />);
      const remove = screen.getByRole('button', { name: 'Remove Amber Jade' });
      expect(remove).toBeEnabled();
      expect(remove.className).toContain('h-11');
      expect(remove).toHaveAttribute('type', 'button');
      expect(screen.getByRole('button', { name: 'Remove ZZ Seed Jatoba Brown' })).toBeEnabled();
    });

    it('confirms through ConfirmDialog naming the item and the quote, then removes it under the lock', async () => {
      const user = userEvent.setup();
      vi.mocked(removeQuoteLine).mockClear();
      render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line(), jatoba]}
          quoteId="11111111-1111-4111-8111-111111111111"
          updatedAt="lock"
          canMutate
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Remove ZZ Seed Jatoba Brown' }));
      const dialog = screen.getByRole('alertdialog', { name: 'Remove ZZ Seed Jatoba Brown from BEC-Q-00012?' });
      expect(within(dialog).getByText(/quantity 3, comes off the quote/)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
      expect(removeQuoteLine).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: 'Remove item' }));
      await waitFor(() => expect(removeQuoteLine).toHaveBeenCalledTimes(1));
      const form = vi.mocked(removeQuoteLine).mock.calls[0]?.[1] as FormData;
      expect(form.get('lineId')).toBe(jatoba.id);
      expect(form.get('quoteId')).toBe('11111111-1111-4111-8111-111111111111');
      expect(form.get('updatedAt')).toBe('lock');
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(actionToast).toHaveBeenCalledWith({ ok: 'Removed ZZ Seed Jatoba Brown. Total updated.' });
    });

    it('shows a refusal as a toast and closes, rather than leaving the dialog spinning', async () => {
      const user = userEvent.setup();
      vi.mocked(removeQuoteLine).mockResolvedValueOnce({
        error: 'This quote changed while you were editing. Reload and try again.',
      });
      render(<QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="stale" canMutate />);
      await user.click(screen.getByRole('button', { name: 'Remove Amber Jade' }));
      await user.click(screen.getByRole('button', { name: 'Remove item' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(actionToast).toHaveBeenCalledWith({
        error: 'This quote changed while you were editing. Reload and try again.',
      });
    });

    it('Cancel removes nothing', async () => {
      const user = userEvent.setup();
      vi.mocked(removeQuoteLine).mockClear();
      render(<QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate />);
      await user.click(screen.getByRole('button', { name: 'Remove Amber Jade' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(removeQuoteLine).not.toHaveBeenCalled();
    });

    it('cannot remove the last line, and says so on screen', () => {
      render(<QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="q" updatedAt="t" canMutate />);
      const remove = screen.getByRole('button', { name: 'Remove Amber Jade' });
      expect(remove).toBeDisabled();
      const reason = screen.getByText('A quote needs at least one item. Mark it lost instead.');
      expect(remove).toHaveAttribute('aria-describedby', reason.id);
    });

    it('follows the quote state: won, lost and converted quotes say why nothing can come off', () => {
      const { rerender } = render(
        <QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate status="won" />,
      );
      const remove = screen.getByRole('button', { name: 'Remove Amber Jade' });
      expect(remove).toBeDisabled();
      expect(document.getElementById(remove.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
        'A won quote is closed. Its items are fixed.',
      );
      rerender(
        <QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate status="lost" />,
      );
      expect(screen.getAllByText('Reopen this quote to change its items.').length).toBeGreaterThan(0);
      rerender(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line(), jatoba]}
          quoteId="q"
          updatedAt="t"
          canMutate
          status="won"
          convertedOrderReference="BEC-O-00004"
        />,
      );
      expect(screen.getAllByText('This quote became order BEC-O-00004. Its items are fixed.').length).toBeGreaterThan(0);
    });

    it('asks for unsaved line changes to be saved first, so a removal cannot throw them away', async () => {
      const user = userEvent.setup();
      render(<QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate />);
      await user.click(screen.getByRole('button', { name: /increase quantity of amber jade/i }));
      expect(screen.getByRole('button', { name: 'Remove ZZ Seed Jatoba Brown' })).toBeDisabled();
      expect(screen.getAllByText('Save your line changes first.')).toHaveLength(2);
    });
  });

  describe('a closed quote (D132)', () => {
    const cases = [
      { label: 'won', status: 'won' as const, order: null, reason: 'A won quote is closed. Its items are fixed.' },
      { label: 'lost', status: 'lost' as const, order: null, reason: 'Reopen this quote to change its items.' },
      {
        label: 'converted',
        status: 'won' as const,
        order: 'BEC-O-00004',
        reason: 'This quote became order BEC-O-00004. Its items are fixed.',
      },
    ];

    it.each(cases)('on a $label quote, every line control is off and points at the one reason', async ({ status, order, reason }) => {
      const user = userEvent.setup();
      vi.mocked(updateQuoteLines).mockClear();
      render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line(), jatoba]}
          quoteId="q"
          updatedAt="t"
          canMutate
          status={status}
          convertedOrderReference={order}
        />,
      );
      // The reason line above the list, the one Remove already used.
      const remove = screen.getByRole('button', { name: 'Remove Amber Jade' });
      const reasonId = remove.getAttribute('aria-describedby');
      expect(reasonId).toBeTruthy();
      const reasonLine = document.getElementById(reasonId!);
      expect(reasonLine).toHaveTextContent(reason);
      expect(reasonLine).toBeVisible();

      const controls = [
        remove,
        screen.getByRole('button', { name: 'Increase quantity of Amber Jade' }),
        screen.getByRole('button', { name: 'Decrease quantity of ZZ Seed Jatoba Brown' }),
        screen.getByRole('button', { name: 'Increase quantity of ZZ Seed Jatoba Brown' }),
        document.getElementById(`price-${line().id}`)!,
        document.getElementById(`price-${jatoba.id}`)!,
        screen.getByRole('button', { name: 'Save' }),
        screen.getByLabelText('What to quote'),
        screen.getByLabelText('Qty'),
        screen.getByLabelText('Price'),
        screen.getByRole('button', { name: 'Add' }),
      ];
      for (const control of controls) {
        expect(control).toBeDisabled();
        expect(control).toHaveAttribute('aria-describedby', reasonId);
      }
      // The catalogue add is off too, with the reason under it and tied to it.
      const catalogue = screen.getByRole('button', { name: 'Add from catalogue' });
      expect(catalogue).toBeDisabled();
      expect(document.getElementById(catalogue.getAttribute('aria-describedby') ?? '')).toHaveTextContent(reason);
      expect(screen.getAllByText(reason)).toHaveLength(2);
      // No "No changes to save." beside a Save that can never be used.
      expect(screen.queryByText('No changes to save.')).toBeNull();

      // Clicking does nothing: nothing turns dirty, nothing is sent.
      await user.click(screen.getByRole('button', { name: 'Increase quantity of Amber Jade' }));
      expect(screen.queryByText('Unsaved')).toBeNull();
      expect(updateQuoteLines).not.toHaveBeenCalled();
    });

    it('an open quote keeps every control live, quoted included', () => {
      for (const status of ['new', 'reviewing', 'quoted'] as const) {
        const { unmount } = render(
          <QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate status={status} />,
        );
        expect(screen.getByRole('button', { name: 'Increase quantity of Amber Jade' })).toBeEnabled();
        expect(document.getElementById(`price-${line().id}`)).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Add from catalogue' })).toBeEnabled();
        expect(screen.getByLabelText('What to quote')).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Remove Amber Jade' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Increase quantity of Amber Jade' })).not.toHaveAttribute('aria-describedby');
        unmount();
      }
    });

    it('is axe clean on a won quote', async () => {
      const { container } = render(
        <QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate status="won" />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('an unpriced line', () => {
    // A web line arrives at 0, "not priced yet" (D86), carrying the catalogue
    // price it was asked for. That is not a discount and must not read as one.
    const web = line({ unitPrice: 0, lineTotal: 0, listPrice: 65000 });

    it('read-only, says not priced yet and shows the catalogue price plainly', () => {
      render(<QuoteLines reference="BEC-Q-00012" lines={[web]} quoteId="q" updatedAt="t" canMutate={false} />);
      expect(screen.getByText(/not priced yet/)).toBeInTheDocument();
      const catalogue = screen.getByText(/Catalogue .*65,000/);
      expect(catalogue.className).not.toContain('line-through');
      expect(catalogue.querySelector('.line-through')).toBeNull();
      expect(document.querySelector('.line-through')).toBeNull();
      expect(screen.getByText('POA')).toBeInTheDocument();
    });

    it('editable, says not priced yet beside the catalogue price, then strikes it only once a different price is typed', async () => {
      const user = userEvent.setup();
      render(<QuoteLines reference="BEC-Q-00012" lines={[web]} quoteId="q" updatedAt="t" canMutate />);
      expect(screen.getByText(/Not priced yet\. Catalogue .*65,000/)).toBeInTheDocument();
      expect(document.querySelector('.line-through')).toBeNull();
      const price = document.getElementById(`price-${web.id}`)!;
      await user.clear(price);
      await user.type(price, '60000');
      expect(screen.queryByText(/Not priced yet/)).toBeNull();
      expect(document.querySelector('.line-through')).toHaveTextContent(/65,000/);
    });

    it('with no catalogue price, it is price on application, with no reference', () => {
      render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line({ unitPrice: 0, lineTotal: 0, listPrice: null, productId: null })]}
          quoteId="q"
          updatedAt="t"
          canMutate={false}
        />,
      );
      expect(screen.getByText(/price on application/)).toBeInTheDocument();
      expect(screen.queryByText(/Catalogue/)).toBeNull();
    });
  });

  describe('who can change the items (D131)', () => {
    it('tells a salesperson on an unassigned web quote to claim it, with Claim right there', async () => {
      const user = userEvent.setup();
      render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line(), jatoba]}
          quoteId="11111111-1111-4111-8111-111111111111"
          updatedAt="lock"
          canMutate={false}
          canClaim
          status="new"
        />,
      );
      const reason = screen.getByText('Claim this quote to change its items.');
      const remove = screen.getByRole('button', { name: 'Remove Amber Jade' });
      expect(remove).toBeDisabled();
      expect(remove).toHaveAttribute('aria-describedby', reason.id);
      await user.click(screen.getByRole('button', { name: 'Claim quote' }));
      await waitFor(() => expect(claimQuote).toHaveBeenCalled());
      const form = vi.mocked(claimQuote).mock.calls.at(-1)?.[1] as FormData;
      expect(form.get('quoteId')).toBe('11111111-1111-4111-8111-111111111111');
      expect(form.get('updatedAt')).toBe('lock');
    });

    it('names the owner when the quote is a colleague\'s, with no Claim', () => {
      render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line(), jatoba]}
          quoteId="q"
          updatedAt="t"
          canMutate={false}
          assignedToName="Ken Mutiso"
        />,
      );
      expect(screen.getByText('Assigned to Ken Mutiso. Only they or an admin can change its items.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Claim quote' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Remove Amber Jade' })).toBeDisabled();
    });
  });

  describe("the customer's request (D131)", () => {
    const request: QuoteRequest = {
      source: 'submission',
      at: '2026-10-06T08:00:00+00:00',
      lines: [
        { id: line().id, description: 'Amber Jade', code: null, quantity: 2 },
        { id: jatoba.id, description: 'ZZ Seed Jatoba Brown', code: 'JB-3', quantity: 3 },
      ],
    };

    it('lists what was removed or changed since the customer asked', () => {
      render(<QuoteLines reference="BEC-Q-00012" lines={[line()]} quoteId="q" updatedAt="t" canMutate request={request} />);
      const note = screen.getByRole('region', { name: "Changed since the customer's request" });
      expect(within(note).getByText(/ZZ Seed Jatoba Brown \(JB-3\), 3 asked/)).toBeInTheDocument();
      expect(within(note).getByText(/Amber Jade, 2 asked, now/)).toBeInTheDocument();
    });

    it('draws nothing when the quote still matches the request', () => {
      render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line({ quantity: 2 }), jatoba]}
          quoteId="q"
          updatedAt="t"
          canMutate
          request={request}
        />,
      );
      expect(screen.queryByText(/Changed since/)).toBeNull();
    });

    it('dates a backfilled request instead of calling it the customer\'s own words', () => {
      render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line({ quantity: 2 })]}
          quoteId="q"
          updatedAt="t"
          canMutate
          request={{ ...request, source: 'backfill', at: '2026-10-07T06:00:00+00:00' }}
        />,
      );
      expect(screen.getByRole('region', { name: 'Changed since 7 Oct 2026' })).toBeInTheDocument();
      expect(screen.getByText('Earlier edits were not recorded.')).toBeInTheDocument();
    });

    it('is axe clean with the claim prompt, the note and the dialog open', async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(
        <QuoteLines
          reference="BEC-Q-00012"
          lines={[line()]}
          quoteId="q"
          updatedAt="t"
          canMutate={false}
          canClaim
          request={request}
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
      rerender(
        <QuoteLines reference="BEC-Q-00012" lines={[line(), jatoba]} quoteId="q" updatedAt="t" canMutate request={request} />,
      );
      await user.click(screen.getByRole('button', { name: 'Remove Amber Jade' }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
