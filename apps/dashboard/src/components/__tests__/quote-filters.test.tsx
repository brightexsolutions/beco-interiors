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

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('QuoteFilters', () => {
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

  it('has no accessibility violations', async () => {
    const { container } = render(<QuoteFilters ownerOptions={ownerOptions} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
