'use client';

import { ListFilters } from '@/components/list-filters';

const STATUS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

export function BlogFilters({ count }: { count?: string | undefined } = {}) {
  return (
    <ListFilters
      searchLabel="Search articles"
      searchPlaceholder="Search articles"
      count={count}
      filters={[{ param: 'status', label: 'Status', options: STATUS_OPTIONS }]}
    />
  );
}
