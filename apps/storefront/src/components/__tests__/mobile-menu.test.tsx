import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenu } from '../mobile-menu';

/**
 * Until this existed the nav was `hidden md:block`, so on a phone there was no
 * way to reach Shop, Projects, About or Contact at all, and the only route
 * home was knowing the logo is a link. Mobile is most of the traffic here.
 */
vi.mock('next/navigation', () => ({ usePathname: () => '/shop' }));

beforeEach(() => { document.body.style.overflow = ''; });

describe('MobileMenu', () => {
  it('is closed to begin with', () => {
    render(<MobileMenu />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open the menu' })).toBeInTheDocument();
  });

  it('lists Home explicitly, not only as the logo', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: 'Open the menu' }));
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
  });

  it('reaches every top level destination', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: 'Open the menu' }));
    for (const href of ['/', '/shop', '/gallery', '/about', '/contact']) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it('marks the current page, so you know where you are', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: 'Open the menu' }));
    expect(screen.getByRole('link', { name: /shop/i })).toHaveAttribute('aria-current', 'page');
  });

  it('escape closes it and gives focus back to the trigger', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    const trigger = screen.getByRole('button', { name: 'Open the menu' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open the menu' })).toHaveFocus();
  });

  it('stops the page behind it scrolling while open, and restores it after', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: 'Open the menu' }));
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('carries the business line, because a phone is a phone', async () => {
    const user = userEvent.setup();
    render(<MobileMenu />);
    await user.click(screen.getByRole('button', { name: 'Open the menu' }));
    expect(document.querySelector('a[href^="tel:"]')).not.toBeNull();
  });
});
