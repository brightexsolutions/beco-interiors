import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { DashboardSettings, GrantStaffRow } from '@/lib/settings';

// Typed with the real action's two params (both ignored here) so
// mock.calls[n] is a real two element tuple, matching how the component
// actually calls it: saveDashboardSettings(prevState, formData).
const saveDashboardSettings = vi.fn(async (_prev: unknown, _form: FormData) => ({ ok: 'Settings saved.' }));
vi.mock('@/app/(app)/settings/actions', () => ({
  saveDashboardSettings: (...a: Parameters<typeof saveDashboardSettings>) => saveDashboardSettings(...a),
  setStaffGrant: vi.fn(),
}));

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/settings',
  useSearchParams: () => params,
}));

const { SettingsForm } = await import('../settings-form');

const settings: DashboardSettings = {
  businessLegalName: 'Beco Interiors Limited',
  kraPin: 'P051234567X',
  vatNumber: '',
  businessAddress: 'Urban Square, Enterprise Road, Nairobi',
  businessEmail: 'info@beco.co.ke',
  vatPercent: 16,
  quoteValidityDays: 30,
  quoteResponseSlaHours: 2,
  bankDetails: 'KCB Bank Kenya.',
  tillNumber: '',
  paybillNumber: '',
  paybillAccount: '',
  sendMoneyNumber: '',
  paymentTerms: 'Prices include VAT.',
  quoteFooter: 'Urban Square.',
  whatsappNumber: '254722333730',
  businessPhone: '+254 722 333 730',
  notificationRecipients: ['quotes@beco.co.ke'],
  brightexAllowedEmails: ['beco.brightex.dev@gmail.com'],
};

const sam: GrantStaffRow = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'sam.odhiambo@beco.co.ke',
  fullName: 'Sam Odhiambo',
  role: 'beco_sales',
  canWriteBlog: false,
  canReadAudit: false,
};

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
  saveDashboardSettings.mockClear();
});

describe('SettingsForm', () => {
  it('has a Business tab carrying the legal name and KRA PIN into the saved form', async () => {
    const user = userEvent.setup();
    render(<SettingsForm settings={settings} tab="quotes" canGrant={false} />);
    await user.click(screen.getByRole('tab', { name: 'Business' }));
    expect(screen.getByLabelText(/kra pin/i)).toHaveValue('P051234567X');
    expect(screen.getByLabelText(/registered business name/i)).toHaveValue('Beco Interiors Limited');
    expect(push).toHaveBeenCalledWith('/settings?tab=business');
  });

  it('submits Save settings from the title row without Anniversary launch for Beco admin', async () => {
    const user = userEvent.setup();
    const { container } = render(<SettingsForm settings={settings} tab="quotes" canGrant={false} />);
    const title = screen.getByRole('heading', { level: 1, name: 'Settings' });
    const row = title.parentElement;
    expect(row).toContainElement(screen.getByRole('button', { name: 'Save settings' }));
    expect(screen.queryByRole('link', { name: 'Anniversary launch' })).not.toBeInTheDocument();
    expect(row?.className).toContain('justify-between');
    expect(container.querySelector('#settings-save')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(saveDashboardSettings).toHaveBeenCalled();
  });

  it('puts Anniversary launch on the title row for Brightex', () => {
    render(
      <SettingsForm settings={settings} tab="quotes" canGrant staff={[sam]} viewerId="viewer" />,
    );
    const title = screen.getByRole('heading', { level: 1, name: 'Settings' });
    expect(title.parentElement).toContainElement(screen.getByRole('link', { name: 'Anniversary launch' }));
    expect(screen.getByRole('link', { name: 'Anniversary launch' })).toHaveAttribute('href', '/launch');
    expect(screen.getByRole('tab', { name: 'Studio' })).toBeInTheDocument();
  });

  it('switches tabs and writes the URL', async () => {
    const user = userEvent.setup();
    render(<SettingsForm settings={settings} tab="quotes" canGrant={false} />);
    expect(screen.getByRole('tab', { name: 'Quotes' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByLabelText(/VAT rate/)).toBeVisible();
    expect(screen.queryByRole('tab', { name: 'Permissions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Studio' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Payments' }));
    expect(push).toHaveBeenCalledWith('/settings?tab=payments');
    expect(screen.getByRole('tab', { name: 'Payments' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByLabelText('Bank details')).toBeVisible();
    expect(screen.getByLabelText('Paybill number')).toBeVisible();
    expect(screen.getByLabelText(/Send money/)).toBeVisible();
    expect(screen.getByLabelText(/VAT rate/).closest('[role="tabpanel"]')).toHaveAttribute(
      'data-state',
      'inactive',
    );
  });

  it('keeps every field in the save payload from another tab', async () => {
    const user = userEvent.setup();
    render(<SettingsForm settings={settings} tab="payments" canGrant={false} />);
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    const form = saveDashboardSettings.mock.calls[0]?.[1] as FormData;
    expect(form.get('vatPercent')).toBe('16');
    expect(form.get('bankDetails')).toBe('KCB Bank Kenya.');
  });

  it('shows Permissions only for Brightex', async () => {
    const user = userEvent.setup();
    render(
      <SettingsForm
        settings={settings}
        tab="permissions"
        canGrant
        staff={[sam]}
        viewerId="viewer"
      />,
    );
    expect(screen.getByRole('tab', { name: 'Permissions' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Sam Odhiambo')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Quotes' }));
    expect(push).toHaveBeenCalledWith('/settings');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SettingsForm settings={settings} tab="quotes" canGrant={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
