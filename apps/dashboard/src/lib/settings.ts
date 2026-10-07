import type { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

export const SETTINGS_KEYS = [
  'business_legal_name',
  'kra_pin',
  'vat_number',
  'business_address',
  'business_email',
  'vat_rate',
  'quote_validity_days',
  'quote_response_sla_hours',
  'bank_details',
  'till_number',
  'paybill_number',
  'paybill_account',
  'send_money_number',
  'payment_terms',
  'quote_footer',
  'whatsapp_number',
  'business_phone',
  'notification_recipients',
  'brightex_allowed_emails',
] as const;

export type SettingKey = (typeof SETTINGS_KEYS)[number];

export interface DashboardSettings {
  businessLegalName: string;
  kraPin: string;
  vatNumber: string;
  businessAddress: string;
  businessEmail: string;
  vatPercent: number;
  quoteValidityDays: number;
  quoteResponseSlaHours: number;
  bankDetails: string;
  tillNumber: string;
  paybillNumber: string;
  paybillAccount: string;
  sendMoneyNumber: string;
  paymentTerms: string;
  quoteFooter: string;
  whatsappNumber: string;
  businessPhone: string;
  notificationRecipients: string[];
  brightexAllowedEmails: string[];
}

export interface GrantStaffRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  canWriteBlog: boolean;
  canReadAudit: boolean;
  canManageUsers: boolean;
}

export const settingText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

export const settingNumber = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const settingEmails = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.includes('@'));
};

export const DEFAULT_LEGAL_NAME = 'Beco Interiors Limited';
export const DEFAULT_ADDRESS = 'Urban Square, Shop 8 and 9, Enterprise Road, Industrial Area, Nairobi';

const vatToPercent = (rate: number): number => {
  if (rate <= 1) return Math.round(rate * 10000) / 100;
  return rate;
};

export async function fetchDashboardSettings(supabase: SupabaseClient): Promise<DashboardSettings> {
  const { data } = await supabase.from('settings').select('key, value').in('key', [...SETTINGS_KEYS]);
  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    businessLegalName: settingText(map.get('business_legal_name')) || DEFAULT_LEGAL_NAME,
    kraPin: settingText(map.get('kra_pin')),
    vatNumber: settingText(map.get('vat_number')),
    businessAddress: settingText(map.get('business_address')) || DEFAULT_ADDRESS,
    businessEmail: settingText(map.get('business_email')),
    vatPercent: vatToPercent(settingNumber(map.get('vat_rate'), 0.16)),
    quoteValidityDays: settingNumber(map.get('quote_validity_days'), 30),
    quoteResponseSlaHours: settingNumber(map.get('quote_response_sla_hours'), 2),
    bankDetails: settingText(map.get('bank_details')),
    tillNumber: settingText(map.get('till_number')),
    paybillNumber: settingText(map.get('paybill_number')),
    paybillAccount: settingText(map.get('paybill_account')),
    sendMoneyNumber: settingText(map.get('send_money_number')),
    paymentTerms: settingText(map.get('payment_terms')),
    quoteFooter: settingText(map.get('quote_footer')),
    whatsappNumber: settingText(map.get('whatsapp_number')) || '254722333730',
    businessPhone: settingText(map.get('business_phone')) || '+254 722 333 730',
    notificationRecipients: settingEmails(map.get('notification_recipients')),
    brightexAllowedEmails: settingEmails(map.get('brightex_allowed_emails')),
  };
}

export async function fetchGrantStaff(supabase: SupabaseClient): Promise<GrantStaffRow[]> {
  const { data } = await supabase
    .from('users')
    .select('id, email, full_name, role, can_write_blog, can_read_audit, can_manage_users, is_active')
    .eq('is_active', true)
    .order('full_name');
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    canWriteBlog: row.can_write_blog,
    canReadAudit: row.can_read_audit,
    canManageUsers: row.can_manage_users,
  }));
}

export const SETTINGS_TABS = [
  'business',
  'quotes',
  'payments',
  'contact',
  'notifications',
  'studio',
  'permissions',
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const parseSettingsTab = (raw: string | undefined, canGrant: boolean): SettingsTab => {
  if (raw === 'permissions' || raw === 'studio') return canGrant ? raw : 'quotes';
  if (raw === 'bank' || raw === 'payments') return 'payments';
  if (raw === 'business' || raw === 'contact' || raw === 'notifications' || raw === 'quotes') {
    return raw;
  }
  return 'quotes';
};

export function emailsField(values: string[]): string {
  return values.join('\n');
}

export function settingsStorefrontPaths(keys: readonly string[]): string[] {
  const paths = new Set<string>();
  if (keys.some((key) => key === 'whatsapp_number' || key === 'business_phone' || key === 'vat_rate')) {
    paths.add('/');
  }
  return [...paths];
}
