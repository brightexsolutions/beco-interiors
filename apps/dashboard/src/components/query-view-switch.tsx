'use client';

import { useOptimistic } from 'react';
import { SegmentedControl, type SegmentedOption } from '@beco/ui';
import { useQueryNavigation } from '@/lib/use-query-navigation';

/**
 * A screen's view held in `?view=`, D138 and D148: the catalogue's List or
 * Cards, the quotes' Table or Board. The first option is the default and
 * clears the param. Through the page's shared transition, so the switch
 * shows at once and the results dim while the new view loads, and a view is
 * a link that can be shared or bookmarked.
 */
export function QueryViewSwitch<T extends string>({
  view,
  options,
}: {
  view: T;
  options: ReadonlyArray<SegmentedOption<T>>;
}) {
  const { setParam } = useQueryNavigation();
  const [shown, show] = useOptimistic(view);
  const fallback = options[0]?.value;

  return (
    <SegmentedControl
      label="View"
      value={shown}
      compactOnPhone
      options={options}
      onChange={(next) => setParam('view', next === fallback ? '' : next, () => show(next))}
    />
  );
}
