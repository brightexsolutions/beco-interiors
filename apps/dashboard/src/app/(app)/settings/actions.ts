'use server';

import { dashboardSettingsSchema, setStaffGrantSchema } from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { SETTINGS_KEYS, settingsStorefrontPaths, type SettingKey } from '@/lib/settings';
import { revalidateStorefrontPaths } from '@/lib/storefront-revalidate';
import { revalidatePath } from 'next/cache';

export interface SettingsActionState {
  error?: string;
  ok?: string;
}

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

export async function saveDashboardSettings(
  _prev: SettingsActionState,
  form: FormData,
): Promise<SettingsActionState> {
  const session = await requirePath('/settings');
  const parsed = dashboardSettingsSchema.safeParse({
    vatPercent: formString(form, 'vatPercent'),
    quoteValidityDays: formString(form, 'quoteValidityDays'),
    quoteResponseSlaHours: formString(form, 'quoteResponseSlaHours'),
    bankDetails: formString(form, 'bankDetails'),
    tillNumber: formString(form, 'tillNumber'),
    paybillNumber: formString(form, 'paybillNumber'),
    paybillAccount: formString(form, 'paybillAccount'),
    sendMoneyNumber: formString(form, 'sendMoneyNumber'),
    paymentTerms: formString(form, 'paymentTerms'),
    quoteFooter: formString(form, 'quoteFooter'),
    whatsappNumber: formString(form, 'whatsappNumber'),
    businessPhone: formString(form, 'businessPhone'),
    notificationRecipients: formString(form, 'notificationRecipients'),
    brightexAllowedEmails: formString(form, 'brightexAllowedEmails'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const rows: Record<SettingKey, unknown> = {
    vat_rate: parsed.data.vatPercent / 100,
    quote_validity_days: parsed.data.quoteValidityDays,
    quote_response_sla_hours: parsed.data.quoteResponseSlaHours,
    bank_details: parsed.data.bankDetails,
    till_number: parsed.data.tillNumber ?? '',
    paybill_number: parsed.data.paybillNumber ?? '',
    paybill_account: parsed.data.paybillAccount ?? '',
    send_money_number: parsed.data.sendMoneyNumber ?? '',
    payment_terms: parsed.data.paymentTerms,
    quote_footer: parsed.data.quoteFooter,
    whatsapp_number: parsed.data.whatsappNumber,
    business_phone: parsed.data.businessPhone,
    notification_recipients: parsed.data.notificationRecipients,
    brightex_allowed_emails: parsed.data.brightexAllowedEmails,
  };

  const supabase = await getSupabase();
  const now = new Date().toISOString();
  for (const key of SETTINGS_KEYS) {
    const { data, error } = await supabase
      .from('settings')
      .update({ value: rows[key] as never, updated_at: now, updated_by: session.userId })
      .eq('key', key)
      .select('key')
      .maybeSingle();
    if (error) return { error: 'The database refused that write. You may not have permission.' };
    if (!data) {
      const inserted = await supabase.from('settings').insert({
        key,
        value: rows[key] as never,
        updated_at: now,
        updated_by: session.userId,
      });
      if (inserted.error) return { error: 'The database refused that write. You may not have permission.' };
    }
  }

  const paths = settingsStorefrontPaths([...SETTINGS_KEYS]);
  if (paths.length) await revalidateStorefrontPaths(paths, '/settings');
  else revalidatePath('/settings');
  return { ok: 'Settings saved.' };
}

export async function setStaffGrant(
  _prev: SettingsActionState,
  form: FormData,
): Promise<SettingsActionState> {
  const session = await requirePath('/settings');
  if (session.role !== 'brightex_admin') {
    return { error: 'Only Brightex can assign those permissions.' };
  }
  const parsed = setStaffGrantSchema.safeParse({
    userId: formString(form, 'userId'),
    grant: formString(form, 'grant'),
    enabled: formString(form, 'enabled'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }
  if (parsed.data.userId === session.userId) {
    return { error: 'Your own Brightex role already carries both permissions.' };
  }

  const supabase = await getSupabase();
  const patch = { can_read_audit: parsed.data.enabled };
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', parsed.data.userId)
    .select('full_name')
    .maybeSingle();
  if (error) return { error: error.message || 'The database refused that write.' };
  if (!data) return { error: 'That account is gone.' };

  revalidatePath('/settings');
  const verb = parsed.data.enabled ? 'can' : 'can no longer';
  const what = 'read the audit log';
  return { ok: `${data.full_name} ${verb} ${what}.` };
}
