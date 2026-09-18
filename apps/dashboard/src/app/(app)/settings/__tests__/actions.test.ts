import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'irene.kariuki@beco.co.ke',
  fullName: 'Irene Kariuki',
  role: 'beco_admin' as const,
  isActive: true,
  mustChangePassword: false,
  canWriteBlog: false,
  canReadAudit: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...a) }));

const maybeSingle = vi.fn();
const update = vi.fn();
const insert = vi.fn();
const from = vi.fn(() => ({
  update: (payload: unknown) => {
    update(payload);
    return { eq: () => ({ select: () => ({ maybeSingle }) }) };
  },
  insert: (payload: unknown) => {
    insert(payload);
    return payload;
  },
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

const revalidateStorefrontPaths = vi.fn();
vi.mock('@/lib/storefront-revalidate', () => ({
  revalidateStorefrontPaths: (...a: unknown[]) => revalidateStorefrontPaths(...a),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { saveDashboardSettings, setStaffGrant } = await import('../actions');

afterEach(() => {
  requirePath.mockClear();
  maybeSingle.mockReset();
  update.mockReset();
  insert.mockReset();
  revalidateStorefrontPaths.mockReset();
});

const formFrom = () => {
  const form = new FormData();
  form.set('vatPercent', '16');
  form.set('quoteValidityDays', '30');
  form.set('quoteResponseSlaHours', '2');
  form.set('bankDetails', 'KCB Bank Kenya.');
  form.set('tillNumber', '');
  form.set('paybillNumber', '247247');
  form.set('paybillAccount', 'Quote number');
  form.set('sendMoneyNumber', '');
  form.set('paymentTerms', 'Prices include VAT.');
  form.set('quoteFooter', 'Urban Square.');
  form.set('whatsappNumber', '254722333730');
  form.set('businessPhone', '+254 722 333 730');
  form.set('notificationRecipients', 'quotes@beco.co.ke');
  form.set('brightexAllowedEmails', 'beco.brightex.dev@gmail.com');
  return form;
};

describe('saveDashboardSettings', () => {
  it('re-checks the session, stores VAT as a fraction, and busts the storefront', async () => {
    maybeSingle.mockResolvedValue({ data: { key: 'vat_rate' }, error: null });
    const result = await saveDashboardSettings({}, formFrom());
    expect(requirePath).toHaveBeenCalledWith('/settings');
    expect(result.ok).toBe('Settings saved.');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 0.16,
        updated_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    );
    expect(revalidateStorefrontPaths).toHaveBeenCalledWith(['/'], '/settings');
  });
});

describe('setStaffGrant', () => {
  it('refuses a Beco admin', async () => {
    const form = new FormData();
    form.set('userId', '11111111-1111-4111-8111-111111111111');
    form.set('grant', 'can_read_audit');
    form.set('enabled', 'true');
    const result = await setStaffGrant({}, form);
    expect(result.error).toMatch(/Only Brightex/);
    expect(update).not.toHaveBeenCalled();
  });

  it('writes the grant for Brightex', async () => {
    requirePath.mockResolvedValueOnce({
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'beco.brightex.dev@gmail.com',
      fullName: 'Brightex Ops',
      role: 'brightex_admin',
      isActive: true,
      mustChangePassword: false,
      canWriteBlog: false,
      canReadAudit: false,
    });
    maybeSingle.mockResolvedValue({ data: { full_name: 'Sam Odhiambo' }, error: null });
    const form = new FormData();
    form.set('userId', '11111111-1111-4111-8111-111111111111');
    form.set('grant', 'can_read_audit');
    form.set('enabled', 'true');
    const result = await setStaffGrant({}, form);
    expect(result.ok).toMatch(/Sam Odhiambo can read the audit log/);
    expect(update).toHaveBeenCalledWith({ can_read_audit: true });
  });
});
