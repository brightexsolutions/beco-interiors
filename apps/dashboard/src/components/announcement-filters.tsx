'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Input, Select } from '@beco/ui';
import {
  ANNOUNCEMENT_TYPE_LABEL,
  ANNOUNCEMENT_TYPE_VALUES,
  ANNOUNCEMENT_WINDOW_LABEL,
  type AnnouncementWindow,
} from '@/lib/announcements';

const WINDOWS: AnnouncementWindow[] = ['live', 'scheduled', 'expired', 'off'];

export function AnnouncementFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const type = searchParams.get('type') ?? '';
  const window = searchParams.get('window') ?? '';

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
    <div className="grid min-w-0 grid-cols-2 gap-2 overflow-x-hidden lg:flex lg:items-end">
      <label className="col-span-full min-w-0 lg:min-w-0 lg:flex-1">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Title or body"
          aria-label="Search announcements"
          className="min-w-0"
        />
      </label>
      <label className="min-w-0 lg:w-44 lg:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Type</span>
        <Select
          value={type}
          onChange={(event) => setParam('type', event.target.value)}
          aria-label="Filter by type"
          className="min-w-0"
        >
          <option value="">Any</option>
          {ANNOUNCEMENT_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {ANNOUNCEMENT_TYPE_LABEL[value]}
            </option>
          ))}
        </Select>
      </label>
      <label className="min-w-0 lg:w-44 lg:shrink-0">
        <span className="mb-1 block truncate font-ui text-sm font-semibold text-charcoal">Window</span>
        <Select
          value={window}
          onChange={(event) => setParam('window', event.target.value)}
          aria-label="Filter by window"
          className="min-w-0"
        >
          <option value="">Any</option>
          {WINDOWS.map((value) => (
            <option key={value} value={value}>
              {ANNOUNCEMENT_WINDOW_LABEL[value]}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
