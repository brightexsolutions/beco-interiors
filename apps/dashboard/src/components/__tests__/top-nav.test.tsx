import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

const mockPathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

const { TopNav } = await import('../top-nav');

const items = [
  { href: '/quotes', label: 'Quotes' },
  { href: '/orders', label: 'Orders' },
  { href: '/settings', label: 'Settings' },
];

describe('TopNav', () => {
  it('marks the current section, and only that one', () => {
    mockPathname.mockReturnValue('/quotes');
    render(<TopNav items={items} />);
    expect(screen.getByRole('link', { name: /quotes/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Orders' })).not.toHaveAttribute('aria-current');
  });

  it('stays on the section for a nested path', () => {
    mockPathname.mockReturnValue('/quotes/BEC-Q-00042');
    render(<TopNav items={items} />);
    expect(screen.getByRole('link', { name: /quotes/i })).toHaveAttribute('aria-current', 'page');
  });

  it('does not activate a section that merely shares a stem', () => {
    mockPathname.mockReturnValue('/settings-export');
    render(<TopNav items={items} />);
    expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current');
  });

  it('shows the new-quote count on Quotes when it is positive', () => {
    mockPathname.mockReturnValue('/orders');
    render(<TopNav items={items} newQuotes={3} />);
    const badge = screen.getByLabelText('3 awaiting response');
    expect(badge).toHaveTextContent('3');
  });

  it('renders no count at zero', () => {
    mockPathname.mockReturnValue('/orders');
    render(<TopNav items={items} newQuotes={0} />);
    expect(screen.queryByLabelText(/awaiting response/i)).toBeNull();
  });

  it('has no accessibility violations', async () => {
    mockPathname.mockReturnValue('/quotes');
    const { container } = render(<TopNav items={items} newQuotes={2} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
