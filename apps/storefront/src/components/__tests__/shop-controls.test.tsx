import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { ShopControls, type Facet, type FacetGroup } from '../shop-controls';

/**
 * Rewritten as a compact toolbar, reported directly: the previous bar gave
 * every control its own visible label above it, a shape built for a form
 * rather than a filter strip someone wants to clear in one glance on the way
 * to the grid. This file is new alongside that rewrite: the bar had never
 * had a component test of its own, verification until now was curling the
 * page with query strings.
 */
const replace = vi.fn();
let search = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => '/shop',
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
}));

const GROUPS: FacetGroup[] = [
  {
    value: 'sintered-stone', label: 'Sintered stone', count: 24,
    children: [{ value: '12mm-sintered-stones', label: '12mm sintered stones', count: 24 }],
  },
  { value: 'hardware', label: 'Hardware', count: 6, children: [] },
];
const FINISHES: Facet[] = [
  { value: 'Polished', label: 'Polished', count: 4 },
  { value: 'Matte', label: 'Matte', count: 2 },
];

beforeEach(() => {
  replace.mockClear();
  search = new URLSearchParams();
});

describe('ShopControls', () => {
  it('labels every control for assistive technology, even though the labels are visually hidden', () => {
    render(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={30} />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Range')).toBeInTheDocument();
    expect(screen.getByLabelText('Finish')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort')).toBeInTheDocument();
  });

  it('keeps every control at the 44px touch target floor, even though the bar around it shrank', () => {
    render(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={30} />);
    for (const control of [
      screen.getByLabelText('Search'), screen.getByLabelText('Range'),
      screen.getByLabelText('Finish'), screen.getByLabelText('Sort'),
    ]) {
      expect(control.className).toMatch(/(^|\s)h-11(\s|$)/);
    }
  });

  it('states the live count, so a filtered view says why it is showing fewer than the total', () => {
    render(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={6} />);
    expect(screen.getByText('6 of 30')).toBeInTheDocument();
  });

  it('hides the finish control entirely when there is nothing to distinguish', () => {
    render(<ShopControls groups={GROUPS} finishes={[]} total={30} showing={30} />);
    expect(screen.queryByLabelText('Finish')).toBeNull();
  });

  it('rewrites the URL, not the DOM directly, when a range is chosen, so the grid stays server rendered', async () => {
    const user = userEvent.setup();
    render(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={30} />);
    await user.selectOptions(screen.getByLabelText('Range'), 'group:hardware');
    expect(replace).toHaveBeenCalledWith('/shop?range=hardware', { scroll: false });
  });

  it('shows what is active as a removable chip once the URL carries a filter', () => {
    search = new URLSearchParams('range=hardware');
    render(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={6} />);
    expect(screen.getByRole('button', { name: /Hardware.*remove this filter/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('carries no chip row at all when nothing is filtered, so the bar costs nothing extra by default', () => {
    render(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={30} />);
    expect(screen.queryByText('Filtered by')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
  });

  it('clearing a chip rewrites the URL without that filter', async () => {
    const user = userEvent.setup();
    search = new URLSearchParams('range=hardware&finish=Polished');
    render(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={2} />);
    await user.click(screen.getByRole('button', { name: /Hardware.*remove this filter/ }));
    expect(replace).toHaveBeenCalledWith('/shop?finish=Polished', { scroll: false });
  });

  it('has no accessibility violations, filtered or not', async () => {
    const { container, rerender } = render(
      <ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={30} />,
    );
    expect(await axe(container)).toHaveNoViolations();

    search = new URLSearchParams('range=hardware');
    rerender(<ShopControls groups={GROUPS} finishes={FINISHES} total={30} showing={6} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
