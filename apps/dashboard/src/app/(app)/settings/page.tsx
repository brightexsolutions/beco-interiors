import type { Metadata } from 'next';
import { SettingsForm } from '@/components/settings-form';
import { fetchDashboardSettings, fetchGrantStaff, parseSettingsTab } from '@/lib/settings';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

type Search = { tab?: string };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requirePath('/settings');
  const supabase = await getSupabase();
  const settings = await fetchDashboardSettings(supabase);
  const canGrant = session.role === 'brightex_admin';
  const staff = canGrant ? await fetchGrantStaff(supabase) : [];
  const params = await searchParams;

  return (
    <SettingsForm
      settings={settings}
      tab={parseSettingsTab(params.tab, canGrant)}
      canGrant={canGrant}
      staff={staff}
      viewerId={session.userId}
    />
  );
}
