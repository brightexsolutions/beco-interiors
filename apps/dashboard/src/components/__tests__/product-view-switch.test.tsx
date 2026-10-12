import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => params,
}));

const { ProductViewSwitch, parseCatalogueView } = await import('../product-view-switch');

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams('search=handle&page=3');
});

describe('parseCatalogueView', () => {
  it('reads cards, and anything else as the list', () => {
    expect(parseCatalogueView('cards')).toBe('cards');
    expect(parseCatalogueView('list')).toBe('list');
    expect(parseCatalogueView(undefined)).toBe('list');
    expect(parseCatalogueView('grid')).toBe('list');
  });
});

describe('ProductViewSwitch', () => {
  it('marks the current view and writes the other one to the URL, keeping the search and dropping the page', async () => {
    const user = userEvent.setup();
    render(<ProductViewSwitch view="list" />);
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Cards' }));
    expect(push).toHaveBeenCalledWith('/products?search=handle&view=cards');
  });

  it('removes the param when the list is chosen again, so the default is a clean URL', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams('view=cards');
    render(<ProductViewSwitch view="cards" />);
    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(push).toHaveBeenCalledWith('/products');
  });

  it('does nothing when the current view is pressed', async () => {
    const user = userEvent.setup();
    render(<ProductViewSwitch view="list" />);
    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(push).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProductViewSwitch view="list" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
