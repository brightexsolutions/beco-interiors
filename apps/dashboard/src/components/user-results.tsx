'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DataTable,
  EmptyState,
  Icon,
  Pagination,
  Sheet,
  StatusPill,
  buttonClasses,
  cn,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
import { UserCreate } from '@/components/user-create';
import { UserEditor } from '@/components/user-editor';
import { BusyRegion } from '@/components/list-rows';
import { useQueryNavigation } from '@/lib/use-query-navigation';
import type { UserRole } from '@beco/types';
import { STAFF_ROLE_LABEL, canManageAccount, formatLastLogin, rolesAssignableBy, type StaffUser } from '@/lib/users';

function ViewAction({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      aria-label={`View ${name}`}
      className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
    >
      <Icon name="arrow-right" />
      View
    </Link>
  );
}

const desktopColumns = (viewHref: (id: string) => string): DataTableColumn<StaffUser>[] => [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    sortValue: (user) => user.fullName,
    render: (user) => <span className="font-semibold text-charcoal">{user.fullName}</span>,
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    sortValue: (user) => user.email,
    render: (user) => <span className="break-all">{user.email}</span>,
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    sortValue: (user) => STAFF_ROLE_LABEL[user.role],
    render: (user) => STAFF_ROLE_LABEL[user.role],
  },
  {
    key: 'status',
    header: 'Status',
    render: (user) => (
      <StatusPill label={user.isActive ? 'Active' : 'Inactive'} tone={user.isActive ? 'positive' : 'muted'} />
    ),
  },
  {
    key: 'lastLogin',
    header: 'Last login',
    sortable: true,
    sortValue: (user) => user.lastLoginAt ?? '',
    render: (user) => <span className="tabular-nums">{formatLastLogin(user.lastLoginAt)}</span>,
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (user) => <ViewAction href={viewHref(user.id)} name={user.fullName} />,
  },
];

export function UserResults({
  users,
  viewing,
  creating,
  viewerId,
  viewerRole,
}: {
  users: StaffUser[];
  viewing: StaffUser | null;
  creating: boolean;
  viewerId: string;
  viewerRole: UserRole;
}) {
  const roles = rolesAssignableBy(viewerRole);
  const router = useRouter();
  const pathname = usePathname();
  // Shared with the filter row (D117), so a filter change dims the list.
  const { searchParams, navigate, isPending } = useQueryNavigation();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(users, requestedPage);

  const withParam = (key: string, value: string | null, extraClear: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const clear of extraClear) params.delete(clear);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const viewHref = (id: string) => withParam('user', id, ['new']);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    navigate(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const closeSheet = () => {
    navigate(() => router.push(withParam('user', null, ['new'])));
  };

  const sheetOpen = Boolean(viewing) || creating;
  const sheetTitle = creating ? 'New user' : (viewing?.fullName ?? 'User');
  const sheetDescription = creating
    ? 'Issues a password once. They change it on first sign in.'
    : viewing?.isActive
      ? STAFF_ROLE_LABEL[viewing.role]
      : 'Inactive';

  const sheet = (
    <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()} title={sheetTitle} description={sheetDescription}>
      {creating ? (
        <UserCreate roles={roles} />
      ) : viewing ? (
        <UserEditor
          key={`${viewing.id}-${resetKey(viewing)}`}
          user={viewing}
          viewerId={viewerId}
          roles={roles}
          canManage={canManageAccount(viewerRole, viewing.role)}
        />
      ) : null}
    </Sheet>
  );

  if (users.length === 0) {
    return (
      <>
        <BusyRegion busy={isPending}>
          <EmptyState title="No users here" description="Nothing matches this filter yet. Clear search, or create a user." fill />
        </BusyRegion>
        {sheet}
      </>
    );
  }

  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <DataTable
          busy={isPending}
          caption={`${paged.total} users`}
          columns={desktopColumns(viewHref)}
          rows={paged.items}
          getRowKey={(user) => user.id}
        />
      </div>

      {/* Below xl this table is the list, so it dims like the wide one. */}
      <div
        aria-busy={isPending || undefined}
        className={cn('min-w-0 overflow-x-hidden transition-opacity duration-200 xl:hidden', isPending && 'opacity-50')}
      >
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{`${paged.total} users`}</caption>
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="py-3 pr-4 font-ui text-sm font-semibold text-neutral-500">Name</th>
              <th className="py-3 pr-4 font-ui text-sm font-semibold text-neutral-500">Status</th>
              <th className="py-3 text-right font-ui text-sm font-semibold text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.items.map((user) => (
              <tr key={user.id} className="border-b border-neutral-200">
                <td className="min-w-0 py-3 pr-4">
                  <p className="font-semibold text-charcoal">{user.fullName}</p>
                  <p className="text-neutral-500">{STAFF_ROLE_LABEL[user.role]}</p>
                </td>
                <td className="py-3 pr-4">
                  <StatusPill label={user.isActive ? 'Active' : 'Inactive'} tone={user.isActive ? 'positive' : 'muted'} />
                </td>
                <td className="py-3 text-right">
                  <ViewAction href={viewHref(user.id)} name={user.fullName} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        className="mt-4"
        page={paged.page}
        pageCount={paged.pageCount}
        from={paged.from}
        to={paged.to}
        total={paged.total}
        onPageChange={setPage}
      />

      {sheet}
    </>
  );
}

function resetKey(user: StaffUser): string {
  return `${user.isActive}-${user.role}-${user.mustChangePassword}`;
}
