'use server';

import { createAnnouncementSchema, updateAnnouncementSchema } from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { announcementMutationMessage, fromDatetimeLocalValue } from '@/lib/announcements';
import { revalidateStorefrontPaths } from '@/lib/storefront-revalidate';

export interface AnnouncementActionState {
  error?: string;
  ok?: string;
  announcementId?: string;
}

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

const fieldsFrom = (form: FormData) => ({
  title: formString(form, 'title'),
  body: formString(form, 'body'),
  type: formString(form, 'type'),
  ctaLabel: formString(form, 'ctaLabel'),
  ctaUrl: formString(form, 'ctaUrl'),
  startsAt: fromDatetimeLocalValue(formString(form, 'startsAt')),
  endsAt: fromDatetimeLocalValue(formString(form, 'endsAt')),
  priority: formString(form, 'priority'),
  isActive: form.get('isActive'),
});

export async function createAnnouncement(
  _prev: AnnouncementActionState,
  form: FormData,
): Promise<AnnouncementActionState> {
  const session = await requirePath('/announcements');
  const parsed = createAnnouncementSchema.safeParse(fieldsFrom(form));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type,
      cta_label: parsed.data.ctaLabel,
      cta_url: parsed.data.ctaUrl,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      priority: parsed.data.priority,
      is_active: parsed.data.isActive,
      created_by: session.userId,
    })
    .select('id')
    .maybeSingle();

  if (error) return { error: announcementMutationMessage(error) };
  if (!data?.id) return { error: 'The database refused that write.' };

  await revalidateStorefrontPaths(['/']);
  return { ok: 'Announcement saved.', announcementId: data.id };
}

export async function updateAnnouncement(
  _prev: AnnouncementActionState,
  form: FormData,
): Promise<AnnouncementActionState> {
  await requirePath('/announcements');
  const parsed = updateAnnouncementSchema.safeParse({
    ...fieldsFrom(form),
    announcementId: formString(form, 'announcementId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('announcements')
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type,
      cta_label: parsed.data.ctaLabel,
      cta_url: parsed.data.ctaUrl,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      priority: parsed.data.priority,
      is_active: parsed.data.isActive,
    })
    .eq('id', parsed.data.announcementId)
    .select('id')
    .maybeSingle();

  if (error) return { error: announcementMutationMessage(error) };
  if (!data) return { error: 'That announcement is gone.' };

  await revalidateStorefrontPaths(['/']);
  return { ok: 'Announcement saved.' };
}
