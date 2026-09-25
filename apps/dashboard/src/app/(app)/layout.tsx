import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/session';

/**
 * Wraps every signed-in dashboard route in the app shell. `/login`,
 * `/change-password` and `/launch` sit outside this group and keep their own
 * chrome. `requireUser` here is the layout-level half of "checks in two
 * places"; each page still calls `requirePath` for its own role gate.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
