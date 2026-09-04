import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SiteHeader } from '../site-header';

/**
 * Until this test existed the desktop nav had no current page indication at
 * all: every link was `text-neutral-700` whatever page you were on. See the
 * `NavLink` and `NavDropdown` active prop this exercises.
 */
const mockPathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

const desktopLink = (name: string | RegExp) =>
  screen.getAllByRole('link', { name }).find((el) => !el.closest('[role="dialog"]'))!;

describe('SiteHeader desktop nav active state', () => {
  it('lights nothing on the home page, which is not itself a nav item', () => {
    mockPathname.mockReturnValue('/');
    render(<SiteHeader />);
    for (const name of ['Shop', 'Projects', 'Blog', 'Contact']) {
      expect(desktopLink(name)).not.toHaveAttribute('aria-current');
    }
    expect(screen.getByRole('button', { name: /about/i })).not.toHaveAttribute('aria-current');
  });

  it('lights Shop on /shop, and only Shop', () => {
    mockPathname.mockReturnValue('/shop');
    render(<SiteHeader />);
    expect(desktopLink('Shop')).toHaveAttribute('aria-current', 'page');
    expect(desktopLink('Projects')).not.toHaveAttribute('aria-current');
    expect(desktopLink('Contact')).not.toHaveAttribute('aria-current');
  });

  it('keeps Shop lit on a category page, not About, even though About links into Sintered stone', () => {
    mockPathname.mockReturnValue('/shop/12mm-sintered-stones');
    render(<SiteHeader />);
    expect(desktopLink('Shop')).toHaveAttribute('aria-current', 'page');
    const about = screen.getByRole('button', { name: /about/i });
    expect(about.className.split(' ')).not.toContain('text-warm-red-deep');
  });

  it('lights Contact on /contact, not About, even though About links into The showroom', () => {
    mockPathname.mockReturnValue('/contact');
    render(<SiteHeader />);
    expect(desktopLink('Contact')).toHaveAttribute('aria-current', 'page');
    const about = screen.getByRole('button', { name: /about/i });
    expect(about.className.split(' ')).not.toContain('text-warm-red-deep');
  });

  it('lights the About trigger on its own page', () => {
    mockPathname.mockReturnValue('/about');
    render(<SiteHeader />);
    const about = screen.getByRole('button', { name: /about/i });
    expect(about.className.split(' ')).toContain('text-warm-red-deep');
    expect(desktopLink('Shop')).not.toHaveAttribute('aria-current');
    expect(desktopLink('Contact')).not.toHaveAttribute('aria-current');
  });

  it('lights Projects on /gallery', () => {
    mockPathname.mockReturnValue('/gallery');
    render(<SiteHeader />);
    expect(desktopLink('Projects')).toHaveAttribute('aria-current', 'page');
  });

  it('lights Blog on a post page, not just the index', () => {
    mockPathname.mockReturnValue('/blog/sintered-stone-buying-guide');
    render(<SiteHeader />);
    expect(desktopLink('Blog')).toHaveAttribute('aria-current', 'page');
    expect(desktopLink('Shop')).not.toHaveAttribute('aria-current');
  });

  it('has no accessibility violations', async () => {
    mockPathname.mockReturnValue('/shop');
    const { container } = render(<SiteHeader />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
