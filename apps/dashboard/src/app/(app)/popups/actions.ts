'use server';

import { randomBytes } from 'node:crypto';
import { createPopupSchema, updatePopupSchema } from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { fromDatetimeLocalValue } from '@/lib/announcements';
import { popupMutationMessage } from '@/lib/popups';
import { processProductPhoto } from '@/lib/product-photo';
import { readPhotoUpload } from '@/lib/photo-source';
import {
  deleteProductDerivatives,
  isProductStorageConfigured,
  uploadProductDerivatives,
} from '@/lib/product-storage';
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const popupIdFrom = (form: FormData): string | null => {
  const id = formString(form, 'popupId');
  return UUID.test(id) ? id.toLowerCase() : null;
};

/** The banner a pop up already has, so a replacement or removal can clear its old files. */
async function currentBanner(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  popupId: string,
): Promise<{ found: boolean; path: string | null }> {
  const { data } = await supabase.from('popups').select('id, image').eq('id', popupId).maybeSingle();
  if (!data) return { found: false, path: null };
  const image = (data as { image: { path?: string } | null }).image;
  return { found: true, path: image?.path ?? null };
}

/**
 * Upload the banner look's picture, D162. Same path as a blog cover: the
 * browser stages it in R2 (D116), the server makes the three WebP widths, and
 * only then is the row pointed at them. The old banner's files go once the
 * row has moved, so a failed write never leaves the pop up pointing at
 * nothing.
 */
export async function uploadPopupBanner(_prev: PopupActionState, form: FormData): Promise<PopupActionState> {
  await requirePath('/popups');
  const popupId = popupIdFrom(form);
  if (!popupId) return { error: 'Save the pop up before you add a banner.' };
  const photo = await readPhotoUpload(form, 'file');
  if (photo.error !== undefined) return { error: photo.error };
  if (!isProductStorageConfigured()) {
    return { error: 'Photograph storage is not configured. Add the R2 keys, then try again.' };
  }

  const supabase = await getSupabase();
  const existing = await currentBanner(supabase, popupId);
  if (!existing.found) return { error: 'That pop up is gone, or you cannot change it.' };

  let processed;
  try {
    processed = await processProductPhoto(photo.buffer);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'That file is not a picture we can read.' };
  }

  const stem = `popups/${popupId}/${randomBytes(4).toString('hex')}`;
  await uploadProductDerivatives(stem, processed.derivatives);

  const { data, error } = await supabase
    .from('popups')
    .update({
      image: { path: stem, width: processed.width, height: processed.height, blur: processed.blurDataUrl },
    })
    .eq('id', popupId)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    // The row never moved, so the new files are the orphans, not the old.
    await deleteProductDerivatives(stem);
    return { error: error ? popupMutationMessage(error) : 'That pop up is gone, or you cannot change it.' };
  }
  if (existing.path) await deleteProductDerivatives(existing.path);

  await revalidateStorefrontPaths(['/']);
  return { ok: 'Banner uploaded.' };
}

export async function removePopupBanner(_prev: PopupActionState, form: FormData): Promise<PopupActionState> {
  await requirePath('/popups');
  const popupId = popupIdFrom(form);
  if (!popupId) return { error: 'That pop up is gone.' };

  const supabase = await getSupabase();
  const existing = await currentBanner(supabase, popupId);
  if (!existing.found) return { error: 'That pop up is gone, or you cannot change it.' };

  const { data, error } = await supabase
    .from('popups')
    .update({ image: null })
    .eq('id', popupId)
    .select('id')
    .maybeSingle();
  if (error) return { error: popupMutationMessage(error) };
  if (!data) return { error: 'That pop up is gone, or you cannot change it.' };
  if (existing.path) await deleteProductDerivatives(existing.path);

  await revalidateStorefrontPaths(['/']);
  return { ok: 'Banner removed.' };
}
