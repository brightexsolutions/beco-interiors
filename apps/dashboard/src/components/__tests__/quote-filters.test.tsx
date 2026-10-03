import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('QuoteFilters on a phone: chips', () => {
  it('filters status in one tap, and tapping the active chip clears it', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    const status = screen.getByRole('group', { name: 'Status' });
    await user.click(within(status).getByRole('button', { name: 'Quoted' }));
    expect(push).toHaveBeenLastCalledWith('/quotes?status=quoted');
  });

  it('clears status when the pressed chip is tapped again', async () => {
    params = new URLSearchParams('status=won');
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    const status = screen.getByRole('group', { name: 'Status' });
    expect(within(status).getByRole('button', { name: 'Won' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(status).getByRole('button', { name: 'Won' }));
    expect(push).toHaveBeenLastCalledWith('/quotes?');
  });

  it('switches owner and source from chips', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    await user.click(within(screen.getByRole('group', { name: 'Owner' })).getByRole('button', { name: 'Unassigned' }));
    expect(push).toHaveBeenLastCalledWith('/quotes?owner=unassigned');
    await user.click(within(screen.getByRole('group', { name: 'Source' })).getByRole('button', { name: 'Website' }));
    expect(push).toHaveBeenLastCalledWith('/quotes?source=web');
  });

  it('falls back to the first owner when the URL carries an empty owner', () => {
    params = new URLSearchParams('owner=');
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    expect(
      within(screen.getByRole('group', { name: 'Owner' })).getByRole('button', { name: 'Assigned to me' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('QuoteFilters', () => {
  it('offers Website as the source label, still filtering on the stored web value', async () => {
    const user = userEvent.setup();
    render(<QuoteFilters ownerOptions={ownerOptions} />);
    const source = screen.getByLabelText(/filter by source/i);
    expect(screen.getByRole('option', { name: 'Website' })).toHaveValue('web');
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
    expect(push).toHaveBeenCalledWith('/quotes?');
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
