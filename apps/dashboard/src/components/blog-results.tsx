'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { BusyRegion, ListRowLink, ListRows } from '@/components/list-rows';
import { useQueryNavigation } from '@/lib/use-query-navigation';
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
  // Shared with the filter row (D117), so a filter change dims the list.
  const { searchParams, navigate, isPending } = useQueryNavigation();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(posts, requestedPage);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    navigate(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  if (posts.length === 0) {
    return (
      <BusyRegion busy={isPending}>
        <EmptyState
          title="No articles here"
          description="Nothing matches this filter yet. Clear search, or write an article."
          fill
        />
      </BusyRegion>
    );
  }

  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <DataTable
          caption={`${paged.total} articles`}
          columns={columns()}
          rows={paged.items}
          getRowKey={(row) => row.id}
          busy={isPending}
        />
      </div>
      <ListRows busy={isPending} label="Articles" className="border-y border-neutral-200">
        {paged.items.map((row) => (
          <ListRowLink key={row.id} href={`/studio/blog/${row.id}`} label={`Edit ${row.title}`}>
            <p className="font-ui text-base font-semibold text-charcoal [overflow-wrap:anywhere]">{row.title}</p>
            <p className="mt-1 font-ui text-base text-neutral-500">{row.status === 'published' ? 'Published' : 'Draft'}</p>
          </ListRowLink>
        ))}
      </ListRows>
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
