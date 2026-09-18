'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  createStaffUserSchema,
  removeStaffPhotoSchema,
  resetStaffPasswordSchema,
  saveStaffPublicProfileSchema,
  setStaffActiveSchema,
  setStaffRoleSchema,
  uploadStaffPhotoSchema,
} from '@beco/validation';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { getServiceSupabase } from '@/lib/supabase-admin';
import { processProductPhoto } from '@/lib/product-photo';
import { deleteProductDerivatives, isProductStorageConfigured, uploadProductDerivatives } from '@/lib/product-storage';
import { revalidateStorefrontPaths } from '@/lib/storefront-revalidate';
import { generateIssuedPassword, parseStaffPublicPhoto, userMutationMessage } from '@/lib/users';

export interface UserActionState {
  error?: string;
  ok?: string;
  password?: string;
  userId?: string;
}

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

const bumpLock = () => new Date().toISOString();

const refreshUsersAndTeam = async () => {
  revalidatePath('/users');
  await revalidateStorefrontPaths(['/team', '/']);
};

export async function createStaffUser(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const session = await requirePath('/users');
  const parsed = createStaffUserSchema.safeParse({
    email: formString(form, 'email'),
    fullName: formString(form, 'fullName'),
    role: formString(form, 'role'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }

  const password = generateIssuedPassword();
  let admin;
  try {
    admin = getServiceSupabase();
  } catch {
    return { error: 'Service role is not configured.' };
  }

  const created = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    return { error: userMutationMessage(created.error) };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from('users').insert({
    id: created.data.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    is_active: true,
    must_change_password: true,
    created_by: session.userId,
  }).select('id').maybeSingle();

  if (error) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return { error: userMutationMessage(error) };
  }

  revalidatePath('/users');
  return {
    ok: 'Account created. Send the password out of band, then they change it on first sign in.',
    password,
    userId: created.data.user.id,
  };
}

export async function setStaffRole(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const session = await requirePath('/users');
  const parsed = setStaffRoleSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    role: formString(form, 'role'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) return { error: 'You cannot change your own role.' };

  const patch: { role: typeof parsed.data.role; updated_at: string; is_public?: boolean } = {
    role: parsed.data.role,
    updated_at: bumpLock(),
  };
  if (parsed.data.role !== 'beco_sales') patch.is_public = false;

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', parsed.data.userId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();

  if (error) return { error: userMutationMessage(error) };
  if (!data) return { error: 'This account changed while you were editing. Reload and try again.' };
  await refreshUsersAndTeam();
  return { ok: 'Role updated.' };
}

export async function setStaffActive(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const session = await requirePath('/users');
  const parsed = setStaffActiveSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    isActive: form.get('isActive'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) return { error: 'You cannot deactivate your own account.' };

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: parsed.data.isActive, updated_at: bumpLock() })
    .eq('id', parsed.data.userId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();

  if (error) return { error: userMutationMessage(error) };
  if (!data) return { error: 'This account changed while you were editing. Reload and try again.' };

  if (!parsed.data.isActive) {
    const { error: sessionError } = await supabase.rpc('end_user_sessions', {
      p_user_id: parsed.data.userId,
    });
    if (sessionError) return { error: userMutationMessage(sessionError) };
  }

  revalidatePath('/users');
  return {
    ok: parsed.data.isActive
      ? 'Account reactivated. They can sign in again.'
      : 'Account deactivated. Their sessions have ended. Quotes they raised stay attributed to them.',
  };
}

export async function resetStaffPassword(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const session = await requirePath('/users');
  const parsed = resetStaffPasswordSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) {
    return { error: 'Change your own password from the account menu.' };
  }

  const password = generateIssuedPassword();
  let admin;
  try {
    admin = getServiceSupabase();
  } catch {
    return { error: 'Service role is not configured.' };
  }

  const updated = await admin.auth.admin.updateUserById(parsed.data.userId, { password });
  if (updated.error) return { error: userMutationMessage(updated.error) };

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('users')
    .update({ must_change_password: true, updated_at: bumpLock() })
    .eq('id', parsed.data.userId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();

  if (error) return { error: userMutationMessage(error) };
  if (!data) return { error: 'This account changed while you were editing. Reload and try again.' };

  await supabase.rpc('end_user_sessions', { p_user_id: parsed.data.userId });

  revalidatePath('/users');
  return {
    ok: 'Password reissued. Send it out of band. They must change it on next sign in.',
    password,
  };
}

export async function saveStaffPublicProfile(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  await requirePath('/users');
  const parsed = saveStaffPublicProfileSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    isPublic: form.get('isPublic'),
    publicTitle: formString(form, 'publicTitle'),
    publicPhone: formString(form, 'publicPhone'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };

  const supabase = await getSupabase();
  const current = await supabase
    .from('users')
    .select('id, role, updated_at')
    .eq('id', parsed.data.userId)
    .maybeSingle();
  if (!current.data) return { error: 'That account is gone.' };
  if (current.data.updated_at !== parsed.data.updatedAt) {
    return { error: 'This account changed while you were editing. Reload and try again.' };
  }
  if (parsed.data.isPublic && current.data.role !== 'beco_sales') {
    return { error: 'Only sales accounts can appear on the website.' };
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      is_public: parsed.data.isPublic,
      public_title: parsed.data.publicTitle?.trim() ? parsed.data.publicTitle.trim() : null,
      public_phone: parsed.data.publicPhone ?? null,
      updated_at: bumpLock(),
    })
    .eq('id', parsed.data.userId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();

  if (error) return { error: userMutationMessage(error) };
  if (!data) return { error: 'This account changed while you were editing. Reload and try again.' };
  await refreshUsersAndTeam();
  return { ok: parsed.data.isPublic ? 'Shown on /team.' : 'Hidden from /team.' };
}

export async function uploadStaffPhoto(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  await requirePath('/users');
  const parsed = uploadStaffPhotoSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    alt: formString(form, 'alt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the photograph, then try again.' };

  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a photograph first.' };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: 'That photograph is larger than 12MB. Compress it and try again.' };
  }
  if (file.type && !ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { error: 'Use a JPEG, PNG or WebP photograph.' };
  }
  if (!isProductStorageConfigured()) {
    return { error: 'Photograph storage is not configured. Add the R2 keys, then try again.' };
  }

  const supabase = await getSupabase();
  const current = await supabase
    .from('users')
    .select('id, public_photo, updated_at')
    .eq('id', parsed.data.userId)
    .maybeSingle();
  if (!current.data) return { error: 'That account is gone.' };
  if (current.data.updated_at !== parsed.data.updatedAt) {
    return { error: 'This account changed while you were editing. Reload and try again.' };
  }

  let processed;
  try {
    processed = await processProductPhoto(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'That file is not a photograph we can read.' };
  }

  const stem = `team/${parsed.data.userId}/${randomBytes(4).toString('hex')}`;
  try {
    await uploadProductDerivatives(stem, processed.derivatives);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not store that photograph.' };
  }

  const previous = parseStaffPublicPhoto(current.data.public_photo);
  const { data, error } = await supabase
    .from('users')
    .update({
      public_photo: {
        path: stem,
        alt: parsed.data.alt,
        width: processed.width,
        height: processed.height,
        blur: processed.blurDataUrl,
      },
      updated_at: bumpLock(),
    })
    .eq('id', parsed.data.userId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    await deleteProductDerivatives(stem).catch(() => undefined);
    return { error: error ? userMutationMessage(error) : 'This account changed while you were editing. Reload and try again.' };
  }

  if (previous?.path && previous.path !== stem) {
    await deleteProductDerivatives(previous.path).catch(() => undefined);
  }
  await refreshUsersAndTeam();
  return { ok: 'Photograph uploaded. It is used on /team when this person is shown.' };
}

export async function removeStaffPhoto(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  await requirePath('/users');
  const parsed = removeStaffPhotoSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };

  const supabase = await getSupabase();
  const current = await supabase
    .from('users')
    .select('id, public_photo, updated_at')
    .eq('id', parsed.data.userId)
    .maybeSingle();
  if (!current.data) return { error: 'That account is gone.' };
  if (current.data.updated_at !== parsed.data.updatedAt) {
    return { error: 'This account changed while you were editing. Reload and try again.' };
  }

  const previous = parseStaffPublicPhoto(current.data.public_photo);
  const { data, error } = await supabase
    .from('users')
    .update({ public_photo: null, updated_at: bumpLock() })
    .eq('id', parsed.data.userId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();

  if (error) return { error: userMutationMessage(error) };
  if (!data) return { error: 'This account changed while you were editing. Reload and try again.' };

  if (previous?.path && isProductStorageConfigured()) {
    await deleteProductDerivatives(previous.path).catch(() => undefined);
  }
  await refreshUsersAndTeam();
  return { ok: 'Photograph removed from /team.' };
}
