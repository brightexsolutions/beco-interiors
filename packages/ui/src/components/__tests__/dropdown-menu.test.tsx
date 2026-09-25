import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';

function Menu({
  open = true,
  onOpenChange = vi.fn(),
  onPick = vi.fn(),
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPick?: () => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger>Account</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Irene Kariuki</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onPick}>Change password</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/sign-out">Sign out</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('is closed until the trigger asks to open', () => {
    const onOpenChange = vi.fn();
    render(<Menu open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Account' }), {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('choosing an item performs that item, not a no-op', () => {
    const onPick = vi.fn();
    render(<Menu onPick={onPick} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Change password' }));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('asChild keeps a real link, so Sign out is never a fake href', () => {
    render(<Menu />);
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveAttribute(
      'href',
      '/sign-out',
    );
  });

  it('Escape asks the menu to close', () => {
    const onOpenChange = vi.fn();
    render(<Menu onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('the open menu is named by its trigger', () => {
    render(<Menu />);
    expect(screen.getByRole('menu')).toHaveAccessibleName('Account');
  });

  it('rows meet the 44px floor, and the panel is Beco not default shadcn', () => {
    render(<Menu />);
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('rounded-panel');
    expect(menu.className).not.toContain('shadow');
    expect(menu.className).not.toContain('animate-in');
    expect(screen.getByRole('menuitem', { name: 'Change password' }).className).toContain(
      'min-h-11',
    );
  });

  it('has no accessibility violations when closed', async () => {
    cleanup();
    const { container } = render(<Menu open={false} />);
    expect(await axe(container)).toHaveNoViolations();
  }, 15_000);
});
