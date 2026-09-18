import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { GrantStaffRow } from '@/lib/settings';

const setStaffGrant = vi.fn(async () => ({ ok: 'Sam Odhiambo can write the blog.' }));
vi.mock('@/app/(app)/settings/actions', () => ({
  setStaffGrant: (...a: unknown[]) => setStaffGrant(...a),
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

  it('has no accessibility violations', async () => {
    const { container } = render(<SettingsGrants staff={[sam]} viewerId="viewer" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
