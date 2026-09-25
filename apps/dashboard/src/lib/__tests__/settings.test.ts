import { describe, expect, it } from 'vitest';
import { emailsField, settingEmails, settingNumber, settingsStorefrontPaths } from '../settings';

describe('settings helpers', () => {
  it('reads a fraction VAT rate as a number', () => {
    expect(settingNumber(0.16, 0)).toBe(0.16);
    expect(settingNumber('30', 0)).toBe(30);
    expect(settingEmails(['a@beco.co.ke', 1, 'nope'])).toEqual(['a@beco.co.ke']);
    expect(emailsField(['a@beco.co.ke', 'b@beco.co.ke'])).toBe('a@beco.co.ke\nb@beco.co.ke');
  });

  it('revalidates the storefront only for public-facing keys', () => {
    expect(settingsStorefrontPaths(['quote_footer'])).toEqual([]);
    expect(settingsStorefrontPaths(['whatsapp_number', 'bank_details'])).toEqual(['/']);
  });

  it('parses settings tabs and refuses Permissions without a grant', async () => {
    const { parseSettingsTab } = await import('../settings');
    expect(parseSettingsTab(undefined, false)).toBe('quotes');
    expect(parseSettingsTab('bank', false)).toBe('payments');
    expect(parseSettingsTab('payments', false)).toBe('payments');
    expect(parseSettingsTab('permissions', false)).toBe('quotes');
    expect(parseSettingsTab('studio', false)).toBe('quotes');
    expect(parseSettingsTab('studio', true)).toBe('studio');
    expect(parseSettingsTab('permissions', true)).toBe('permissions');
    expect(parseSettingsTab('nope', true)).toBe('quotes');
  });
});
