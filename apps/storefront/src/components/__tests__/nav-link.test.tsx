import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { NavLink } from '../nav-link';

const mockPathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

describe('NavLink', () => {
  it('renders as a plain link when it is not the current page', () => {
    mockPathname.mockReturnValue('/gallery');
    render(<NavLink href="/shop">Shop</NavLink>);
    const link = screen.getByRole('link', { name: 'Shop' });
    const classes = link.className.split(' ');
    expect(link).not.toHaveAttribute('aria-current');
    // Not the exact active token. It DOES carry hover:text-warm-red-deep,
    // which contains the same substring, so this checks the token list
    // rather than the raw string.
    expect(classes).not.toContain('text-warm-red-deep');
    expect(classes).toContain('hover:text-warm-red-deep');
  });

  it('carries the active colour and aria-current on its own page', () => {
    mockPathname.mockReturnValue('/shop');
    render(<NavLink href="/shop">Shop</NavLink>);
    const link = screen.getByRole('link', { name: 'Shop' });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link.className.split(' ')).toContain('text-warm-red-deep');
  });

  it('stays active on a subpage, so opening a category does not go dark', () => {
    mockPathname.mockReturnValue('/shop/handles');
    render(<NavLink href="/shop">Shop</NavLink>);
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('aria-current', 'page');
  });

  it('has no accessibility violations either way', async () => {
    mockPathname.mockReturnValue('/shop');
    const { container } = render(<NavLink href="/shop">Shop</NavLink>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
