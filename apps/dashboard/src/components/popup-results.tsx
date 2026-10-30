'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DataTable,
  EmptyState,
  Icon,
  Sheet,
  StatusPill,
  buttonClasses,
  cn,
  type DataTableColumn,
} from '@beco/ui';
import { PopupEditor } from '@/components/popup-editor';
import { BusyRegion, ListRowLink, ListRows } from '@/components/list-rows';
import { useQueryNavigation } from '@/lib/use-query-navigation';
import { useSheetOpen } from '@/lib/use-sheet-open';
import { ANNOUNCEMENT_WINDOW_LABEL, formatAnnouncementWhen } from '@/lib/announcements';
import {
  POPUP_VARIANT_LABEL,
  describeTrigger,
  popupWindow,
  type PopupStone,
  type StaffPopup,
} from '@/lib/popups';

const windowTone = (value: ReturnType<typeof popupWindow>) => {
  if (value === 'live') return 'positive' as const;
  if (value === 'scheduled') return 'neutral' as const;
  return 'muted' as const;
};

const columns = (editHref: (id: string) => string): DataTableColumn<StaffPopup>[] => [
  {
    key: 'title',
    header: 'Headline',
    render: (row) => <span className="font-semibold text-charcoal">{row.title}</span>,
  },
  { key: 'variant', header: 'Look', render: (row) => POPUP_VARIANT_LABEL[row.variant] },
  { key: 'trigger', header: 'Opens', render: (row) => describeTrigger(row) },
  {
    key: 'dates',
    header: 'Dates',
    render: (row) => (
      <span className="tabular-nums">
        {formatAnnouncementWhen(row.startsAt)} to {formatAnnouncementWhen(row.endsAt)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => {
      const value = popupWindow(row);
      return <StatusPill label={ANNOUNCEMENT_WINDOW_LABEL[value]} tone={windowTone(value)} />;
    },
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (row) => (
      <Link
        href={editHref(row.id)}
        aria-label={`Edit ${row.title}`}
        className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}
      >
        <Icon name="pencil" />
        Edit
      </Link>
    ),
  },
];

export function PopupResults({
  popups,
  stones,
  editing,
  creating,
}: {
  popups: StaffPopup[];
  stones: PopupStone[];
  editing: StaffPopup | null;
  creating: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParams, navigate, isPending } = useQueryNavigation();

  const withParam = (key: string, value: string | null, extraClear: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const clear of extraClear) params.delete(clear);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const editHref = (id: string) => withParam('edit', id, ['new']);

  // Shut at once on Close, the backdrop or Escape; the URL settles behind it. D157.
  const [sheetShown, dismissSheet] = useSheetOpen(Boolean(editing) || creating);
  const closeSheet = () => {
    navigate(() => {
      dismissSheet();
      return router.push(withParam('edit', null, ['new']));
    });
  };

  const sheet = (
    <Sheet
      open={sheetShown}
      onOpenChange={(open) => !open && closeSheet()}
      title={creating ? 'New pop up' : (editing?.title ?? 'Pop up')}
    >
      {creating ? (
        <PopupEditor popup={null} stones={stones} />
      ) : editing ? (
        <PopupEditor key={editing.id} popup={editing} stones={stones} />
      ) : null}
    </Sheet>
  );

  if (popups.length === 0) {
    return (
      <>
        <BusyRegion busy={isPending}>
          <EmptyState title="No pop ups yet" description="Create one to promote an offer on the site." fill />
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
          caption={`${popups.length} pop ups`}
          columns={columns(editHref)}
          rows={popups}
          getRowKey={(row) => row.id}
        />
      </div>
      <ListRows busy={isPending} label="Pop ups" className="border-b border-neutral-200">
        {popups.map((row) => (
          <ListRowLink key={row.id} href={editHref(row.id)} label={`Edit ${row.title}`}>
            <p className="font-ui text-base font-semibold text-charcoal [overflow-wrap:anywhere]">{row.title}</p>
            <p className="mt-1 font-ui text-base text-neutral-500">
              {POPUP_VARIANT_LABEL[row.variant]} · {describeTrigger(row)} ·{' '}
              {ANNOUNCEMENT_WINDOW_LABEL[popupWindow(row)]}
            </p>
          </ListRowLink>
        ))}
      </ListRows>
      {sheet}
    </>
  );
}
