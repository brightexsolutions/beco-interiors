'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Icon, Panel, Sheet, StatusPill, buttonClasses, cn } from '@beco/ui';
import { CategoryEditor } from '@/components/category-editor';
import { CategoryCreate } from '@/components/category-create';
import type { CategoryGroupRow, CategoryParentOption, CategoryRow } from '@/lib/categories';

function EditAction({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      aria-label={`Edit ${name}`}
      className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
    >
      <Icon name="pencil" />
      Edit
    </Link>
  );
}

function RangeRow({ range, editHref }: { range: CategoryRow; editHref: (id: string) => string }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 first:border-t-0 sm:px-5">
      <div className="min-w-0">
        <p className="min-w-0 truncate font-ui text-base font-semibold text-charcoal">{range.name}</p>
        <p className="min-w-0 truncate font-ui text-sm text-neutral-500">
          /shop/{range.slug} · {range.productCount} {range.productCount === 1 ? 'product' : 'products'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {range.isPublished ? (
          <StatusPill label="Published" tone="positive" />
        ) : (
          <StatusPill label="Draft" tone="muted" />
        )}
        <EditAction href={editHref(range.id)} name={range.name} />
      </div>
    </li>
  );
}

export function CategoryTree({
  tree,
  editing,
  creating,
  groupOptions,
}: {
  tree: CategoryGroupRow[];
  editing: CategoryRow | null;
  creating: boolean;
  groupOptions: CategoryParentOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const withParam = (key: string, value: string | null, extraClear: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const clear of extraClear) params.delete(clear);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const editHref = (id: string) => withParam('edit', id, ['new']);

  const closeSheet = () => {
    startTransition(() => router.push(withParam('edit', null, ['new'])));
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
        <CategoryCreate groupOptions={groupOptions} returnTo={withParam('new', null)} />
      ) : editing ? (
        <CategoryEditor
          key={`${editing.id}-${editing.updatedAt}`}
          category={editing}
          groupOptions={groupOptions.filter((option) => option.id !== editing.id)}
          onDeleted={closeSheet}
        />
      ) : null}
    </Sheet>
  );

  return (
    <>
      <div className="grid min-w-0 gap-4">
        {tree.map((group) => (
          <Panel
            key={group.id}
            title={
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="min-w-0 truncate font-ui text-lg font-semibold text-charcoal">{group.name}</p>
                {group.isPublished ? (
                  <StatusPill label="Published" tone="positive" />
                ) : (
                  <StatusPill label="Draft" tone="muted" />
                )}
              </div>
            }
            action={<EditAction href={editHref(group.id)} name={group.name} />}
          >
            {group.children.length === 0 ? (
              <p className="px-4 py-4 font-ui text-base text-neutral-500 sm:px-5">
                No ranges filed under this group yet.
              </p>
            ) : (
              <ul>
                {group.children.map((range) => (
                  <RangeRow key={range.id} range={range} editHref={editHref} />
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
      {sheet}
    </>
  );
}
