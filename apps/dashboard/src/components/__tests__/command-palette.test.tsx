import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { GuideTopic } from '@/lib/guide';
import type { NavItem } from '@/lib/nav-items';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));

const { CommandPalette, paletteCommands } = await import('../command-palette');

const items: NavItem[] = [
  { href: '/quotes', label: 'Quotes' },
  { href: '/orders', label: 'Orders' },
  { href: '/products', label: 'Catalogue' },
  { href: '/customers', label: 'Customers' },
  { href: '/settings', label: 'Settings' },
];

const topics: GuideTopic[] = [
  { id: 'quotes-new', path: '/quotes/new', title: 'Raise a quote', purpose: 'Price a list of materials at the counter.', steps: [] },
  { id: 'products', path: '/products', title: 'Keep the catalogue right', purpose: 'Photos, prices and sizes.', steps: [] },
];

describe('paletteCommands', () => {
  it('leads with New quote and every section when nothing is typed', () => {
    const out = paletteCommands('', items, topics, true);
    expect(out[0]).toMatchObject({ id: 'new-quote', href: '/quotes/new', kind: 'action' });
    expect(out.filter((c) => c.kind === 'section').map((c) => c.label)).toEqual([
      'Quotes',
      'Orders',
      'Catalogue',
      'Customers',
      'Settings',
    ]);
    expect(out.some((c) => c.kind === 'search')).toBe(false);
  });

  it('withholds New quote from a reader who cannot raise one', () => {
    expect(paletteCommands('', items, topics, false).some((c) => c.id === 'new-quote')).toBe(false);
  });

  it('narrows the sections to the typed word and offers to search the lists for it', () => {
    const out = paletteCommands('mara', items, topics, true);
    expect(out.some((c) => c.kind === 'section')).toBe(false);
    const searches = out.filter((c) => c.kind === 'search');
    expect(searches.map((c) => c.href)).toEqual([
      '/quotes?search=mara',
      '/orders?search=mara',
      '/customers?search=mara',
      '/products?search=mara',
    ]);
    expect(searches[0]?.label).toBe('Search quotes for "mara"');
  });

  it('only offers to search a list the reader can reach', () => {
    const out = paletteCommands('tile', [{ href: '/products', label: 'Catalogue' }], topics, false);
    expect(out.filter((c) => c.kind === 'search').map((c) => c.href)).toEqual(['/products?search=tile']);
  });

  it('finds guide topics by title or purpose', () => {
    const out = paletteCommands('sizes', items, topics, true);
    expect(out.find((c) => c.kind === 'guide')).toMatchObject({ id: 'guide-products', label: 'Keep the catalogue right' });
  });

  it('encodes what was typed into the search destination', () => {
    const out = paletteCommands('Irene & Co', items, topics, false);
    expect(out.find((c) => c.href.startsWith('/customers'))?.href).toBe('/customers?search=Irene%20%26%20Co');
  });
});

describe('CommandPalette', () => {
  beforeEach(() => push.mockClear());

  it('opens from the search button and from command K, and closes on the second press', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} topics={topics} canRaiseQuotes />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Search, command K' }));
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search sections, lists and the guide' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
  });

  it('takes the highlighted row on Enter, and the arrows move the highlight', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} topics={topics} canRaiseQuotes />);
    await user.click(screen.getByRole('button', { name: 'Search, command K' }));
    const input = screen.getByRole('combobox', { name: 'Search sections, lists and the guide' });
    const list = screen.getByRole('listbox', { name: 'Results' });
    expect(within(list).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(within(list).getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}');
    expect(within(list).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/quotes');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('navigates to the clicked search row with the words typed', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} topics={topics} canRaiseQuotes={false} />);
    await user.click(screen.getByRole('button', { name: 'Search, command K' }));
    await user.type(screen.getByRole('combobox', { name: 'Search sections, lists and the guide' }), 'mara');
    await user.click(screen.getByRole('option', { name: /Search customers for "mara"/ }));
    expect(push).toHaveBeenCalledWith('/customers?search=mara');
  });

  it('hands a guide row to the guide instead of the router', async () => {
    const user = userEvent.setup();
    const onOpenGuide = vi.fn();
    render(<CommandPalette items={items} topics={topics} canRaiseQuotes={false} onOpenGuide={onOpenGuide} />);
    await user.click(screen.getByRole('button', { name: 'Search, command K' }));
    await user.type(screen.getByRole('combobox', { name: 'Search sections, lists and the guide' }), 'sizes');
    await user.click(screen.getByRole('option', { name: /Keep the catalogue right/ }));
    expect(onOpenGuide).toHaveBeenCalledWith('products');
    expect(push).not.toHaveBeenCalled();
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={[]} topics={[]} canRaiseQuotes={false} />);
    await user.click(screen.getByRole('button', { name: 'Search, command K' }));
    await user.type(screen.getByRole('combobox', { name: 'Search sections, lists and the guide' }), 'zzz');
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });

  it('has no accessibility violations open', async () => {
    const user = userEvent.setup();
    const { container } = render(<CommandPalette items={items} topics={topics} canRaiseQuotes />);
    await user.click(screen.getByRole('button', { name: 'Search, command K' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
