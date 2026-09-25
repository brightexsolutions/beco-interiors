import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@/components/user-editor', () => ({
  UserEditor: ({ user }: { user: StaffUser }) => <p>Viewing {user.fullName}</p>,
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
  ...over,
});

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('UserResults', () => {
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
        viewerId="brightex-1"
      />,
    );
    expect(screen.getAllByRole('columnheader', { name: 'Actions' }).length).toBeGreaterThan(0);
    const sam = screen.getAllByRole('link', { name: /view sam odhiambo/i });
    expect(sam[0]).toHaveAttribute('href', '/users?user=11111111-1111-4111-8111-111111111111');
  });

  it('opens the detail sheet from the user query, not a quote-style card heading', () => {
    params = new URLSearchParams('user=11111111-1111-4111-8111-111111111111');
    render(
      <UserResults users={[user()]} viewing={user()} creating={false} viewerId="brightex-1" />,
    );
    expect(screen.getByRole('dialog', { name: 'Sam Odhiambo' })).toBeInTheDocument();
    expect(screen.getByText('Viewing Sam Odhiambo')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit sam/i })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <UserResults users={[user()]} viewing={null} creating={false} viewerId="brightex-1" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
