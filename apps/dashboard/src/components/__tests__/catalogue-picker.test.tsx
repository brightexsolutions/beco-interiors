import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { loadPickerCatalogue } from '@/lib/catalogue';
import { CataloguePicker, catalogueLineDraft, rangeSelectGroups } from '../catalogue-picker';
import type { CatalogueHit, CatalogueRange, PickerCatalogue } from '@/lib/catalogue';

const amber: CatalogueHit = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Amber Jade',
  slug: 'amber-jade',
  price: 65000,
  unit: 'per slab',
  priceDisplayMode: 'fixed',
  categoryId: 'stone',
  categoryName: '12mm Sintered Stones',
  parentCategoryName: 'Sintered Stone',
  thumb: 'http://img.test/products/amber-jade/hero-400.webp',
};

const handle: CatalogueHit = {
  id: '33333333-3333-4333-8333-333333333333',
  name: '537 160 Black',
  slug: '537-160-black',
  price: 450,
  unit: 'each',
  priceDisplayMode: 'fixed',
  categoryId: 'handles',
  categoryName: 'Handles',
  parentCategoryName: 'Hardware',
  thumb: null,
};

const heixin: CatalogueHit = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Heixin Calacatta',
  slug: 'heixin-calacatta',
  price: 70000,
  unit: 'per slab',
  priceDisplayMode: 'fixed',
  categoryId: 'heixin',
  categoryName: 'Heixin 12mm',
  parentCategoryName: '12mm Sintered Stones',
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

vi.mock('@/lib/catalogue', () => ({ loadPickerCatalogue: vi.fn() }));

const load = vi.mocked(loadPickerCatalogue);

beforeEach(() => {
  load.mockReset();
  // Range name then product name, the order the server sends.
  load.mockResolvedValue({ products: [amber, handle, heixin], ranges });
});

/** Opens the picker and waits for the one load to land. */
async function openLoaded(onAdd = vi.fn()) {
  const user = userEvent.setup();
  const view = render(<CataloguePicker onAdd={onAdd} />);
  await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add from catalogue' });
  await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
  return { user, dialog, onAdd, container: view.container };
}

/** The product names listed, in the order shown. */
const listed = (dialog: HTMLElement) =>
  within(dialog)
    .queryAllByRole('checkbox')
    .map((box) => box.closest('label')!.querySelector('span.flex-1 > span')!.textContent);

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
  it('does not load anything until it is opened', () => {
    render(<CataloguePicker onAdd={vi.fn()} />);
    expect(load).not.toHaveBeenCalled();
  });

  it('opens a dialog of every range, stones and handles together, from one load', async () => {
    const { dialog } = await openLoaded();
    expect(within(dialog).getByRole('searchbox', { name: /search/i })).toHaveFocus();
    expect(load).toHaveBeenCalledTimes(1);
    expect(listed(dialog)).toEqual(['Amber Jade', '537 160 Black', 'Heixin Calacatta']);
    expect(within(dialog).getByRole('heading', { name: '12mm Sintered Stones' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Handles' })).toBeInTheDocument();
    const select = within(dialog).getByRole('combobox', { name: 'Range' });
    expect(select).toHaveValue('');
    expect(within(select).getByRole('option', { name: /Handles \(12\)/ })).toBeInTheDocument();
  });

  it('says it is loading the catalogue until the one load lands', async () => {
    let resolve!: (value: PickerCatalogue) => void;
    load.mockReturnValueOnce(new Promise<PickerCatalogue>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Loading the catalogue');
    expect(within(dialog).queryByText('No published product matches.')).toBeNull();
    expect(await axe(dialog)).toHaveNoViolations();
    await act(async () => resolve({ products: [amber, handle], ranges }));
    expect(within(dialog).queryByText('Loading the catalogue')).toBeNull();
    expect(listed(dialog)).toEqual(['Amber Jade', '537 160 Black']);
  });

  it('says the load failed, and loads again on Try again', async () => {
    load.mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Could not load the catalogue.');
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    expect(within(dialog).queryByText('No published product matches.')).toBeNull();
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(dialog).findByRole('checkbox', { name: /Amber Jade/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('drops a load that lands after the dialog was closed', async () => {
    let resolve!: (value: PickerCatalogue) => void;
    load.mockReturnValueOnce(new Promise<PickerCatalogue>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    load.mockReturnValueOnce(new Promise<PickerCatalogue>(() => {}));
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await act(async () => resolve({ products: [amber], ranges }));
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Loading the catalogue');
  });

  it('narrows to Handles in the same render, with no further load', async () => {
    const { dialog } = await openLoaded();
    // A synchronous change and an immediate read: no findBy, no waitFor, so
    // a list that needed a round trip would fail here.
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Range' }), {
      target: { value: 'handles' },
    });
    expect(listed(dialog)).toEqual(['537 160 Black']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('filters a range by its own products: the parent range does not pull in its sub range', async () => {
    const { user, dialog } = await openLoaded();
    const select = within(dialog).getByRole('combobox', { name: 'Range' });
    await user.selectOptions(select, 'stone');
    expect(listed(dialog)).toEqual(['Amber Jade']);
    await user.selectOptions(select, 'heixin');
    expect(listed(dialog)).toEqual(['Heixin Calacatta']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('offers only ranges with products, with their counts, nested ranges under their parent', async () => {
    const { dialog } = await openLoaded();
    const select = within(dialog).getByRole('combobox', { name: 'Range' });
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual([
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

  it('filters in the same render as each keystroke, with no further load', async () => {
    const { dialog } = await openLoaded();
    fireEvent.change(within(dialog).getByRole('searchbox', { name: /search/i }), {
      target: { value: 'amb' },
    });
    expect(listed(dialog)).toEqual(['Amber Jade']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('matches a range name or its parent range name, in any case, when no range is chosen', async () => {
    const { user, dialog } = await openLoaded();
    const search = within(dialog).getByRole('searchbox', { name: /search/i });
    await user.type(search, 'HARDWARE');
    expect(listed(dialog)).toEqual(['537 160 Black']);
    await user.clear(search);
    await user.type(search, 'sintered');
    expect(listed(dialog)).toEqual(['Amber Jade', 'Heixin Calacatta']);
  });

  it('combines search and range, and either can be cleared', async () => {
    const { user, dialog } = await openLoaded();
    const select = within(dialog).getByRole('combobox', { name: 'Range' });
    const search = within(dialog).getByRole('searchbox', { name: /search/i });
    await user.type(search, 'a');
    expect(listed(dialog)).toHaveLength(3);
    await user.selectOptions(select, 'stone');
    expect(listed(dialog)).toEqual(['Amber Jade']);
    await user.clear(search);
    await user.type(search, 'black');
    expect(listed(dialog)).toEqual([]);
    expect(within(dialog).getByText('No published product matches.')).toBeInTheDocument();
    await user.selectOptions(select, '');
    expect(listed(dialog)).toEqual(['537 160 Black']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('says a chosen range has nothing published when it is empty', async () => {
    load.mockResolvedValueOnce({ products: [amber], ranges });
    const user = userEvent.setup();
    render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /Amber Jade/i });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Range' }), 'handles');
    expect(within(dialog).getByText('No published products in Handles yet.')).toBeInTheDocument();
  });

  it('adds a product picked inside a filtered range', async () => {
    const { user, dialog, onAdd } = await openLoaded();
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Range' }), 'handles');
    expect(within(dialog).queryByRole('checkbox', { name: /Amber Jade/i })).toBeNull();
    await user.click(within(dialog).getByRole('checkbox', { name: /537 160 Black/i }));
    expect(within(dialog).getByText('1 selected')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Add 1 item' }));
    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ id: handle.id })]);
  });

  it('keeps a tick across a range change, so a quote can mix ranges', async () => {
    const { user, dialog, onAdd } = await openLoaded();
    await user.click(within(dialog).getByRole('checkbox', { name: /Amber Jade/i }));
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Range' }), 'handles');
    await user.click(within(dialog).getByRole('checkbox', { name: /537 160 Black/i }));
    expect(within(dialog).getByText('2 selected')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 items' }));
    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({ id: amber.id }),
      expect.objectContaining({ id: handle.id }),
    ]);
  });

  it('loads afresh each time it is opened, and starts unfiltered', async () => {
    const { user, dialog } = await openLoaded();
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Range' }), 'handles');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    const again = await screen.findByRole('dialog');
    await within(again).findByRole('checkbox', { name: /Amber Jade/i });
    expect(within(again).getByRole('combobox', { name: 'Range' })).toHaveValue('');
    expect(listed(again)).toHaveLength(3);
    expect(load).toHaveBeenCalledTimes(2);
  });

  // jsdom cannot measure, so the layout that keeps the list reachable is held
  // by its classes: the controls and the footer never shrink, the list is the
  // one flexible, scrolling region between them.
  it('keeps the list the only scrolling region, between fixed controls and a fixed footer', async () => {
    const { dialog } = await openLoaded();
    const list = within(dialog).getAllByRole('list')[0]!;
    expect(list).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    const controls = within(dialog).getByRole('searchbox').closest('.grid')!;
    expect(controls).toHaveClass('shrink-0');
    expect(within(dialog).getByRole('button', { name: /^Add \d+ items?$/ }).parentElement).toHaveClass('shrink-0');
    expect(list.parentElement).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
  });

  it('shows the product photograph where there is one, a plain tile where there is not', async () => {
    const { dialog } = await openLoaded();
    expect(dialog.querySelector('img[src="http://img.test/products/amber-jade/hero-400.webp"]')).not.toBeNull();
    expect(dialog.querySelectorAll('img')).toHaveLength(1);
  });

  it('adds every checked product in one confirm, not one tap each', async () => {
    const { user, dialog, onAdd } = await openLoaded();
    await user.click(within(dialog).getByRole('checkbox', { name: /Amber Jade/i }));
    await user.click(within(dialog).getByRole('checkbox', { name: /537 160 Black/i }));
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 items' }));
    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({ id: amber.id, name: 'Amber Jade' }),
      expect.objectContaining({ id: handle.id, name: '537 160 Black' }),
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps Add disabled until something is checked', async () => {
    const { dialog } = await openLoaded();
    expect(within(dialog).getByRole('button', { name: 'Add 0 items' })).toBeDisabled();
    expect(within(dialog).getByText('Pick at least one.')).toBeInTheDocument();
  });

  it('says why the trigger is disabled', () => {
    render(<CataloguePicker onAdd={vi.fn()} disabled disabledHint="Save your line changes first." />);
    const trigger = screen.getByRole('button', { name: 'Add from catalogue' });
    expect(trigger).toBeDisabled();
    const hint = screen.getByText('Save your line changes first.');
    // The reason is tied to the control, so a screen reader hears it too.
    expect(trigger).toHaveAttribute('aria-describedby', hint.id);
  });

  it('carries no describedby while enabled', () => {
    render(<CataloguePicker onAdd={vi.fn()} disabledHint="Save your line changes first." />);
    expect(screen.getByRole('button', { name: 'Add from catalogue' })).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText('Save your line changes first.')).toBeNull();
  });

  it('is axe clean while open', async () => {
    const { container } = await openLoaded();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is axe clean in the error state', async () => {
    load.mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();
    const { container } = render(<CataloguePicker onAdd={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add from catalogue' }));
    await screen.findByRole('alert');
    expect(await axe(container)).toHaveNoViolations();
  });
});
