import { describe, expect, it } from 'vitest';
import { dashboardSettingsSchema, setStaffGrantSchema } from '../dashboard-settings';

const valid = {
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
});
