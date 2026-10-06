import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { listCatalogueRanges, searchCatalogue } from '@/lib/catalogue';
import { CataloguePicker, catalogueLineDraft, rangeSelectGroups } from '../catalogue-picker';
import type { CatalogueHit, CatalogueRange } from '@/lib/catalogue';

const amber: CatalogueHit = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Amber Jade',
  slug: 'amber-jade',
  price: 65000,
  unit: 'per slab',
  priceDisplayMode: 'fixed',
  categoryName: '12mm Sintered Stones',
  thumb: 'http://img.test/products/amber-jade/hero-400.webp',
};

const handle: CatalogueHit = {
  id: '33333333-3333-4333-8333-333333333333',
  name: '537 160 Black',
  slug: '537-160-black',
  price: 450,
  unit: 'each',
  priceDisplayMode: 'fixed',
  categoryName: 'Handles',
  thumb: null,
};

const ranges: CatalogueRange[] = [
  { id: 'light', name: 'Lighting', groupName: null, productCount: 0 },
  { id: 'stone', name: '12mm Sintered Stones', groupName: 'Sintered Stone', productCount: 24 },
  { id: 'heixin', name: 'Heixin 12mm', groupName: '12mm Sintered Stones', productCount: 7 },
  { id: 'spc', name: 'SPC Flooring', groupName: 'Flooring', productCount: 0 },
  { id: 'handles', name: 'Handles', groupName: 'Hardware', productCount: 12 },
  { id: 'knobs', name: 'Knobs', groupName: 'Hardware', productCount: 3 },
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

describe('rangeSelectGroups', () => {
  it('drops empty ranges and groups consecutive siblings under their parent', () => {
    expect(rangeSelectGroups(ranges)).toEqual([
      { label: 'Sintered Stone', ranges: [ranges[1]] },
      { label: '12mm Sintered Stones', ranges: [ranges[2]] },
      { label: 'Hardware', ranges: [ranges[4], ranges[5]] },
    ]);
  });

  it('keeps a top level range ungrouped, and returns nothing for no stock', () => {
    const top: CatalogueRange = { id: 'tiles', name: 'Tiles', groupName: null, productCount: 2 };
    expect(rangeSelectGroups([top])).toEqual([{ label: null, ranges: [top] }]);
    expect(rangeSelectGroups([{ ...top, productCount: 0 }])).toEqual([]);
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
    const select = within(dialog).getByRole('combobox', { name: 'Range' });
    expect(select).toHaveValue('');
    expect(within(select).getByRole('option', { name: /Handles \(12\)/ })).toBeInTheDocument();
  });

  it('narrows to Handles when that range is chosen in the select', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
    const select = within(dialog).getByRole('combobox', { name: 'Range' });
    await user.selectOptions(select, 'handles');
    expect(select).toHaveValue('handles');
    await waitFor(() => expect(searchCatalogue).toHaveBeenLastCalledWith('', 'handles'));
    expect(await within(dialog).findByRole('checkbox', { name: /537 160 Black/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).queryByRole('checkbox', { name: /Amber Jade/i })).toBeNull();
    });
  });

  it('offers only ranges with products, with their counts, nested ranges under their parent', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
    const select = within(dialog).getByRole('combobox', { name: 'Range' });
    const names = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toEqual([
      'All ranges',
      '12mm Sintered Stones (24)',
      'Heixin 12mm (7)',
      'Handles (12)',
      'Knobs (3)',
    ]);
    expect(within(select).queryByRole('option', { name: /Lighting/ })).toBeNull();
    expect(within(select).queryByRole('option', { name: /SPC Flooring/ })).toBeNull();
    const groups = Array.from(select.querySelectorAll('optgroup')).map((group) => [
      group.label,
      Array.from(group.querySelectorAll('option')).map((option) => option.value),
    ]);
    expect(groups).toEqual([
      ['Sintered Stone', ['stone']],
      ['12mm Sintered Stones', ['heixin']],
      ['Hardware', ['handles', 'knobs']],
    ]);
  });

  it('combines search and range: both reach the search, and either can be cleared', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Range' }), 'stone');
    await user.type(within(dialog).getByRole('searchbox', { name: /search/i }), 'Amb');
    await waitFor(() => expect(searchCatalogue).toHaveBeenLastCalledWith('Amb', 'stone'));
    expect(await within(dialog).findByRole('checkbox', { name: /Amber Jade/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox', { name: /537 160 Black/i })).toBeNull();
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Range' }), '');
    await waitFor(() => expect(searchCatalogue).toHaveBeenLastCalledWith('Amb', null));
  });

  it('adds a product picked inside a filtered range', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={onAdd} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Range' }), 'handles');
    await waitFor(() => {
      expect(within(dialog).queryByRole('checkbox', { name: /Amber Jade/i })).toBeNull();
    });
    await user.click(within(dialog).getByRole('checkbox', { name: /537 160 Black/i }));
    expect(within(dialog).getByText('1 selected')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Add 1 item' }));
    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ id: handle.id })]);
  });

  // jsdom cannot measure, so the layout that keeps the list reachable is held
  // by its classes: the controls and the footer never shrink, the list is the
  // one flexible, scrolling region between them.
  it('keeps the list the only scrolling region, between fixed controls and a fixed footer', async () => {
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
    const list = within(dialog).getAllByRole('list')[0]!;
    expect(list).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    const controls = within(dialog).getByRole('searchbox').closest('.grid')!;
    expect(controls).toHaveClass('shrink-0');
    expect(within(dialog).getByRole('button', { name: /^Add \d+ items?$/ }).parentElement).toHaveClass('shrink-0');
    expect(list.parentElement).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
  });

  it('shows the product photograph where there is one, a plain tile where there is not', async () => {
    const user = userEvent.setup();
    const { container } = render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    await screen.findByRole('checkbox', { name: /Amber Jade/i });
    expect(document.querySelector('img[src="http://img.test/products/amber-jade/hero-400.webp"]')).not.toBeNull();
    expect(container.ownerDocument.querySelectorAll('[role="dialog"] img')).toHaveLength(1);
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
