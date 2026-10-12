import type { Metadata } from 'next';
import { SettingsForm } from '@/components/settings-form';
import { fetchDashboardSettings, fetchGrantStaff, parseSettingsTab } from '@/lib/settings';
import { grantableModules, grantsFrom } from '@/lib/access';
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
  // Brightex assigns every grant. A Beco admin holding the staff grant sees
  // the tab too, for module access alone (D136).
  const canAssignStaffGrants = session.role === 'brightex_admin';
  const grantable = grantableModules(session.role, grantsFrom(session));
  const canGrant = canAssignStaffGrants || grantable.length > 0;
  const staff = canGrant ? await fetchGrantStaff(supabase) : [];
  const params = await searchParams;

  return (
    <SettingsForm
      settings={settings}
      tab={parseSettingsTab(params.tab, canGrant, canAssignStaffGrants)}
      canGrant={canGrant}
      canAssignStaffGrants={canAssignStaffGrants}
      grantable={grantable}
      staff={staff}
      viewerId={session.userId}
    />
  );
}
