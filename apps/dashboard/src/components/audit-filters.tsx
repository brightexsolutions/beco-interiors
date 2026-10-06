'use client';

import { ListFilters } from '@/components/list-filters';
import { AUDIT_ACTIONS } from '@/lib/audit';

const ENTITIES = ['quotes', 'orders', 'products', 'users', 'settings', 'blog_posts', 'announcements'];

const ENTITY_OPTIONS = [{ value: '', label: 'Any' }, ...ENTITIES.map((value) => ({ value, label: value }))];
const ACTION_OPTIONS = [{ value: '', label: 'Any' }, ...AUDIT_ACTIONS.map((value) => ({ value, label: value }))];

export function AuditFilters({ count }: { count?: string | undefined } = {}) {
  return (
    <ListFilters
      searchLabel="Search entity"
      searchPlaceholder="Search entity"
      count={count}
      filters={[
        { param: 'entity', label: 'Entity', options: ENTITY_OPTIONS },
        { param: 'action', label: 'Action', options: ACTION_OPTIONS },
      ]}
    />
  );
}
