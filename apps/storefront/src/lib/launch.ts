import { createClient } from '@supabase/supabase-js';

/**
 * Beco's first anniversary launch. Two values, both in `settings`, both
 * public: see migration 25 and D80.
 *
 * `launchAt` is the scheduled reveal, set once Beco confirms the exact day
 * in October. `isLive` is the manual switch thrown from apps/dashboard,
 * which wins over the date: a launch is a real event with people in the
 * room, not a cron job, so the actual reveal happens on a click, not
 * silently at midnight because a clock rolled over.
 */
export interface LaunchState {
  launchAt: string | null;
  isLive: boolean;
}

export const getLaunchState = async (): Promise<LaunchState> => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb
    .from('settings')
    .select('key,value')
    .in('key', ['site_launch_at', 'site_launch_live']);

  // Never important enough to break the page it sits above.
  if (error || !data) return { launchAt: null, isLive: false };

  const row = (key: string) => data.find((r) => r.key === key)?.value ?? null;
  return {
    launchAt: (row('site_launch_at') as string | null) ?? null,
    isLive: row('site_launch_live') === true,
  };
};
