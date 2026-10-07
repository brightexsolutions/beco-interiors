import { describe, expect, it } from 'vitest';
import { dashboardSettingsSchema, setStaffGrantSchema } from '../dashboard-settings';

const valid = {
  businessLegalName: 'Beco Interiors Limited',
  kraPin: '',
  vatNumber: '',
  businessAddress: 'Urban Square, Enterprise Road, Nairobi',
  businessEmail: '',
  vatPercent: '16',
  quoteValidityDays: '30',
  quoteResponseSlaHours: '2',
  bankDetails: 'KCB Bank Kenya.',
  tillNumber: '',
  paybillNumber: '',
  paybillAccount: '',
  sendMoneyNumber: '',
  paymentTerms: 'Prices include VAT.',
  quoteFooter: 'Urban Square, Nairobi.',
  whatsappNumber: '+254 722 333 730',
  businessPhone: '+254 722 333 730',
  notificationRecipients: 'quotes@beco.co.ke\nirene.kariuki@beco.co.ke',
  brightexAllowedEmails: 'beco.brightex.dev@gmail.com',
};

describe('dashboardSettingsSchema', () => {
  it('uppercases and de-spaces a KRA PIN, and leaves a blank one null', () => {
    const parsed = dashboardSettingsSchema.safeParse({ ...valid, kraPin: ' p051 234 567x ' });
    expect(parsed.success && parsed.data.kraPin).toBe('P051234567X');
    const blank = dashboardSettingsSchema.safeParse(valid);
    expect(blank.success && blank.data.kraPin).toBeNull();
  });

  it('refuses a KRA PIN that is not a letter, nine digits and a letter', () => {
    for (const kraPin of ['P05123456X', '1051234567X', 'P0512345678', 'PP51234567X']) {
      expect(dashboardSettingsSchema.safeParse({ ...valid, kraPin }).success).toBe(false);
    }
  });

  it('needs a legal name and address, and a real email only when one is given', () => {
    expect(dashboardSettingsSchema.safeParse({ ...valid, businessLegalName: ' ' }).success).toBe(false);
    expect(dashboardSettingsSchema.safeParse({ ...valid, businessAddress: '' }).success).toBe(false);
    expect(dashboardSettingsSchema.safeParse({ ...valid, businessEmail: 'not-an-email' }).success).toBe(false);
    expect(dashboardSettingsSchema.safeParse({ ...valid, vatNumber: 'bad number!' }).success).toBe(false);
  });

  it('stores WhatsApp as digits and splits email lists', () => {
    const parsed = dashboardSettingsSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.whatsappNumber).toBe('254722333730');
    expect(parsed.data.vatPercent).toBe(16);
    expect(parsed.data.notificationRecipients).toEqual([
      'quotes@beco.co.ke',
      'irene.kariuki@beco.co.ke',
    ]);
    expect(parsed.data.tillNumber).toBeNull();
    expect(parsed.data.paybillNumber).toBeNull();
    expect(parsed.data.sendMoneyNumber).toBeNull();
  });

  it('strips a paybill and send-money number to digits', () => {
    const parsed = dashboardSettingsSchema.safeParse({
      ...valid,
      paybillNumber: 'Business 247247',
      paybillAccount: 'Quote number',
      sendMoneyNumber: '+254 722 333 730',
      tillNumber: 'Till 123456',
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.paybillNumber).toBe('247247');
    expect(parsed.data.paybillAccount).toBe('Quote number');
    expect(parsed.data.sendMoneyNumber).toBe('254722333730');
    expect(parsed.data.tillNumber).toBe('123456');
  });

  it('refuses an empty Brightex allowlist and a negative VAT rate', () => {
    expect(dashboardSettingsSchema.safeParse({ ...valid, brightexAllowedEmails: '' }).success).toBe(false);
    expect(dashboardSettingsSchema.safeParse({ ...valid, vatPercent: '-1' }).success).toBe(false);
  });
});

describe('setStaffGrantSchema', () => {
  it('accepts a named grant', () => {
    const parsed = setStaffGrantSchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      grant: 'can_read_audit',
      enabled: 'on',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.enabled).toBe(true);
  });

  it('accepts staff management and refuses a grant that does not exist (D135)', () => {
    const base = { userId: '11111111-1111-4111-8111-111111111111', enabled: 'true' };
    expect(setStaffGrantSchema.safeParse({ ...base, grant: 'can_manage_users' }).success).toBe(true);
    expect(setStaffGrantSchema.safeParse({ ...base, grant: 'role' }).success).toBe(false);
    expect(setStaffGrantSchema.safeParse({ ...base, grant: 'can_write_blog' }).success).toBe(false);
  });
});
