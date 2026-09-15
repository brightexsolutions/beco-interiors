import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { LaunchControls } from './launch-controls';

export const metadata: Metadata = {
  title: 'Launch control',
  robots: { index: false, follow: false },
};

/**
 * The launch control, per D80. One page, one date field, one switch.
 *
 * Reachable only by an active beco_admin or brightex_admin: `requireAdmin`
 * is the route half of rule 7's two checks, and `settings_write_admin` RLS
 * is the half that actually holds. Not part of M5's dashboard build, just
 * the one surface this feature needs.
 */
export default async function LaunchPage() {
  const admin = await requireAdmin();
  const supabase = await getSupabase();

  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['site_launch_at', 'site_launch_live']);

  const value = (key: string) => data?.find((r) => r.key === key)?.value ?? null;
  const launchAt = (value('site_launch_at') as string | null) ?? null;
  const isLive = value('site_launch_live') === true;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="font-ui text-sm text-neutral-500">Signed in as {admin.email}</p>
      <h1 className="mt-1 font-ui text-2xl font-semibold text-charcoal">Anniversary launch</h1>
      <p className="mb-10 mt-2 max-w-[54ch] font-ui text-sm text-neutral-600">
        Beco turns one this October. Set the date the storefront counts down to, then throw the
        switch on the day.
      </p>
      <LaunchControls launchAt={launchAt} isLive={isLive} />
    </main>
  );
}
