'use server';

import { revalidatePath } from 'next/cache';
import { launchSettingsSchema } from '@beco/validation';
import { getSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/session';

export interface LaunchActionState {
  ok?: string;
  error?: string;
}

/**
 * Every action re-checks the caller, per Next's own warning and rule 7: a
 * server action is a public endpoint, and the page having gated the render
 * does not gate the POST. RLS on `settings` is the backstop underneath.
 */
async function writeSetting(
  key: string,
  value: string | boolean | null,
): Promise<LaunchActionState> {
  await requireAdmin();
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select('key')
    .maybeSingle();

  if (error) {
    return { error: 'The database refused that write. You may not have permission.' };
  }
  return {};
}

export async function saveLaunchDate(
  _prev: LaunchActionState,
  formData: FormData,
): Promise<LaunchActionState> {
  await requireAdmin();
  const parsed = launchSettingsSchema.safeParse({ launchAt: formData.get('launchAt') ?? '' });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the date and try again' };
  }

  const result = await writeSetting('site_launch_at', parsed.data.launchAt);
  if (result.error) return result;

  revalidatePath('/launch');
  return { ok: parsed.data.launchAt ? 'Countdown date saved.' : 'Countdown cleared.' };
}

export async function goLive(): Promise<LaunchActionState> {
  const result = await writeSetting('site_launch_live', true);
  if (result.error) return result;

  revalidatePath('/launch');
  return { ok: 'The site is live. The reveal will play for the next visitor.' };
}

export async function standDown(): Promise<LaunchActionState> {
  const result = await writeSetting('site_launch_live', false);
  if (result.error) return result;

  revalidatePath('/launch');
  return { ok: 'Reverted to the countdown.' };
}
