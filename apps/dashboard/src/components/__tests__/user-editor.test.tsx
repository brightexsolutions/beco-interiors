import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { StaffUser } from '@/lib/users';

const setStaffRole = vi.fn(async () => ({ ok: 'Role updated.' }));
const setStaffActive = vi.fn(async () => ({
  ok: 'Account deactivated. Their sessions have ended. Quotes they raised stay attributed to them.',
}));
const resetStaffPassword = vi.fn(async () => ({ ok: 'Password reissued.', password: 'issued-secret-1' }));
const saveStaffPublicProfile = vi.fn(async () => ({ ok: 'Shown on /team.' }));
const uploadStaffPhoto = vi.fn(async () => ({ ok: 'Photograph uploaded.' }));
const removeStaffPhoto = vi.fn(async () => ({ ok: 'Photograph removed from /team.' }));
vi.mock('@/app/(app)/users/actions', () => ({
  setStaffRole: (...a: Parameters<typeof setStaffRole>) => setStaffRole(...a),
  setStaffActive: (...a: Parameters<typeof setStaffActive>) => setStaffActive(...a),
  resetStaffPassword: (...a: Parameters<typeof resetStaffPassword>) => resetStaffPassword(...a),
  saveStaffPublicProfile: (...a: Parameters<typeof saveStaffPublicProfile>) => saveStaffPublicProfile(...a),
  uploadStaffPhoto: (...a: Parameters<typeof uploadStaffPhoto>) => uploadStaffPhoto(...a),
  removeStaffPhoto: (...a: Parameters<typeof removeStaffPhoto>) => removeStaffPhoto(...a),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const { UserEditor } = await import('../user-editor');

const person: StaffUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'sam.odhiambo@beco.co.ke',
  fullName: 'Sam Odhiambo',
  role: 'beco_sales',
  isActive: true,
  isPublic: false,
  publicTitle: 'Showroom',
  publicPhone: '0722333730',
  publicPhoto: {
    path: 'team/22222222-2222-4222-8222-222222222222/ab12',
    alt: 'Sam Odhiambo at Beco Interiors',
    width: 1600,
    height: 2000,
  },
  mustChangePassword: false,
  lastLoginAt: null,
  createdAt: '2026-09-01T07:00:00.000Z',
  updatedAt: '2026-09-18T07:00:00.000Z',
};

describe('UserEditor', () => {
  it('names the person on deactivate and says quotes keep attribution', async () => {
    const user = userEvent.setup();
    render(<UserEditor user={person} viewerId="brightex-1" />);
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Deactivate Sam Odhiambo?');
    expect(within(dialog).getByText(/sessions will end/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/stay attributed/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    expect(setStaffActive).toHaveBeenCalled();
  });

  it('shows a Brightex account to a Beco holder with nothing to press (D135)', () => {
    render(
      <UserEditor
        user={{ ...person, role: 'brightex_admin' }}
        viewerId="irene-1"
        roles={['beco_admin', 'beco_sales', 'beco_product_manager', 'beco_editor']}
        canManage={false}
      />,
    );
    expect(screen.getByText('Brightex manages this account.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset password' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /photograph/i })).not.toBeInTheDocument();
  });

  it('offers a Beco holder only Beco roles on a Beco account (D135)', () => {
    render(
      <UserEditor
        user={person}
        viewerId="irene-1"
        roles={['beco_admin', 'beco_sales', 'beco_product_manager', 'beco_editor']}
      />,
    );
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).not.toContain('Brightex admin');
    expect(options).toContain('Beco admin');
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
  });

  it('hides role and session actions on your own row', () => {
    render(<UserEditor user={{ ...person, id: 'brightex-1' }} viewerId="brightex-1" />);
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/change role/i)).not.toBeInTheDocument();
    expect(screen.getByText(/cannot change your own role/i)).toBeInTheDocument();
  });

  it('uploads a photograph with a real file control and names the person on remove', async () => {
    const user = userEvent.setup();
    render(<UserEditor user={person} viewerId="brightex-1" />);
    expect(screen.getByLabelText(/photograph/i)).toHaveAttribute('type', 'file');
    expect(screen.getByRole('button', { name: 'Replace photograph' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Show on /team' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove photograph' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName("Remove Sam Odhiambo's photograph?");
    await user.click(within(dialog).getByRole('button', { name: 'Remove photograph' }));
    expect(removeStaffPhoto).toHaveBeenCalled();
  });

  it('does not offer Show on /team for a director', () => {
    render(<UserEditor user={{ ...person, role: 'beco_admin', publicPhoto: null }} viewerId="brightex-1" />);
    expect(screen.queryByRole('checkbox', { name: 'Show on /team' })).not.toBeInTheDocument();
    expect(screen.getByText(/this role stays off \/team/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<UserEditor user={person} viewerId="brightex-1" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
