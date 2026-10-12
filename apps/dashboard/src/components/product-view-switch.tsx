'use client';

import { useOptimistic } from 'react';
import { SegmentedControl } from '@beco/ui';
import type { CatalogueView } from '@/lib/catalogue-view';
import { useQueryNavigation } from '@/lib/use-query-navigation';

/**
 * List or cards, D138. The list is the scanning table (and rows on a phone);
 * cards lead with the photograph and a line of detail, for checking what a
 * product looks like rather than what it costs. The choice is a URL param
 * through the page's shared transition, so the switch shows at once and the
 * grid dims while the new page loads, and a view is a link that can be
 * shared or bookmarked.
 */
export function ProductViewSwitch({ view }: { view: CatalogueView }) {
  const { setParam } = useQueryNavigation();
  const [shown, show] = useOptimistic(view);

  const choose = (next: CatalogueView) => {
    if (next === shown) return;
    setParam('view', next === 'cards' ? 'cards' : '', () => show(next));
  };

  return (
    <SegmentedControl
      label="View"
      value={shown}
      onChange={choose}
      compactOnPhone
      options={[
        { value: 'list', label: 'List', icon: 'rows' },
        { value: 'cards', label: 'Cards', icon: 'grid' },
      ]}
    />
  );
}
