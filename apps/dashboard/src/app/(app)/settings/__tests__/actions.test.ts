import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActiveSession } from '@/lib/session';

// Typed as Promise<ActiveSession> so role is the full UserRole union, not the
// literal 'beco_admin' `as const` would infer. The Brightex admin test below
// needs to hand back a different role.
const requirePath = vi.fn(
  async (): Promise<ActiveSession> => ({
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'irene.kariuki@beco.co.ke',
    fullName: 'Irene Kariuki',
    role: 'beco_admin',
    isActive: true,
    mustChangePassword: false,
    canWriteBlog: false,
    canReadAudit: false,
  }),
);
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

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
  revalidateStorefrontPaths: (...a: Parameters<typeof revalidateStorefrontPaths>) => revalidateStorefrontPaths(...a),
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
  form.set('businessLegalName', 'Beco Interiors Limited');
  form.set('kraPin', 'p051234567x');
  form.set('vatNumber', '');
  form.set('businessAddress', 'Urban Square, Enterprise Road, Nairobi');
  form.set('businessEmail', 'info@beco.co.ke');
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
  it('never writes the Brightex allowlist from a Beco admin, whatever the form carried (D110)', async () => {
    maybeSingle.mockResolvedValue({ data: { key: 'x' }, error: null });
    const result = await saveDashboardSettings({}, formFrom());
    expect(result.ok).toBeDefined();
    const wroteAllowlist = update.mock.calls.some(
      ([payload]) => Array.isArray((payload as { value: unknown }).value) && ((payload as { value: string[] }).value).includes('beco.brightex.dev@gmail.com'),
    );
    expect(wroteAllowlist).toBe(false);
  });

  it('writes the Brightex allowlist for a Brightex admin', async () => {
    requirePath.mockResolvedValueOnce({
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'beco.brightex.dev@gmail.com',
      fullName: 'Brightex',
      role: 'brightex_admin',
      isActive: true,
      mustChangePassword: false,
      canWriteBlog: true,
      canReadAudit: true,
    });
    maybeSingle.mockResolvedValue({ data: { key: 'x' }, error: null });
    await saveDashboardSettings({}, formFrom());
    const wroteAllowlist = update.mock.calls.some(
      ([payload]) => Array.isArray((payload as { value: unknown }).value) && ((payload as { value: string[] }).value).includes('beco.brightex.dev@gmail.com'),
    );
    expect(wroteAllowlist).toBe(true);
  });

  it('stores the KRA PIN uppercased and the business identity alongside the rest', async () => {
    maybeSingle.mockResolvedValue({ data: { key: 'x' }, error: null });
    const result = await saveDashboardSettings({}, formFrom());
    expect(result.ok).toBe('Settings saved.');
    const values = update.mock.calls.map((c) => (c[0] as { value: unknown }).value);
    expect(values).toContain('P051234567X');
    expect(values).toContain('Beco Interiors Limited');
    expect(values).toContain('info@beco.co.ke');
  });

  it('refuses a malformed KRA PIN with a clear message and writes nothing', async () => {
    const form = formFrom();
    form.set('kraPin', '12345');
    const result = await saveDashboardSettings({}, form);
    expect(result.error).toBe('A KRA PIN is a letter, nine digits and a letter');
    expect(update).not.toHaveBeenCalled();
  });

  it('lets the KRA PIN and VAT number stay blank until Beco has them', async () => {
    maybeSingle.mockResolvedValue({ data: { key: 'x' }, error: null });
    const form = formFrom();
    form.set('kraPin', '');
    form.set('businessEmail', '');
    expect((await saveDashboardSettings({}, form)).ok).toBe('Settings saved.');
  });

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
