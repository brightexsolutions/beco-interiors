'use client';

import { useEffect, useState } from 'react';
import { Busy, Input, Select } from '@beco/ui';
import {
  ANNOUNCEMENT_TYPE_LABEL,
  ANNOUNCEMENT_TYPE_VALUES,
  ANNOUNCEMENT_WINDOW_LABEL,
  type AnnouncementWindow,
} from '@/lib/announcements';
import { useQueryNavigation } from '@/lib/use-query-navigation';

const WINDOWS: AnnouncementWindow[] = ['live', 'scheduled', 'expired', 'off'];

export function AnnouncementFilters() {
  const { searchParams, setParam, isPending } = useQueryNavigation();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const type = searchParams.get('type') ?? '';
  const window = searchParams.get('window') ?? '';

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
          placeholder="Title or body"
          aria-label="Search announcements"
          className="min-w-0"
        />
      </label>
      <label className="min-w-0 xl:w-44 xl:shrink-0">
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
      <label className="min-w-0 xl:w-44 xl:shrink-0">
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
      <Busy pending={isPending} className="col-span-full xl:h-11 xl:shrink-0" />
    </div>
  );
}
