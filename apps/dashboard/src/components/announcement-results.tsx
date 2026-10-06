'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DataTable,
  EmptyState,
  Icon,
  Pagination,
  Sheet,
  StatusPill,
  buttonClasses,
  cn,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
import { AnnouncementEditor } from '@/components/announcement-editor';
import { BusyRegion, ListRowLink, ListRows } from '@/components/list-rows';
import { useQueryNavigation } from '@/lib/use-query-navigation';
import {
  ANNOUNCEMENT_TYPE_LABEL,
  ANNOUNCEMENT_WINDOW_LABEL,
  announcementWindow,
  formatAnnouncementWhen,
  type StaffAnnouncement,
} from '@/lib/announcements';

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

const windowTone = (value: ReturnType<typeof announcementWindow>) => {
  if (value === 'live') return 'positive' as const;
  if (value === 'scheduled') return 'neutral' as const;
  return 'muted' as const;
};

const desktopColumns = (editHref: (id: string) => string): DataTableColumn<StaffAnnouncement>[] => [
  {
    key: 'title',
    header: 'Title',
    sortable: true,
    sortValue: (row) => row.title,
    render: (row) => <span className="font-semibold text-charcoal">{row.title}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    render: (row) => ANNOUNCEMENT_TYPE_LABEL[row.type],
  },
  {
    key: 'window',
    header: 'Dates',
    render: (row) => (
      <span className="tabular-nums">
        {formatAnnouncementWhen(row.startsAt)} to {formatAnnouncementWhen(row.endsAt)}
      </span>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.priority,
    render: (row) => <span className="tabular-nums">{row.priority}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => {
      const value = announcementWindow(row);
      return <StatusPill label={ANNOUNCEMENT_WINDOW_LABEL[value]} tone={windowTone(value)} />;
    },
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (row) => <EditAction href={editHref(row.id)} name={row.title} />,
  },
];

function AnnouncementRow({ row, href }: { row: StaffAnnouncement; href: string }) {
  const value = announcementWindow(row);
  return (
    <ListRowLink href={href} label={`Edit ${row.title}`}>
      <p className="font-ui text-base font-semibold text-charcoal [overflow-wrap:anywhere]">{row.title}</p>
      <p className="mt-1 font-ui text-base text-neutral-500">
        {ANNOUNCEMENT_TYPE_LABEL[row.type]} · {ANNOUNCEMENT_WINDOW_LABEL[value]}
      </p>
    </ListRowLink>
  );
}

export function AnnouncementResults({
  announcements,
  editing,
  creating,
}: {
  announcements: StaffAnnouncement[];
  editing: StaffAnnouncement | null;
  creating: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Shared with the filter row (D117), so a filter change dims the list.
  const { searchParams, navigate, isPending } = useQueryNavigation();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(announcements, requestedPage);

  const withParam = (key: string, value: string | null, extraClear: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const clear of extraClear) params.delete(clear);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const editHref = (id: string) => withParam('edit', id, ['new']);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    navigate(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const closeSheet = () => {
    navigate(() => router.push(withParam('edit', null, ['new'])));
  };

  const sheetOpen = Boolean(editing) || creating;
  const sheetTitle = creating ? 'New announcement' : (editing?.title ?? 'Announcement');

  const sheet = (
    <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()} title={sheetTitle}>
      {creating ? (
        <AnnouncementEditor announcement={null} />
      ) : editing ? (
        <AnnouncementEditor key={editing.id} announcement={editing} />
      ) : null}
    </Sheet>
  );

  if (announcements.length === 0) {
    return (
      <>
        <BusyRegion busy={isPending}>
          <EmptyState
            title="No announcements here"
            description="Nothing matches this filter yet. Clear search, or create an announcement."
            fill
          />
        </BusyRegion>
        {sheet}
      </>
    );
  }

  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <DataTable
          busy={isPending}
          caption={`${paged.total} announcements`}
          columns={desktopColumns(editHref)}
          rows={paged.items}
          getRowKey={(row) => row.id}
        />
      </div>

      <ListRows busy={isPending} label="Announcements" className="border-y border-neutral-200">
        {paged.items.map((row) => (
          <AnnouncementRow key={row.id} row={row} href={editHref(row.id)} />
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

      {sheet}
    </>
  );
}
