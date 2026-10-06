'use client';

import { useEffect, useState } from 'react';
import { Busy, Input, Select } from '@beco/ui';
import { useQueryNavigation } from '@/lib/use-query-navigation';
import { STAFF_ROLE_LABEL, STAFF_ROLES } from '@/lib/users';

export function UserFilters() {
  const { searchParams, setParam, isPending } = useQueryNavigation();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const role = searchParams.get('role') ?? '';
  const status = searchParams.get('status') ?? '';

  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== (searchParams.get('search') ?? '')) setParam('search', search);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 overflow-x-hidden xl:flex xl:items-end">
      <label className="col-span-full min-w-0 xl:min-w-0 xl:flex-1">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name or email"
          aria-label="Search users"
          className="min-w-0"
        />
      </label>
      <label className="min-w-0 xl:w-48 xl:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Role</span>
        <Select
          value={role}
          onChange={(event) => setParam('role', event.target.value)}
          aria-label="Filter by role"
          className="min-w-0"
        >
          <option value="">Any</option>
          {STAFF_ROLES.map((value) => (
            <option key={value} value={value}>
              {STAFF_ROLE_LABEL[value]}
            </option>
          ))}
        </Select>
      </label>
      <label className="min-w-0 xl:w-40 xl:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Status</span>
        <Select
          value={status}
          onChange={(event) => setParam('status', event.target.value)}
          aria-label="Filter by status"
          className="min-w-0"
        >
          <option value="">Any</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </label>
      <Busy pending={isPending} className="col-span-full xl:h-11 xl:shrink-0" />
    </div>
  );
}
