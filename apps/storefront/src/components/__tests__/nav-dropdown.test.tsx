import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { NavDropdown } from '../nav-dropdown';

const ITEMS = [
  { href: '/about', label: 'About Beco', description: 'Who we are' },
  { href: '/shop/12mm-sintered-stones', label: 'Sintered stone', description: 'The material' },
  { href: '/contact', label: 'The showroom', description: 'Where to find us' },
];

describe('NavDropdown', () => {
  it('is closed to begin with, and every destination exists', () => {
    render(<NavDropdown label="About" items={ITEMS} />);
    expect(screen.queryByRole('menu')).toBeNull();
    const trigger = screen.getByRole('button', { name: /about/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on click and lists every item as a real link', async () => {
    const user = userEvent.setup();
    render(<NavDropdown label="About" items={ITEMS} />);
    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    for (const item of ITEMS) {
      expect(screen.getByRole('menuitem', { name: new RegExp(item.label, 'i') })).toHaveAttribute(
        'href',
        item.href,
      );
    }
  });

  it('escape closes it and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<NavDropdown label="About" items={ITEMS} />);
    const trigger = screen.getByRole('button', { name: /about/i });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('opening it then clicking it, the same motion a mouse makes, still leaves it open', async () => {
    // Regression: mouseenter opened the menu, and the click finishing the
    // same approach immediately toggled it closed again, so a mouse user who
    // actually clicked the trigger, not only ever hovered, could never open
    // it. userEvent.click already fires the hover sequence first, matching
    // a real pointer, so this is the same path `click` exercises elsewhere;
    // stated explicitly once so the fix has its own regression coverage.
    const user = userEvent.setup();
    render(<NavDropdown label="About" items={ITEMS} />);
    const trigger = screen.getByRole('button', { name: /about/i });
    await user.hover(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('a second, real click still closes it', async () => {
    const user = userEvent.setup();
    render(<NavDropdown label="About" items={ITEMS} />);
    const trigger = screen.getByRole('button', { name: /about/i });
    await user.hover(trigger);
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('is not active by default', () => {
    render(<NavDropdown label="About" items={ITEMS} />);
    expect(screen.getByRole('button', { name: /about/i }).className.split(' ')).not.toContain(
      'text-warm-red-deep',
    );
  });

  it('carries the active colour when the caller says the trigger owns the current page', () => {
    render(<NavDropdown label="About" items={ITEMS} active />);
    expect(screen.getByRole('button', { name: /about/i }).className.split(' ')).toContain(
      'text-warm-red-deep',
    );
  });

  it('has no accessibility violations open or closed', async () => {
    const user = userEvent.setup();
    const { container } = render(<NavDropdown label="About" items={ITEMS} />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches to light chrome over the hero, per D79', () => {
    render(<NavDropdown label="About" items={ITEMS} light />);
    const classes = screen.getByRole('button', { name: /about/i }).className.split(' ');
    expect(classes).toContain('text-neutral-200');
    expect(classes).not.toContain('text-neutral-700');
  });
});
