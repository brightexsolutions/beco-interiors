import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { Facet, RangeChip } from '@/lib/shop';
import { RangeToolbar } from '../range-toolbar';

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => '/shop/sintered-stone',
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
}));

const CHIPS: RangeChip[] = [
  { href: '/shop/sintered-stone', label: 'All', count: 24, active: true },
  { href: '/shop/12mm-sintered-stones', label: '12mm', count: 16, active: false },
  { href: '/shop/15mm-sintered-stones', label: '15mm', count: 8, active: false },
];
const FINISHES: Facet[] = [
  { value: 'Polished', label: 'Polished', count: 14 },
  { value: 'Matt', label: 'Matt', count: 10 },
];

beforeEach(() => {
  replace.mockClear();
  search = new URLSearchParams();
});

describe('RangeToolbar', () => {
  it('renders the range chips as real links, with the open level marked current', () => {
    render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={24} />);
    const nav = screen.getByRole('navigation', { name: 'Ranges' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/shop/sintered-stone', '/shop/12mm-sintered-stones', '/shop/15mm-sintered-stones']);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).not.toHaveAttribute('aria-current');
    expect(links[1]).toHaveTextContent('12mm16');
  });

  it('toggles a finish on and off as a query parameter on the same page, scroll held', async () => {
    const user = userEvent.setup();
    render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={24} />);
    await user.click(screen.getByRole('button', { name: /Polished/ }));
    expect(replace).toHaveBeenLastCalledWith('/shop/sintered-stone?finish=Polished', { scroll: false });
    search = new URLSearchParams('finish=Polished');
    render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={14} />);
    const pressed = screen.getAllByRole('button', { name: /Polished/ }).at(-1)!;
    expect(pressed).toHaveAttribute('aria-pressed', 'true');
    await user.click(pressed);
    expect(replace).toHaveBeenLastCalledWith('/shop/sintered-stone', { scroll: false });
  });

  it('writes the sort, dropping the default so the canonical URL stays bare', async () => {
    const user = userEvent.setup();
    render(<RangeToolbar chips={CHIPS} finishes={[]} total={24} showing={24} />);
    await user.selectOptions(screen.getByLabelText('Sort'), 'price-desc');
    expect(replace).toHaveBeenLastCalledWith('/shop/sintered-stone?sort=price-desc', { scroll: false });
    await user.selectOptions(screen.getByLabelText('Sort'), 'name');
    expect(replace).toHaveBeenLastCalledWith('/shop/sintered-stone', { scroll: false });
  });

  it('debounces the search into ?q=', async () => {
    const user = userEvent.setup();
    render(<RangeToolbar chips={CHIPS} finishes={[]} total={24} showing={24} />);
    await user.type(screen.getByLabelText('Search'), 'calacatta');
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/shop/sintered-stone?q=calacatta', { scroll: false }));
  });

  it('hides the finish group when there is only one finish, and the chip row when there is nothing beneath', () => {
    render(<RangeToolbar chips={[CHIPS[0]!]} finishes={[FINISHES[0]!]} total={3} showing={3} />);
    expect(screen.queryByRole('navigation', { name: 'Ranges' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Finish' })).toBeNull();
  });

  it('states the count, and offers Clear only once something is set', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={24} />);
    expect(screen.getByText('24 of 24')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    unmount();
    search = new URLSearchParams('finish=Matt&sort=price-asc');
    render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={10} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(replace).toHaveBeenLastCalledWith('/shop/sintered-stone', { scroll: false });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={24} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('folds the desktop search to an icon that opens and focuses the field', async () => {
    const user = userEvent.setup();
    render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={24} />);
    const open = screen.getByRole('button', { name: 'Open search' });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    await user.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');
    await vi.waitFor(() => expect(screen.getByLabelText('Search')).toHaveFocus());
  });

  it('keeps the search open while it holds a query', () => {
    search = new URLSearchParams('q=calacatta');
    render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={2} />);
    expect(screen.getByRole('button', { name: 'Open search' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Search')).toHaveValue('calacatta');
  });

  it('turns more than three finishes into one select that writes the finish parameter', async () => {
    const user = userEvent.setup();
    const many: Facet[] = ['3D Digital', 'Polished', 'Soft Matte', 'Bush Hammered', 'Matte'].map((v, i) => ({ value: v, label: v, count: i + 1 }));
    render(<RangeToolbar chips={CHIPS} finishes={many} total={24} showing={24} />);
    expect(screen.queryByRole('group', { name: 'Finish' })).toBeNull();
    await user.selectOptions(screen.getByLabelText('Finish'), 'Bush Hammered');
    expect(replace).toHaveBeenLastCalledWith('/shop/sintered-stone?finish=Bush+Hammered', { scroll: false });
    await user.selectOptions(screen.getByLabelText('Finish'), '');
    expect(replace).toHaveBeenLastCalledWith('/shop/sintered-stone', { scroll: false });
  });

  it('never lets a chip or finish label wrap onto two lines', () => {
    render(<RangeToolbar chips={CHIPS} finishes={FINISHES} total={24} showing={24} />);
    for (const link of within(screen.getByRole('navigation', { name: 'Ranges' })).getAllByRole('link')) {
      expect(link).toHaveClass('whitespace-nowrap');
    }
    expect(screen.getByRole('button', { name: /Polished/ })).toHaveClass('whitespace-nowrap');
  });
});
