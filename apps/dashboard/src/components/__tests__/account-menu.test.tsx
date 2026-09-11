import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

vi.mock('next/navigation', () => ({ usePathname: () => '/quotes' }));

const signOut = vi.fn();
vi.mock('@/app/actions', () => ({ signOut: (...a: unknown[]) => signOut(...a) }));

const { AccountMenu } = await import('../account-menu');

describe('AccountMenu', () => {
  it('is closed until the name is clicked', async () => {
    const user = userEvent.setup();
    render(<AccountMenu name="Irene Kariuki" />);
    expect(screen.queryByRole('menu')).toBeNull();

    await user.click(screen.getByRole('button', { name: /irene kariuki/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /irene kariuki/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('offers exactly change-password and sign-out', async () => {
    const user = userEvent.setup();
    render(<AccountMenu name="Irene Kariuki" />);
    await user.click(screen.getByRole('button', { name: /irene kariuki/i }));

    expect(screen.getByRole('menuitem', { name: /change password/i })).toHaveAttribute(
      'href',
      '/change-password',
    );
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toHaveAttribute('type', 'submit');
  });

  it('signs out through the server action, not a link', async () => {
    const user = userEvent.setup();
    render(<AccountMenu name="Irene Kariuki" />);
    await user.click(screen.getByRole('button', { name: /irene kariuki/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(signOut).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<AccountMenu name="Irene Kariuki" />);
    await user.click(screen.getByRole('button', { name: /irene kariuki/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('has no accessibility violations open or closed', async () => {
    const user = userEvent.setup();
    const { container } = render(<AccountMenu name="Irene Kariuki" />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: /irene kariuki/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
