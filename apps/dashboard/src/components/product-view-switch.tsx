'use client';

import type { CatalogueView } from '@/lib/catalogue-view';
import { QueryViewSwitch } from './query-view-switch';

/**
 * List or cards, D138. The list is the scanning table (and rows on a phone);
 * cards lead with the photograph and a line of detail, for checking what a
 * product looks like rather than what it costs.
 */
export function ProductViewSwitch({ view }: { view: CatalogueView }) {
  return (
    <QueryViewSwitch
      view={view}
      options={[
        { value: 'list', label: 'List', icon: 'rows' },
        { value: 'cards', label: 'Cards', icon: 'grid' },
      ]}
    />
  );
}
