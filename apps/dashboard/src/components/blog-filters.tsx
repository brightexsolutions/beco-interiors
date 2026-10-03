'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Input, Select } from '@beco/ui';

export function BlogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const status = searchParams.get('status') ?? '';

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

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
    </form>
  );
}
