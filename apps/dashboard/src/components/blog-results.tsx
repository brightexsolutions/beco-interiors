'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  DataTable,
  EmptyState,
  Icon,
  Pagination,
  StatusPill,
  buttonClasses,
  cn,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
import type { StaffBlogPost } from '@/lib/blog';

function EditAction({ href, name }: { href: string; name: string }) {
  return (
    <Link href={href} aria-label={`Edit ${name}`} className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}>
      <Icon name="pencil" />
      Edit
    </Link>
  );
}

const columns = (): DataTableColumn<StaffBlogPost>[] => [
  {
    key: 'title',
    header: 'Title',
    sortable: true,
    sortValue: (row) => row.title,
    render: (row) => <span className="font-semibold text-charcoal">{row.title}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <StatusPill label={row.status === 'published' ? 'Published' : 'Draft'} tone={row.status === 'published' ? 'positive' : 'neutral'} />
    ),
  },
  {
    key: 'term',
    header: 'Search term',
    render: (row) => row.targetTerm ?? '',
  },
  {
    key: 'updated',
    header: 'Updated',
    render: (row) => (
      <span className="tabular-nums">
        {new Date(row.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (row) => <EditAction href={`/studio/blog/${row.id}`} name={row.title} />,
  },
];

export function BlogResults({ posts }: { posts: StaffBlogPost[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(posts, requestedPage);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  if (posts.length === 0) {
    return (
      <EmptyState
        title="No articles here"
        description="Nothing matches this filter yet. Clear search, or write an article."
        fill
      />
    );
  }

  return (
    <>
      <div className="hidden min-w-0 lg:block">
        <DataTable caption={`${paged.total} articles`} columns={columns()} rows={paged.items} getRowKey={(row) => row.id} />
      </div>
      <ul className="grid min-w-0 grid-cols-1 gap-2 overflow-x-hidden lg:hidden">
        {paged.items.map((row) => (
          <li key={row.id}>
            <Link
              href={`/studio/blog/${row.id}`}
              aria-label={`Edit ${row.title}`}
              className="block min-w-0 overflow-hidden rounded-panel border border-neutral-200 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red"
            >
              <p className="font-semibold text-charcoal">{row.title}</p>
              <p className="mt-1 text-neutral-500">{row.status === 'published' ? 'Published' : 'Draft'}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        className="mt-4"
        page={paged.page}
        pageCount={paged.pageCount}
        from={paged.from}
        to={paged.to}
        total={paged.total}
        onPageChange={setPage}
      />
    </>
  );
}
