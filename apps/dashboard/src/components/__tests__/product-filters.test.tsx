import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/products',
  useSearchParams: () => params,
}));

const { ProductFilters } = await import('../product-filters');

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('ProductFilters', () => {
  it('carries a live status region for the reload, empty until a change is in flight (D117)', () => {
    render(<ProductFilters />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
  });

  it('writes availability into the URL, which is what the list reads', async () => {
    const user = userEvent.setup();
    render(<ProductFilters />);
    await user.selectOptions(screen.getByLabelText('Filter by availability'), 'out');
    expect(push).toHaveBeenCalledWith('/products?availability=out');
  });

  it('writes published and stock filters the same way, and clearing removes the param', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams('published=draft&stock=low');
    render(<ProductFilters />);
    await user.selectOptions(screen.getByLabelText('Filter by published'), 'published');
    expect(push).toHaveBeenCalledWith('/products?published=published&stock=low');
    await user.selectOptions(screen.getByLabelText('Filter by stock'), '');
    expect(push).toHaveBeenCalledWith('/products?published=draft');
  });

  it('puts search and the three filters on one row from xl', () => {
    const { container } = render(<ProductFilters />);
    expect(container.firstChild).toHaveClass('xl:flex-row', 'xl:items-center');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProductFilters />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
