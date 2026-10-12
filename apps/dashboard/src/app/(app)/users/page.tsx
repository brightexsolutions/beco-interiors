import type { Metadata } from 'next';
import { Panel, TableToolbar } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { NewUserFab } from '@/components/new-user';
import { UserFilters } from '@/components/user-filters';
import { UserResults } from '@/components/user-results';
import { QueryNavigationProvider } from '@/lib/use-query-navigation';
import { grantableModules, grantsFrom } from '@/lib/access';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { fetchUserById, fetchUsers, type StaffUserFilters } from '@/lib/users';
import type { UserRole } from '@beco/types';
import { USER_ROLES } from '@beco/types';

export const metadata: Metadata = {
  title: 'Users',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const parseRole = (value: string): UserRole | undefined =>
  (USER_ROLES as readonly string[]).includes(value) ? (value as UserRole) : undefined;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requirePath('/users');
  const params = await searchParams;
  const statusRaw = one(params.status);
  const filters: StaffUserFilters = {
    search: one(params.search) || undefined,
    role: parseRole(one(params.role)),
    status: statusRaw === 'active' || statusRaw === 'inactive' ? statusRaw : undefined,
  };

  const supabase = await getSupabase();
  const users = await fetchUsers(supabase, filters);
  const userId = one(params.user);
  const creating = one(params.new) === '1' && !userId;
  const viewing = userId
    ? (users.find((user) => user.id === userId) ?? (await fetchUserById(supabase, userId)))
    : null;

  return (
    <>
      <PageHeading eyebrow="Team" title="Users" actions={<NewUserFab />} />
      {/* One transition for the filters and the list. D117. */}
      <QueryNavigationProvider>
        <Panel className="mb-24">
          <TableToolbar filters={<UserFilters count={`${users.length} ${users.length === 1 ? 'user' : 'users'}`} />} />
          <div className="px-4 pb-4 sm:px-5 xl:px-0 xl:pb-0">
            <UserResults
              users={users}
              viewing={viewing}
              creating={creating}
              viewerId={session.userId}
              viewerRole={session.role}
              grantable={grantableModules(session.role, grantsFrom(session))}
            />
          </div>
        </Panel>
      </QueryNavigationProvider>
    </>
  );
}
