import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { StaffUser } from '@/lib/users';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/users',
  useSearchParams: () => params,
}));

const editorMounts = vi.fn();
vi.mock('@/components/user-editor', () => ({
  UserEditor: ({ user, canManage, viewOnly, canDelete }: { user: StaffUser; canManage?: boolean; viewOnly?: boolean; canDelete?: boolean }) => {
    useEffect(() => editorMounts(), []);
    return (
      <p data-can-manage={String(canManage ?? true)} data-view-only={String(Boolean(viewOnly))} data-can-delete={String(Boolean(canDelete))}>
        Viewing {user.fullName}
      </p>
    );
  },
}));
vi.mock('@/components/user-create', () => ({
  UserCreate: () => <p>Creating user</p>,
}));

const { UserResults } = await import('../user-results');

const user = (over: Partial<StaffUser> = {}): StaffUser => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'sam.odhiambo@beco.co.ke',
  fullName: 'Sam Odhiambo',
  role: 'beco_sales',
  isActive: true,
  isPublic: false,
  publicTitle: null,
  publicPhone: null,
  publicPhoto: null,
  mustChangePassword: false,
  lastLoginAt: '2026-09-18T07:00:00.000Z',
  createdAt: '2026-09-01T07:00:00.000Z',
  updatedAt: '2026-09-18T07:00:00.000Z',
  canReadAudit: false,
  canManageUsers: false,
  moduleGrants: [],
  ...over,
});

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('UserResults', () => {
  it('keeps the open user sheet mounted across an updatedAt change, every action in it bumps that (D117)', () => {
    editorMounts.mockClear();
    const { rerender } = render(<UserResults users={[user()]} viewing={user()} creating={false} viewerId="brightex-1" viewerRole="brightex_admin" />);
    const bumped = user({ updatedAt: '2026-10-04T12:00:00.000Z' });
    rerender(<UserResults users={[bumped]} viewing={bumped} creating={false} viewerId="brightex-1" viewerRole="brightex_admin" />);
    expect(editorMounts).toHaveBeenCalledTimes(1);
  });

  it('opens a Beco account read only, and never the create sheet, for a viewer on Users by grant alone (D136)', () => {
    const { unmount } = render(
      <UserResults users={[user()]} viewing={user()} creating={false} viewerId="irene-1" viewerRole="beco_admin" canWrite={false} />,
    );
    const sheet = screen.getByText('Viewing Sam Odhiambo');
    expect(sheet).toHaveAttribute('data-can-manage', 'false');
    expect(sheet).toHaveAttribute('data-view-only', 'true');
    unmount();
    render(<UserResults users={[user()]} viewing={null} creating viewerId="irene-1" viewerRole="beco_admin" canWrite={false} />);
    expect(screen.queryByText('Creating user')).not.toBeInTheDocument();
  });

  it('shuts the sheet the moment Close is pressed, while the navigation is still landing (D157)', async () => {
    // `user()` is the row fixture here, so the pointer gets another name.
    const press = userEvent.setup();
    push.mockReturnValue(new Promise(() => {}));
    params = new URLSearchParams('user=11111111-1111-4111-8111-111111111111');
    render(<UserResults users={[user()]} viewing={user()} creating={false} viewerId="brightex-1" viewerRole="brightex_admin" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await press.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith('/users');
  });

  it('lets Brightex delete and nobody else (D158)', () => {
    const { unmount } = render(
      <UserResults users={[user()]} viewing={user()} creating={false} viewerId="brightex-1" viewerRole="brightex_admin" />,
    );
    expect(screen.getByText('Viewing Sam Odhiambo')).toHaveAttribute('data-can-delete', 'true');
    unmount();
    render(<UserResults users={[user()]} viewing={user()} creating={false} viewerId="irene-1" viewerRole="beco_admin" />);
    expect(screen.getByText('Viewing Sam Odhiambo')).toHaveAttribute('data-can-delete', 'false');
  });

  it('gives every person an explicit View action, last column Actions', () => {
    render(
      <UserResults
        users={[
          user(),
          user({
            id: '22222222-2222-4222-8222-222222222222',
            fullName: 'Aisha Farah',
            email: 'aisha.farah@beco.co.ke',
            role: 'beco_product_manager',
          }),
        ]}
        viewing={null}
        creating={false}
        viewerId="brightex-1" viewerRole="brightex_admin"
      />,
    );
    expect(screen.getAllByRole('columnheader', { name: 'Actions' }).length).toBeGreaterThan(0);
    const sam = screen.getAllByRole('link', { name: /view sam odhiambo/i });
    expect(sam[0]).toHaveAttribute('href', '/users?user=11111111-1111-4111-8111-111111111111');
  });

  it('opens the detail sheet from the user query, not a quote-style card heading', () => {
    params = new URLSearchParams('user=11111111-1111-4111-8111-111111111111');
    render(
      <UserResults users={[user()]} viewing={user()} creating={false} viewerId="brightex-1" viewerRole="brightex_admin" />,
    );
    expect(screen.getByRole('dialog', { name: 'Sam Odhiambo' })).toBeInTheDocument();
    expect(screen.getByText('Viewing Sam Odhiambo')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit sam/i })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <UserResults users={[user()]} viewing={null} creating={false} viewerId="brightex-1" viewerRole="brightex_admin" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
