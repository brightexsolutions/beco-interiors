'use client';

import { ListFilters } from '@/components/list-filters';
import type { QuoteOwnerFilter } from '@/lib/quotes';

/**
 * Search, owner, status and source, with the URL as the source of truth:
 * the result set is server rendered from these params, so a filtered view
 * is shareable and the back button works.
 *
 * `ownerOptions` differs by role (decided by the page): a salesperson sees
 * their own work and the shared queue, an admin additionally sees
 * everyone's, per PRD section 4.2's "role based views, not just role based
 * permissions." The first option is the default when the URL names none.
 */
export interface OwnerOption {
  value: QuoteOwnerFilter;
  label: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'web', label: 'Website' },
  { value: 'walk_in', label: 'Walk in' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export function QuoteFilters({ ownerOptions, count }: { ownerOptions: OwnerOption[]; count?: string | undefined }) {
  return (
    <ListFilters
      searchLabel="Search quotes"
      searchPlaceholder="Name, phone or reference"
      count={count}
      filters={[
        ...(ownerOptions.length > 1
          ? [{ param: 'owner', label: 'Owner', options: ownerOptions, fallback: ownerOptions[0]?.value }]
          : []),
        { param: 'status', label: 'Status', options: STATUS_OPTIONS },
        { param: 'source', label: 'Source', options: SOURCE_OPTIONS },
      ]}
    />
  );
}
