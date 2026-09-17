import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { listCatalogueRanges, searchCatalogue } from '@/lib/catalogue';
import { CataloguePicker, catalogueLineDraft } from '../catalogue-picker';
import type { CatalogueHit, CatalogueRange } from '@/lib/catalogue';

const amber: CatalogueHit = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Amber Jade',
  slug: 'amber-jade',
  price: 65000,
  unit: 'per slab',
  priceDisplayMode: 'fixed',
  categoryName: '12mm Sintered Stones',
};

const handle: CatalogueHit = {
  id: '33333333-3333-4333-8333-333333333333',
  name: '537 160 Black',
  slug: '537-160-black',
  price: 450,
  unit: 'each',
  priceDisplayMode: 'fixed',
  categoryName: 'Handles',
};

const ranges: CatalogueRange[] = [
  { id: 'light', name: 'Lighting', groupName: null, productCount: 0 },
  { id: 'stone', name: '12mm Sintered Stones', groupName: 'Sintered Stone', productCount: 24 },
  { id: 'handles', name: 'Handles', groupName: 'Hardware', productCount: 12 },
];

vi.mock('@/lib/catalogue', () => ({
  listCatalogueRanges: vi.fn(async () => ranges),
  searchCatalogue: vi.fn(async (term: string, rangeId?: string | null) => {
    const all = [amber, handle];
    const inRange = rangeId === 'handles' ? [handle] : rangeId === 'stone' ? [amber] : all;
    if (!term) return inRange;
    return inRange.filter((hit) => hit.name.toLowerCase().includes(term.toLowerCase()));
  }),
}));

describe('catalogueLineDraft', () => {
  it('starts a slab at half, everything else at one, and POA at zero', () => {
    expect(catalogueLineDraft(amber)).toEqual({ quantity: 0.5, unitPrice: 65000 });
    expect(catalogueLineDraft({ ...amber, unit: 'each', price: null })).toEqual({
      quantity: 1,
      unitPrice: 0,
    });
  });
});

describe('CataloguePicker', () => {
  it('opens a dialog of every range, stones and handles together', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add from catalogue' });
    expect(within(dialog).getByRole('searchbox', { name: /search/i })).toHaveFocus();
    expect(searchCatalogue).toHaveBeenCalledWith('', null);
    expect(listCatalogueRanges).toHaveBeenCalled();
    expect(await within(dialog).findByRole('checkbox', { name: /Amber Jade/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: /537 160 Black/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: '12mm Sintered Stones' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Handles' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Handles' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Lighting' })).toBeInTheDocument();
  });

  it('narrows to Handles when that range is chosen', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /range/i }), 'handles');
    await waitFor(() => expect(searchCatalogue).toHaveBeenCalledWith('', 'handles'));
    expect(await within(dialog).findByRole('checkbox', { name: /537 160 Black/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).queryByRole('checkbox', { name: /Amber Jade/i })).toBeNull();
    });
  });

  it('adds every checked product in one confirm, not one tap each', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={onAdd} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('checkbox', { name: /Amber Jade/i }));
    await user.click(within(dialog).getByRole('checkbox', { name: /537 160 Black/i }));
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 items' }));
    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({ id: amber.id, name: 'Amber Jade' }),
      expect.objectContaining({ id: handle.id, name: '537 160 Black' }),
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps Add disabled until something is checked', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Add 0 items' })).toBeDisabled();
    expect(within(dialog).getByText('Pick at least one.')).toBeInTheDocument();
  });

  it('filters the list as the search field is typed', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /537 160 Black/i });
    await user.type(within(dialog).getByRole('searchbox', { name: /search/i }), 'Amb');
    expect(await within(dialog).findByRole('checkbox', { name: /Amber Jade/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).queryByRole('checkbox', { name: /537 160 Black/i })).toBeNull();
    });
  });

  it('says why the trigger is disabled', () => {
    render(<CataloguePicker onAdd={vi.fn()} disabled disabledHint="Save your line changes first." />);
    expect(screen.getByRole('button', { name: 'Add from catalogue' })).toBeDisabled();
    expect(screen.getByText('Save your line changes first.')).toBeInTheDocument();
  });

  it('is axe clean while open', async () => {
    const user = userEvent.setup();
    const { container } = render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
