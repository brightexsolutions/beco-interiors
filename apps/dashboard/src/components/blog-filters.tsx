'use client';

import { useEffect, useState } from 'react';
import { Busy, Input, Select } from '@beco/ui';
import { useQueryNavigation } from '@/lib/use-query-navigation';

export function BlogFilters() {
  const { searchParams, setParam, isPending } = useQueryNavigation();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const status = searchParams.get('status') ?? '';

  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== (searchParams.get('search') ?? '')) setParam('search', search);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <form
      className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem]"
      onSubmit={(event) => event.preventDefault()}
    >
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search articles"
        aria-label="Search articles"
      />
      <Select
        aria-label="Status"
        value={status}
        onChange={(event) => setParam('status', event.target.value)}
      >
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </Select>
      <Busy pending={isPending} className="xl:col-span-full" />
    </form>
  );
}
