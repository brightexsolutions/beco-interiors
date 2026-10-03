'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Icon, Sheet, buttonClasses, cn } from '@beco/ui';
import { CategoryEditor } from '@/components/category-editor';
import { CategoryCreate } from '@/components/category-create';
import { flattenCategoryTree, subtreeProductCount, type CategoryGroupRow, type CategoryParentOption, type CategoryRow } from '@/lib/categories';

/**
 * The range browser (D114): one level at a time, the way a folder opens.
 *
 * The first row is the major categories, Sintered Stone, Handles, Wall
 * Panels. Choose one and its ranges appear on a second row under it; choose
 * a range with sub ranges and a third row appears. Every pill filters the
 * product list below to its whole subtree and carries that count. The row a
 * reader is not inside is not drawn, so the screen never shows all nine
 * groups and their twenty ranges at once, which is what made the earlier
 * flat strip read as a wall.
 *
 * Editing lives on the selection, not on every pill: the line under the rows
 * names where you are, "Sintered Stone / 12mm Sintered Stones, 24 products",
 * with Edit and Add a range beside it. New category sits in the heading.
 *
 * `range`, `newRange` and `parent` are deliberately not `edit`/`new`: this
 * page also carries a product sheet at those exact param names, and the two
 * sheets must never both read the same key.
 */
export function CatalogueRanges({
  tree,
  groupOptions,
  editing,
  creating,
  selectedId,
  createParentId = null,
}: {
  tree: CategoryGroupRow[];
  groupOptions: CategoryParentOption[];
  editing: CategoryRow | null;
  creating: boolean;
  selectedId: string | null;
  /** Where a new range is filed by default, from `?parent=`. */
  createParentId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const all = flattenCategoryTree(tree);
  const byId = new Map(all.map((node) => [node.id, node]));
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  // The path from the major category down to the selection, so each row
  // knows which of its pills is open.
  const path: CategoryGroupRow[] = [];
  for (let node = selected; node; node = node.parentId ? (byId.get(node.parentId) ?? null) : null) path.unshift(node);
  const rows: { parent: CategoryGroupRow | null; nodes: CategoryGroupRow[] }[] = [{ parent: null, nodes: tree }];
  for (const node of path) if (node.children.length > 0) rows.push({ parent: node, nodes: node.children });

  const withParam = (set: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(set)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const filterTo = (id: string | null) => {
    startTransition(() => router.push(withParam({ category: id, page: null })));
  };

  const editHref = (id: string) => withParam({ range: id, newRange: null, parent: null });
  const newHref = (parentId: string | null) => withParam({ newRange: '1', parent: parentId, range: null });
  const closeSheet = () => {
    startTransition(() => router.push(withParam({ range: null, newRange: null, parent: null })));
  };

  const sheetOpen = Boolean(editing) || creating;
  const sheetTitle = creating ? 'New range' : (editing?.name ?? 'Range');
  const sheetDescription = creating
    ? 'Draft, hidden from the shop until published.'
    : editing?.isPublished
      ? 'On the website'
      : 'Draft, hidden on the website';

  const sheet = (
    <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()} title={sheetTitle} description={sheetDescription}>
      {creating ? (
        <CategoryCreate groupOptions={groupOptions} defaultParentId={createParentId} returnTo={withParam({ newRange: null, parent: null })} />
      ) : editing ? (
        <CategoryEditor
          key={`${editing.id}-${editing.updatedAt}`}
          category={editing}
          groupOptions={groupOptions.filter((option) => option.id !== editing.id)}
          onSaved={closeSheet}
          onDeleted={closeSheet}
        />
      ) : null}
    </Sheet>
  );

  const total = tree.reduce((sum, node) => sum + subtreeProductCount(node), 0);
  const levelName = (depth: number) => (depth === 1 ? 'category' : depth === 2 ? 'range' : 'sub range');

  return (
    <section aria-labelledby="ranges-heading" className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="ranges-heading" className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Browse
        </h2>
        <Link href={newHref(null)} className={buttonClasses({ variant: 'ghost' })}>
          <Icon name="plus" />
          New category
        </Link>
      </div>

      {tree.length === 0 ? (
        <div className="rounded-panel border border-neutral-200 bg-high-vis-white p-4">
          <p className="font-ui text-base text-neutral-500">No ranges yet. Start with a major category, like Sintered Stone.</p>
        </div>
      ) : (
        <div className="rounded-panel border border-neutral-200 bg-high-vis-white">
          {rows.map(({ parent, nodes }, index) => (
            <div
              key={parent?.id ?? 'root'}
              role="group"
              aria-label={parent ? `Ranges in ${parent.name}` : 'Categories'}
              className={cn('flex flex-wrap items-center gap-2 p-3', index > 0 && 'border-t border-neutral-200 bg-neutral-50')}
            >
              {index > 0 ? (
                <span aria-hidden className="mr-1 font-ui text-sm text-neutral-400">
                  in {parent!.name}
                </span>
              ) : null}
              <RangePill
                label={parent ? 'All' : 'All products'}
                count={parent ? subtreeProductCount(parent) : total}
                active={(parent?.id ?? null) === (selected?.id ?? null)}
                onClick={() => filterTo(parent?.id ?? null)}
              />
              {nodes.map((node) => (
                <RangePill
                  key={node.id}
                  label={node.name}
                  count={subtreeProductCount(node)}
                  draft={!node.isPublished}
                  active={path.some((p) => p.id === node.id)}
                  onClick={() => filterTo(node.id)}
                />
              ))}
            </div>
          ))}

          {/* Where you are, and what you can do to it. */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-neutral-200 px-4 py-2.5">
            <p className="min-w-0 font-ui text-sm text-neutral-500">
              {selected ? (
                <>
                  {path.map((node, i) => (
                    <span key={node.id}>
                      {i > 0 ? <span aria-hidden className="mx-1.5 text-neutral-300">/</span> : null}
                      <span className={cn(i === path.length - 1 && 'font-semibold text-charcoal')}>{node.name}</span>
                    </span>
                  ))}
                  <span className="ml-2 tabular-nums">
                    {subtreeProductCount(selected)} {subtreeProductCount(selected) === 1 ? 'product' : 'products'}
                  </span>
                  {!selected.isPublished ? <span className="ml-2 text-neutral-400">Draft</span> : null}
                </>
              ) : (
                <>Every range, {total} {total === 1 ? 'product' : 'products'}</>
              )}
            </p>
            {selected ? (
              <span className="flex shrink-0 items-center gap-1">
                <Link href={editHref(selected.id)} aria-label={`Edit ${selected.name}`} className={cn(buttonClasses({ variant: 'ghost' }), 'h-10 px-3 py-0')}>
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                  Edit {levelName(selected.depth)}
                </Link>
                {selected.depth < 3 ? (
                  <Link href={newHref(selected.id)} aria-label={`Add a range under ${selected.name}`} className={cn(buttonClasses({ variant: 'ghost' }), 'h-10 px-3 py-0')}>
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    Add {selected.depth === 1 ? 'range' : 'sub range'}
                  </Link>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      )}
      {sheet}
    </section>
  );
}

/** One pill for every level: same height, same shape. The open one is charcoal. */
function RangePill({
  label,
  count,
  draft,
  active,
  onClick,
}: {
  label: string;
  count?: number | undefined;
  draft?: boolean | undefined;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-button border px-3.5 font-ui text-sm font-semibold transition-colors duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red',
        active
          ? 'border-charcoal bg-charcoal text-high-vis-white'
          : draft
            ? 'border-dashed border-neutral-300 bg-high-vis-white text-neutral-500 hover:border-charcoal hover:text-charcoal'
            : 'border-neutral-300 bg-high-vis-white text-charcoal hover:border-charcoal',
      )}
    >
      {label}
      {count != null ? (
        <span className={cn('font-normal tabular-nums', active ? 'text-high-vis-white/70' : 'text-neutral-500')}>{count}</span>
      ) : null}
      {draft ? <span className="sr-only">, draft</span> : null}
    </button>
  );
}
