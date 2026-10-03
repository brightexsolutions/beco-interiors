import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { bottomNavFor } from '@/lib/nav-items';

const mockPathname = vi.fn<() => string>(() => '/quotes');
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

const { BottomNav } = await import('../bottom-nav');

afterEach(() => mockPathname.mockReturnValue('/quotes'));

describe('BottomNav (D111)', () => {
  it('gives a salesperson Quotes, New quote and Orders, and no More', () => {
    render(<BottomNav nav={bottomNavFor('beco_sales')} name="Sam" />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/quotes', '/quotes/new', '/orders']);
    expect(within(nav).queryByRole('button', { name: 'More' })).toBeNull();
    expect(nav.className).toContain('fixed');
    expect(nav.className).toContain('lg:hidden');
  });

  it('marks the current section only, and stays on it for a nested path', () => {
    mockPathname.mockReturnValue('/quotes/BEC-Q-00042');
    render(<BottomNav nav={bottomNavFor('beco_sales')} name="Sam" />);
    expect(screen.getByRole('link', { name: /Quotes/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Orders' })).not.toHaveAttribute('aria-current');
  });

  it('carries the new-quote count on Quotes, in Warm Red', () => {
    render(<BottomNav nav={bottomNavFor('beco_sales')} newQuotes={3} name="Sam" />);
    const badge = screen.getByLabelText('3 new');
    expect(badge).toHaveTextContent('3');
    expect(badge.className).toContain('bg-warm-red');
  });

  it('puts an admin on Overview, Quotes, New quote, Orders and More, with the rest behind More', async () => {
    const user = userEvent.setup();
    render(<BottomNav nav={bottomNavFor('beco_admin')} name="Irene" />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/', '/quotes', '/quotes/new', '/orders']);
    await user.click(within(nav).getByRole('button', { name: 'More' }));
    const sheet = screen.getByRole('dialog', { name: 'More' });
    const hrefs = within(sheet).getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/products', '/announcements', '/reports', '/settings', '/change-password']));
    expect(hrefs).not.toContain('/users');
    expect(within(sheet).getByRole('button', { name: 'Sign out' }).closest('form')).toHaveAttribute('action', '/sign-out');
  });

  it('lights More when the current screen lives behind it', () => {
    mockPathname.mockReturnValue('/settings');
    render(<BottomNav nav={bottomNavFor('beco_admin')} name="Irene" />);
    expect(screen.getByRole('button', { name: 'More' }).className).toContain('text-charcoal');
  });

  it('gives the product manager Catalogue and Import, with no New quote', () => {
    mockPathname.mockReturnValue('/products');
    render(<BottomNav nav={bottomNavFor('beco_product_manager')} name="Aisha" />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/products', '/products/import']);
    expect(within(nav).queryByRole('link', { name: 'New quote' })).toBeNull();
  });

  it('draws nothing for a role with no screens', () => {
    const { container } = render(<BottomNav nav={bottomNavFor('beco_editor')} name="E" />);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('keeps every target at least 44px tall', () => {
    render(<BottomNav nav={bottomNavFor('beco_admin')} name="Irene" />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    for (const link of within(nav).getAllByRole('link')) {
      expect(link.className).toMatch(/min-h-14|h-12/);
    }
  });

  it('has no accessibility violations, closed and open', async () => {
    const user = userEvent.setup();
    const { container } = render(<BottomNav nav={bottomNavFor('beco_admin')} newQuotes={2} name="Irene" />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
