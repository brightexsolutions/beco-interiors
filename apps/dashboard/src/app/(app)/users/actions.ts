'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  createStaffUserSchema,
  deleteStaffUserSchema,
  removeStaffPhotoSchema,
  resetStaffPasswordSchema,
  saveStaffPublicProfileSchema,
  setModuleGrantsSchema,
  setStaffActiveSchema,
  setStaffRoleSchema,
  uploadStaffPhotoSchema,
} from '@beco/validation';
import { MODULE_LABEL, accessLevel, grantableModules, grantsFrom } from '@/lib/access';
import { requirePath, type ActiveSession } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { getServiceSupabase } from '@/lib/supabase-admin';
import { processProductPhoto } from '@/lib/product-photo';
import { readPhotoUpload } from '@/lib/photo-source';
import { deleteProductDerivatives, isProductStorageConfigured, uploadProductDerivatives } from '@/lib/product-storage';
import { revalidateStorefrontPaths } from '@/lib/storefront-revalidate';
import { canManageAccount, generateIssuedPassword, parseStaffPublicPhoto, userMutationMessage } from '@/lib/users';

export interface UserActionState {
  error?: string;
  ok?: string;
  password?: string;
  userId?: string;
}


const formString = (form: FormData, key: string): string => String(form.get(key) ?? '');

const bumpLock = () => new Date().toISOString();

const refreshUsersAndTeam = async () => {
  revalidatePath('/users');
  await revalidateStorefrontPaths(['/team', '/']);
};

const BRIGHTEX_ONLY = 'Only Brightex manages a Brightex account.';
const VIEW_ONLY = 'You can read this section. Changing accounts stays with the staff grant.';

/**
 * D136: a module grant opens the Users screen to read, and the route check
 * lets the actions through on that. RLS refuses the row writes, but creating
 * a login and reissuing a password reach Supabase Auth through the service
 * role first, which RLS never sees. So every write asks this before it does
 * anything, and the answer is a sentence rather than a refused row.
 */
const refuseViewOnly = (session: ActiveSession): string | null =>
  accessLevel(session.role, '/users', grantsFrom(session)) === 'full' ? null : VIEW_ONLY;

/**
 * D135: a Beco person holding the staff grant never acts on a Brightex
 * account. RLS refuses the row write, but creating a login and reissuing a
 * password go through the service role, which RLS never sees, so every
 * action asks here first. Brightex itself skips the read.
 */
const refuseBrightexTarget = async (session: ActiveSession, userId: string): Promise<string | null> => {
  if (session.role === 'brightex_admin') return null;
  const supabase = await getSupabase();
  const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  if (!data) return 'That account is gone. Reload the list.';
  return canManageAccount(session.role, data.role) ? null : BRIGHTEX_ONLY;
};

export async function createStaffUser(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const session = await requirePath('/users');
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = createStaffUserSchema.safeParse({
    email: formString(form, 'email'),
    fullName: formString(form, 'fullName'),
    role: formString(form, 'role'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  }
  // Before the service role creates the login, which RLS never sees.
  if (!canManageAccount(session.role, parsed.data.role)) return { error: BRIGHTEX_ONLY };

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
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = setStaffRoleSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    role: formString(form, 'role'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) return { error: 'You cannot change your own role.' };
  if (!canManageAccount(session.role, parsed.data.role)) return { error: BRIGHTEX_ONLY };
  const refused = await refuseBrightexTarget(session, parsed.data.userId);
  if (refused) return { error: refused };

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
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = setStaffActiveSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    isActive: form.get('isActive'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) return { error: 'You cannot deactivate your own account.' };
  const refused = await refuseBrightexTarget(session, parsed.data.userId);
  if (refused) return { error: refused };

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
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = resetStaffPasswordSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) {
    return { error: 'Change your own password from the account menu.' };
  }
  // Before the service role reissues the password, which RLS never sees.
  const refused = await refuseBrightexTarget(session, parsed.data.userId);
  if (refused) return { error: refused };

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
  const session = await requirePath('/users');
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = saveStaffPublicProfileSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    isPublic: form.get('isPublic'),
    publicTitle: formString(form, 'publicTitle'),
    publicPhone: formString(form, 'publicPhone'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form, then try again.' };
  const refused = await refuseBrightexTarget(session, parsed.data.userId);
  if (refused) return { error: refused };

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
  const session = await requirePath('/users');
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = uploadStaffPhotoSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    alt: formString(form, 'alt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the photograph, then try again.' };
  const refused = await refuseBrightexTarget(session, parsed.data.userId);
  if (refused) return { error: refused };

  const photo = await readPhotoUpload(form);
  if (photo.error !== undefined) return { error: photo.error };
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
    processed = await processProductPhoto(photo.buffer);
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
  const session = await requirePath('/users');
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = removeStaffPhotoSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  const refused = await refuseBrightexTarget(session, parsed.data.userId);
  if (refused) return { error: refused };

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

/**
 * The module grants on one account, D136: the editor sends the whole set.
 * Brightex writes any set. A holder of the staff grant may only hand on what
 * they reach themselves, on a Beco account, never their own: the trigger in
 * migration 70 enforces each of those, this says the same thing before the
 * write so the toast is a sentence rather than a Postgres message.
 */
export async function setModuleGrants(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const session = await requirePath('/users');
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  const parsed = setModuleGrantsSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
    modules: form.getAll('modules').map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) return { error: 'You cannot change your own access.' };
  const allowed = grantableModules(session.role, grantsFrom(session));
  if (allowed.length === 0) return { error: 'Only Brightex can assign that permission.' };
  const refused = await refuseBrightexTarget(session, parsed.data.userId);
  if (refused) return { error: refused };

  const supabase = await getSupabase();
  const current = await supabase
    .from('users')
    .select('id, full_name, module_grants, updated_at')
    .eq('id', parsed.data.userId)
    .maybeSingle();
  if (!current.data) return { error: 'That account is gone. Reload the list.' };
  if (current.data.updated_at !== parsed.data.updatedAt) {
    return { error: 'This account changed while you were editing. Reload and try again.' };
  }
  const before = new Set(current.data.module_grants ?? []);
  const outOfReach = parsed.data.modules.filter((module) => !before.has(module) && !allowed.includes(module));
  if (outOfReach.length > 0) return { error: 'You can only grant access you hold yourself.' };
  const revokedOutOfReach = [...before].filter(
    (module) => !parsed.data.modules.includes(module as (typeof parsed.data.modules)[number]) && !allowed.includes(module as (typeof allowed)[number]),
  );
  if (revokedOutOfReach.length > 0) return { error: 'You can only change access you hold yourself.' };

  const { data, error } = await supabase
    .from('users')
    .update({ module_grants: parsed.data.modules, updated_at: bumpLock() })
    .eq('id', parsed.data.userId)
    .eq('updated_at', parsed.data.updatedAt)
    .select('id')
    .maybeSingle();
  if (error) return { error: userMutationMessage(error) };
  if (!data) return { error: 'This account changed while you were editing. Reload and try again.' };

  revalidatePath('/users');
  revalidatePath('/settings');
  const names = parsed.data.modules.map((module) => MODULE_LABEL[module]);
  return {
    ok:
      names.length === 0
        ? `${current.data.full_name} has no extra access now. Their role decides what they see.`
        : `${current.data.full_name} can now see ${names.join(', ')}.`,
  };
}

/**
 * Delete an account, D158. Brightex only, never their own. The database
 * function does the soft delete and ends the sessions under its own gate;
 * then the login is retired through Supabase Auth so the address is free
 * for a new account. The row is already off the list by then, so a failure
 * on that second step is reported rather than undone: the account cannot
 * sign in either way.
 */
export async function deleteStaffUser(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const session = await requirePath('/users');
  const viewOnly = refuseViewOnly(session);
  if (viewOnly) return { error: viewOnly };
  if (session.role !== 'brightex_admin') return { error: 'Only Brightex deletes accounts.' };
  const parsed = deleteStaffUserSchema.safeParse({
    userId: formString(form, 'userId'),
    updatedAt: formString(form, 'updatedAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Reload and try again.' };
  if (parsed.data.userId === session.userId) return { error: 'You cannot delete your own account.' };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('delete_user', {
    p_user_id: parsed.data.userId,
    p_updated_at: parsed.data.updatedAt,
  });
  if (error) return { error: userMutationMessage(error) };

  let retired: { error: { message: string } | null } = { error: null };
  try {
    retired = await getServiceSupabase().auth.admin.deleteUser(parsed.data.userId, true);
  } catch {
    retired = { error: { message: 'Service role is not configured.' } };
  }

  await refreshUsersAndTeam();
  return {
    ok: retired.error
      ? 'Account deleted. Their login could not be retired, so that email cannot be used for a new account yet.'
      : 'Account deleted. Quotes and orders they raised keep their name.',
  };
}
