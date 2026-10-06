'use client';

import { ListFilters } from '@/components/list-filters';
import { STAFF_ROLE_LABEL, STAFF_ROLES } from '@/lib/users';

const ROLE_OPTIONS = [{ value: '', label: 'Any' }, ...STAFF_ROLES.map((value) => ({ value, label: STAFF_ROLE_LABEL[value] }))];

const STATUS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function UserFilters({ count }: { count?: string | undefined } = {}) {
  return (
    <ListFilters
      searchLabel="Search users"
      searchPlaceholder="Name or email"
      count={count}
      filters={[
        { param: 'role', label: 'Role', options: ROLE_OPTIONS },
        { param: 'status', label: 'Status', options: STATUS_OPTIONS },
      ]}
    />
  );
}
