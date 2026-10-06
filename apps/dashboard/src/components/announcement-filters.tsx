'use client';

import { ListFilters } from '@/components/list-filters';
import {
  ANNOUNCEMENT_TYPE_LABEL,
  ANNOUNCEMENT_TYPE_VALUES,
  ANNOUNCEMENT_WINDOW_LABEL,
  type AnnouncementWindow,
} from '@/lib/announcements';

const WINDOWS: AnnouncementWindow[] = ['live', 'scheduled', 'expired', 'off'];

const TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  ...ANNOUNCEMENT_TYPE_VALUES.map((value) => ({ value, label: ANNOUNCEMENT_TYPE_LABEL[value] })),
];

const WINDOW_OPTIONS = [{ value: '', label: 'Any' }, ...WINDOWS.map((value) => ({ value, label: ANNOUNCEMENT_WINDOW_LABEL[value] }))];

export function AnnouncementFilters({ count }: { count?: string | undefined } = {}) {
  return (
    <ListFilters
      searchLabel="Search announcements"
      searchPlaceholder="Title or body"
      count={count}
      filters={[
        { param: 'type', label: 'Type', options: TYPE_OPTIONS },
        { param: 'window', label: 'Window', options: WINDOW_OPTIONS },
      ]}
    />
  );
}
