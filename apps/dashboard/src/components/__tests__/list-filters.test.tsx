import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

let resolveNavigation: () => void = () => {};
const push = vi.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveNavigation = resolve;
    }),
);
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/things',
  useSearchParams: () => params,
}));

const { ListFilters } = await import('../list-filters');

const owner = {
  param: 'owner',
  label: 'Owner',
  fallback: 'all',
  options: [
    { value: 'all', label: 'Everyone' },
    { value: 'mine', label: 'Assigned to me' },
  ],
};
const status = {
  param: 'status',
  label: 'Status',
  options: [
    { value: '', label: 'Any' },
    { value: 'new', label: 'New' },
    { value: 'won', label: 'Won' },
  ],
};
const source = {
  param: 'source',
  label: 'Source',
  options: [
    { value: '', label: 'Any' },
    { value: 'web', label: 'Website' },
  ],
};
const payment = {
  param: 'payment',
  label: 'Payment',
  options: [
    { value: '', label: 'Any' },
    { value: 'paid', label: 'Paid' },
  ],
};

/** The caption and value a filter draws, in order. */
const shown = (name: string) =>
  [...screen.getByLabelText(name).closest('label')!.querySelectorAll(':scope > span')].map((span) => span.textContent);

const grid = () => document.querySelector('[data-filter-grid]') as HTMLElement;

beforeEach(() => {
  push.mockClear();
  params = new URLSearchParams();
});

describe('ListFilters', () => {
  it('renders each filter as a select carrying the URL value, its caption and that value drawn inside it', () => {
    params = new URLSearchParams('status=won&owner=mine');
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner, status, source]} />);
    expect(screen.getByLabelText('Filter by owner')).toHaveValue('mine');
    expect(screen.getByLabelText('Filter by status')).toHaveValue('won');
    expect(screen.getByLabelText('Filter by source')).toHaveValue('');
    expect(shown('Filter by owner')).toEqual(['Owner', 'Assigned to me']);
    expect(shown('Filter by status')).toEqual(['Status', 'Won']);
    expect(shown('Filter by source')).toEqual(['Source', 'Any']);
  });

  it('shows the fallback when the param is absent or empty', () => {
    params = new URLSearchParams('owner=');
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner]} />);
    expect(screen.getByLabelText('Filter by owner')).toHaveValue('all');
    expect(shown('Filter by owner')).toEqual(['Owner', 'Everyone']);
  });

  it('writes the chosen value to its param, keeps the others and drops page', async () => {
    params = new URLSearchParams('owner=mine&page=3');
    const user = userEvent.setup();
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner, status]} />);
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'new');
    expect(push).toHaveBeenLastCalledWith('/things?owner=mine&status=new');
    await act(async () => resolveNavigation());
  });

  it('removes the param when the empty option is chosen, rather than writing an empty value', async () => {
    params = new URLSearchParams('status=won');
    const user = userEvent.setup();
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[status]} />);
    await user.selectOptions(screen.getByLabelText('Filter by status'), '');
    expect(push).toHaveBeenLastCalledWith('/things');
    await act(async () => resolveNavigation());
  });

  it('debounces the search into its param', async () => {
    const user = userEvent.setup();
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[status]} />);
    await user.type(screen.getByLabelText('Search things'), 'Amani');
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/things?search=Amani'), { timeout: 1000 });
    await act(async () => resolveNavigation());
  });

  it('lays three filters two across with the count in the fourth cell, and four filters two by two', () => {
    const { unmount } = render(
      <ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner, status, source]} count="8 things" />,
    );
    expect(grid()).toHaveClass('grid-cols-2');
    expect(grid().children).toHaveLength(4);
    expect(within(grid().children[3] as HTMLElement).getByText('8 things')).toBeInTheDocument();
    unmount();

    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner, status, source, payment]} />);
    expect(grid()).toHaveClass('grid-cols-2', 'md:grid-cols-4');
  });

  it('puts search, filters and count on one row from xl, with no pills at any width', () => {
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner, status, source]} count="8 things" />);
    expect(screen.getByRole('search')).toHaveClass('flex-col', 'xl:flex-row');
    expect(grid()).toHaveClass('xl:flex');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('group')).toHaveLength(0);
  });

  it('every filter control is the 44px touch target', () => {
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner, status]} />);
    for (const name of ['Filter by owner', 'Filter by status']) {
      expect(screen.getByLabelText(name).closest('label')).toHaveClass('h-11');
    }
    expect(screen.getByLabelText('Search things')).toHaveClass('h-11');
  });

  it('swaps the count for Updating while the navigation is in flight, keeping the count for a screen reader', async () => {
    const user = userEvent.setup();
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[status]} count="8 things" />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByText('8 things')).not.toHaveClass('sr-only');

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'new');
    expect(screen.getByRole('status')).toHaveTextContent('Updating');
    expect(screen.getByText('8 things')).toHaveClass('sr-only');

    await act(async () => resolveNavigation());
    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
    expect(screen.getByText('8 things')).not.toHaveClass('sr-only');
  });

  it('shows the new choice in its control at once, then settles to whatever the URL says', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[status]} />);
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'new');
    // Still pending: the URL has not changed, the control already says New.
    expect(screen.getByLabelText('Filter by status')).toHaveValue('new');
    expect(shown('Filter by status')).toEqual(['Status', 'New']);

    params = new URLSearchParams('status=new');
    rerender(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[status]} />);
    await act(async () => resolveNavigation());
    expect(screen.getByLabelText('Filter by status')).toHaveValue('new');
  });

  it('falls back to the URL value when the navigation lands without changing it', async () => {
    const user = userEvent.setup();
    render(<ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[status]} />);
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'won');
    expect(screen.getByLabelText('Filter by status')).toHaveValue('won');
    await act(async () => resolveNavigation());
    await waitFor(() => expect(screen.getByLabelText('Filter by status')).toHaveValue(''));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ListFilters searchLabel="Search things" searchPlaceholder="Name" filters={[owner, status, source]} count="8 things" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
