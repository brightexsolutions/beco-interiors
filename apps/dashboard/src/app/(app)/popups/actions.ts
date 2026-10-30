'use server';

import { createPopupSchema, updatePopupSchema } from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { fromDatetimeLocalValue } from '@/lib/announcements';
import { popupMutationMessage } from '@/lib/popups';
import { revalidateStorefrontPaths } from '@/lib/storefront-revalidate';

export interface PopupActionState {
  error?: string;
  ok?: string;
  popupId?: string;
}

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

const fieldsFrom = (form: FormData) => ({
  variant: formString(form, 'variant'),
  eyebrow: formString(form, 'eyebrow'),
  badge: formString(form, 'badge'),
  title: formString(form, 'title'),
  body: formString(form, 'body'),
  ctaLabel: formString(form, 'ctaLabel'),
  ctaUrl: formString(form, 'ctaUrl'),
  productIds: form.getAll('productIds').map(String),
  trigger: formString(form, 'trigger'),
  triggerValue: formString(form, 'triggerValue') || '0',
  triggerSection: formString(form, 'triggerSection'),
  showAgainDays: formString(form, 'showAgainDays'),
  startsAt: fromDatetimeLocalValue(formString(form, 'startsAt')),
  endsAt: fromDatetimeLocalValue(formString(form, 'endsAt')),
  priority: formString(form, 'priority') || '0',
  isActive: form.get('isActive'),
});

type Parsed = ReturnType<typeof createPopupSchema.parse>;

const columnsFrom = (data: Parsed) => ({
  variant: data.variant,
  eyebrow: data.eyebrow,
  badge: data.badge,
  title: data.title,
  body: data.body,
  cta_label: data.ctaLabel,
  cta_url: data.ctaUrl,
  product_ids: data.productIds,
  trigger: data.trigger,
  // The exit and section triggers have no number. Stored as 0 so a later
  // switch to a delay starts from "at once" rather than a stale value.
  trigger_value: data.trigger === 'delay' || data.trigger === 'scroll' ? data.triggerValue : 0,
  trigger_section: data.triggerSection,
  show_again_days: data.showAgainDays,
  starts_at: data.startsAt,
  ends_at: data.endsAt,
  priority: data.priority,
  is_active: data.isActive,
});

export async function createPopup(_prev: PopupActionState, form: FormData): Promise<PopupActionState> {
  const session = await requirePath('/popups');
  const parsed = createPopupSchema.safeParse(fieldsFrom(form));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('popups')
    .insert({ ...columnsFrom(parsed.data), created_by: session.userId })
    .select('id')
    .maybeSingle();

  if (error) return { error: popupMutationMessage(error) };
  if (!data?.id) return { error: 'The database refused that write.' };

  await revalidateStorefrontPaths(['/']);
  return { ok: 'Pop up saved.', popupId: data.id };
}

export async function updatePopup(_prev: PopupActionState, form: FormData): Promise<PopupActionState> {
  await requirePath('/popups');
  const parsed = updatePopupSchema.safeParse({ ...fieldsFrom(form), popupId: formString(form, 'popupId') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('popups')
    .update(columnsFrom(parsed.data))
    .eq('id', parsed.data.popupId)
    .select('id')
    .maybeSingle();

  if (error) return { error: popupMutationMessage(error) };
  // RLS filters a non admin's update to no rows rather than raising.
  if (!data) return { error: 'That pop up is gone, or you cannot change it.' };

  await revalidateStorefrontPaths(['/']);
  return { ok: 'Pop up saved.' };
}
