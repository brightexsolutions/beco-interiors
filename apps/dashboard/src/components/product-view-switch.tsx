'use client';

import { useOptimistic } from 'react';
import { Icon, cn } from '@beco/ui';
import { useQueryNavigation } from '@/lib/use-query-navigation';

export type CatalogueView = 'list' | 'cards';

export const parseCatalogueView = (raw: string | undefined): CatalogueView => (raw === 'cards' ? 'cards' : 'list');

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

  const option = (value: CatalogueView, label: string, icon: 'rows' | 'grid') => {
    const active = shown === value;
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={label}
        onClick={() => choose(value)}
        className={cn(
          'inline-flex h-11 min-w-11 items-center justify-center gap-2 px-3 font-ui text-sm font-semibold transition-colors',
          active ? 'bg-charcoal text-high-vis-white' : 'text-neutral-700 hover:bg-neutral-100 hover:text-charcoal',
        )}
      >
        <Icon name={icon} className="h-[1.1rem] w-[1.1rem]" />
        <span aria-hidden className="hidden sm:inline">{label}</span>
      </button>
    );
  };

  return (
    <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-control border border-neutral-300">
      {option('list', 'List', 'rows')}
      <span aria-hidden className="w-px bg-neutral-300" />
      {option('cards', 'Cards', 'grid')}
    </div>
  );
}
