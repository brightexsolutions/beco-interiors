'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useState, useTransition } from 'react';
import { Icon, Sheet, StatusPill, buttonClasses, cn } from '@beco/ui';
import { CategoryEditor } from '@/components/category-editor';
import { CategoryCreate } from '@/components/category-create';
import type { CategoryGroupRow, CategoryParentOption, CategoryRow } from '@/lib/categories';

/**
 * The ranges panel, folded into the catalogue rather than kept on its own
 * screen (D91 reversed, see docs/DECISIONS.md). A range is now a filter on
 * the product list below it, not a destination of its own: click a pill to
 * see what is filed under it, click its own small pencil to rename, publish
 * or delete it.
 *
 * Third iteration, all on Brown's own screenshots against the real taxonomy,
 * nine groups deep. First a group-per-row layout fixed chips blending into
 * each other, but pushed the actual product list most of a screen down.
 * Then a bordered "cluster" per group packed more onto a line, but read as
 * two different kinds of control, a heading-weight group name and a boxed
 * range chip, when Brown's own direction was one form throughout: every
 * range and group is now the same `RangePill`, same height, same shape, in
 * one flat wrapping row, ordered group name then its own ranges so adjacency
 * alone still reads as a taxonomy. Its own edit pencil sits inside the pill,
 * a narrow bordered-off segment rather than a separate floating button, and
 * is drawn small on purpose. The whole panel can also be collapsed via the
 * chevron beside "New range", so it costs nothing once a product manager
 * already knows the range they want and would rather see the product list.
 *
 * `range` and `newRange` are deliberately not `edit`/`new`: this page also
 * carries a product sheet at those exact param names, and the two sheets
 * must never both read the same key.
 */
export function CatalogueRanges({
  tree,
  groupOptions,
  editing,
  creating,
  selectedId,
}: {
  tree: CategoryGroupRow[];
  groupOptions: CategoryParentOption[];
  editing: CategoryRow | null;
  creating: boolean;
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(true);

  // On a phone the full range panel is a screen of chips before a single
  // product. Start it folded there; the heading names the active range.
  useEffect(() => {
    if (window.matchMedia?.('(max-width: 1023px)').matches) setExpanded(false);
  }, []);

  const activeName = selectedId
    ? (tree.flatMap((g) => [g, ...g.children]).find((c) => c.id === selectedId)?.name ?? null)
    : null;

  const withParam = (key: string, value: string | null, extraClear: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const clear of extraClear) params.delete(clear);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const filterTo = (id: string | null) => {
    startTransition(() => router.push(withParam('category', id, ['page'])));
  };

  const editHref = (id: string) => withParam('range', id, ['newRange']);
  const newHref = withParam('newRange', '1', ['range']);

  const closeSheet = () => {
    startTransition(() => router.push(withParam('range', null, ['newRange'])));
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
        <CategoryCreate groupOptions={groupOptions} returnTo={withParam('newRange', null)} />
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

  return (
    <section aria-labelledby="ranges-heading" className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="ranges-heading" className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="ranges-body"
            className="flex min-h-11 items-center gap-1.5 hover:text-charcoal"
          >
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} className="h-3.5 w-3.5" />
            Ranges
            {!expanded && activeName ? (
              <span className="ml-1 normal-case tracking-normal text-charcoal">: {activeName}</span>
            ) : null}
          </button>
        </h2>
        <Link href={newHref} className={buttonClasses({ variant: 'ghost' })}>
          <Icon name="plus" />
          New range
        </Link>
      </div>

      {expanded ? (
        <div id="ranges-body" className="rounded-panel border border-neutral-200 bg-high-vis-white p-3">
          {tree.length === 0 ? (
            <p className="px-1 py-1 font-ui text-base text-neutral-500">
              No ranges yet. Start with a group, like Sintered Stone.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 p-1">
              <RangePill label="All products" active={!selectedId} onClick={() => filterTo(null)} />
              {tree.map((group) => {
                // A group with ranges under it is never itself assignable
                // (see groupCategoryOptions), so its own count is always 0
                // and would read as "Sintered Stone, 0" beside 26 real
                // products right next to it. The sum of its own ranges is
                // what clicking the group's own pill actually filters to,
                // so it is the number that belongs here.
                const groupCount =
                  group.children.length > 0
                    ? group.children.reduce((sum, child) => sum + child.productCount, 0)
                    : group.productCount;
                return (
                  <Fragment key={group.id}>
                    <RangePill
                      label={group.name}
                      count={groupCount}
                      draft={!group.isPublished}
                      active={selectedId === group.id}
                      onClick={() => filterTo(group.id)}
                      editHref={editHref(group.id)}
                      editName={group.name}
                    />
                    {group.children.map((range) => (
                      <RangePill
                        key={range.id}
                        label={range.name}
                        count={range.productCount}
                        draft={!range.isPublished}
                        active={selectedId === range.id}
                        onClick={() => filterTo(range.id)}
                        editHref={editHref(range.id)}
                        editName={range.name}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      {sheet}
    </section>
  );
}

/**
 * Every range and group in the panel is this same pill: one height, one
 * shape. Its own edit pencil is a second, narrower control sharing the pill's
 * outline rather than a separate button beside it, so the pill reads as one
 * unit, not a chip plus a floating icon. "All products" has no `editHref`,
 * so it renders as a plain pill with no divider or pencil at all.
 */
function RangePill({
  label,
  count,
  draft,
  active,
  onClick,
  editHref,
  editName,
}: {
  label: string;
  count?: number | undefined;
  draft?: boolean | undefined;
  active: boolean;
  onClick: () => void;
  editHref?: string | undefined;
  editName?: string | undefined;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-11 shrink-0 items-stretch overflow-hidden rounded-button border transition-colors duration-200',
        active ? 'border-charcoal bg-charcoal text-high-vis-white' : 'border-neutral-300 bg-high-vis-white text-charcoal',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 font-ui text-sm font-semibold transition-colors duration-200',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-warm-red',
          !active && 'hover:bg-neutral-50',
        )}
      >
        {label}
        {count != null ? (
          <span className={cn('font-normal tabular-nums', active ? 'text-high-vis-white/70' : 'text-neutral-500')}>
            {count}
          </span>
        ) : null}
        {draft ? <StatusPill label="Draft" tone="muted" /> : null}
      </button>
      {editHref ? (
        <Link
          href={editHref}
          aria-label={`Edit ${editName}`}
          className={cn(
            'inline-flex w-8 shrink-0 items-center justify-center border-l transition-colors duration-200',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-warm-red',
            active ? 'border-white/20 hover:bg-white/10' : 'border-neutral-300 hover:bg-neutral-100',
          )}
        >
          <Icon name="pencil" className="h-3 w-3" />
        </Link>
      ) : null}
    </span>
  );
}
