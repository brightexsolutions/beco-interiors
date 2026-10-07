import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { GrantStaffRow } from '@/lib/settings';

const setStaffGrant = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Sam Odhiambo can write the blog.' }));
vi.mock('@/app/(app)/settings/actions', () => ({
  setStaffGrant: (...a: Parameters<typeof setStaffGrant>) => setStaffGrant(...a),
  saveDashboardSettings: vi.fn(),
}));

const { SettingsGrants } = await import('../settings-grants');

const sam: GrantStaffRow = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'sam.odhiambo@beco.co.ke',
  fullName: 'Sam Odhiambo',
  role: 'beco_sales',
  canWriteBlog: false,
  canReadAudit: false,
  canManageUsers: false,
};

describe('SettingsGrants', () => {
  it('names the person and confirms Allow audit', async () => {
    const user = userEvent.setup();
    render(
      <SettingsGrants
        staff={[sam, { ...sam, id: 'viewer', email: 'b@brightex.dev', fullName: 'Brightex' }]}
        viewerId="viewer"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Allow audit' }));
    expect(screen.getByRole('heading', { name: 'Allow audit access' })).toBeInTheDocument();
    expect(screen.getByText(/Sam Odhiambo will be able to read the audit log/)).toBeInTheDocument();
    const confirm = screen.getAllByRole('button', { name: 'Allow audit' }).at(-1)!;
    await user.click(confirm);
    expect(setStaffGrant).toHaveBeenCalled();
  });

  it('offers staff management to a Beco person, never to a Brightex account (D135)', async () => {
    const user = userEvent.setup();
    render(
      <SettingsGrants
        staff={[sam, { ...sam, id: 'bx2', email: 'bx2@brightex.dev', fullName: 'Other Brightex', role: 'brightex_admin' }]}
        viewerId="viewer"
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Allow staff' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Allow staff' }));
    expect(screen.getByRole('heading', { name: 'Allow staff management' })).toBeInTheDocument();
    expect(screen.getByText(/Sam Odhiambo will be able to add Beco staff/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Allow staff' }).at(-1)!);
    const form = setStaffGrant.mock.calls.at(-1)?.[1] as FormData;
    expect(form.get('grant')).toBe('can_manage_users');
    expect(form.get('enabled')).toBe('true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SettingsGrants staff={[sam]} viewerId="viewer" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
