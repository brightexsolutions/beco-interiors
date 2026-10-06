'use client';

import { useEffect, useState } from 'react';
import { Busy, Input, Select } from '@beco/ui';
import { useQueryNavigation } from '@/lib/use-query-navigation';
import { AUDIT_ACTIONS } from '@/lib/audit';

export function AuditFilters() {
  const { searchParams, setParam, isPending } = useQueryNavigation();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const entity = searchParams.get('entity') ?? '';
  const action = searchParams.get('action') ?? '';

  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== (searchParams.get('search') ?? '')) setParam('search', search);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <form
      className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem_12rem]"
      onSubmit={(event) => event.preventDefault()}
    >
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search entity"
        aria-label="Search entity"
      />
      <Select aria-label="Entity" value={entity} onChange={(event) => setParam('entity', event.target.value)}>
        <option value="">All entities</option>
        <option value="quotes">quotes</option>
        <option value="orders">orders</option>
        <option value="products">products</option>
        <option value="users">users</option>
        <option value="settings">settings</option>
        <option value="blog_posts">blog_posts</option>
        <option value="announcements">announcements</option>
      </Select>
      <Select aria-label="Action" value={action} onChange={(event) => setParam('action', event.target.value)}>
        <option value="">All actions</option>
        {AUDIT_ACTIONS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </Select>
      <Busy pending={isPending} className="xl:col-span-full" />
    </form>
  );
}
