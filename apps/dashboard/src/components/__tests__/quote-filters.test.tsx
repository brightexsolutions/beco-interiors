import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/quotes',
  useSearchParams: () => params,
}));

const { QuoteFilters } = await import('../quote-filters');

const ownerOptions = [
  { value: 'mine' as const, label: 'Assigned to me' },
  { value: 'preparing' as const, label: "I'm preparing" },
  { value: 'unassigned' as const, label: 'Unassigned' },
];

/** What a filter control draws for a sighted reader: its caption, then its value. */
const shown = (select: HTMLElement) =>
  [...select.closest('label')!.querySelectorAll(':scope > span')].map((span) => span.textContent);

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('QuoteFilters on a phone and tablet: captioned selects, no wrapping pills', () => {
  it('is one select per filter, each showing its caption and current value, and no chip groups', () => {
    params = new URLSearchParams('status=won');
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    expect(screen.queryAllByRole('group')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    const status = screen.getByLabelText('Filter by status');
    expect(status).toHaveValue('won');
    expect(shown(status)).toEqual(['Status', 'Won']);
    expect(shown(screen.getByLabelText('Filter by owner'))).toEqual(['Owner', 'Assigned to me']);
    expect(shown(screen.getByLabelText('Filter by source'))).toEqual(['Source', 'Any']);
  });

  it('lays owner and status side by side, source then the count beside it, three across from md', () => {
    render(<QuoteFilters ownerOptions={ownerOptions} count="8 quotes" />);
    const grid = screen.getByLabelText('Filter by status').closest('[data-filter-grid]') as HTMLElement;
    expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-[repeat(3,minmax(0,1fr))_auto]', 'xl:flex');
    const cells = [...grid.children].map((cell) => {
      const select = cell.querySelector('select');
      return select ? shown(select).join(': ') : cell.textContent;
    });
    expect(cells).toEqual(['Owner: Assigned to me', 'Status: Any', 'Source: Any', '8 quotes']);
  });

  it('filters status from the select, and choosing Any clears it, as the chips did', async () => {
    params = new URLSearchParams('status=won');
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText('Filter by status'), '');
    expect(push).toHaveBeenLastCalledWith('/quotes');
  });

  it('switches owner and source, writing the same params', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText('Filter by owner'), 'unassigned');
    expect(push).toHaveBeenLastCalledWith('/quotes?owner=unassigned');
    await user.selectOptions(screen.getByLabelText('Filter by source'), 'web');
    expect(push).toHaveBeenLastCalledWith('/quotes?source=web');
  });

  it('falls back to the first owner when the URL carries an empty owner', () => {
    params = new URLSearchParams('owner=');
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    expect(screen.getByLabelText('Filter by owner')).toHaveValue('mine');
    expect(shown(screen.getByLabelText('Filter by owner'))).toEqual(['Owner', 'Assigned to me']);
  });
});

describe('QuoteFilters', () => {
  it('offers Website as the source label, still filtering on the stored web value', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    // One select at every width now; the phone no longer carries a duplicate.
    expect(screen.getAllByRole('option', { name: 'Website' })).toHaveLength(1);
    const source = screen.getByLabelText('Filter by source');
    for (const option of screen.getAllByRole('option', { name: 'Website' })) expect(option).toHaveValue('web');
    expect(screen.queryByRole('option', { name: 'Web' })).toBeNull();
    await user.selectOptions(source, 'web');
    expect(push).toHaveBeenCalledWith('/quotes?source=web');
  });

  it('changing status pushes it into the URL, so the result set actually changes', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'quoted');
    expect(push).toHaveBeenCalledWith('/quotes?status=quoted');
  });

  it('changing owner pushes it into the URL', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText(/filter by owner/i), 'unassigned');
    expect(push).toHaveBeenCalledWith('/quotes?owner=unassigned');
  });

  it('clearing a filter back to "any" removes it from the URL rather than setting an empty value', async () => {
    params = new URLSearchParams('status=quoted');
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText(/filter by status/i), '');
    expect(push).toHaveBeenCalledWith('/quotes');
  });

  it('hides the owner control when the caller offers only one option', () => {
    render(<QuoteFilters ownerOptions={[{ value: 'all', label: 'Everyone' }]} />);
    expect(screen.queryByLabelText(/filter by owner/i)).toBeNull();
  });

  it('debounces the search field rather than pushing on every keystroke', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.type(screen.getByLabelText(/search quotes/i), 'Wanjiku');
    // Not on every keystroke: nothing pushed the instant typing finishes.
    expect(push).not.toHaveBeenCalled();
    // But it does land, once the debounce settles.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/quotes?search=Wanjiku'), { timeout: 1000 });
  });

  it('changing a filter drops page so the new result set starts at the first page', async () => {
    params = new URLSearchParams('page=2');
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'quoted');
    expect(push).toHaveBeenCalledWith('/quotes?status=quoted');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<QuoteFilters ownerOptions={ownerOptions} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
