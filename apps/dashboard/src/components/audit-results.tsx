'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DataTable,
  EmptyState,
  FormSection,
  Icon,
  Pagination,
  Sheet,
  buttonClasses,
  cn,
  paginate,
  type DataTableColumn,
} from '@beco/ui';
import { BusyRegion, ListRowLink, ListRows } from '@/components/list-rows';
import { useQueryNavigation } from '@/lib/use-query-navigation';
import {
  formatAuditAction,
  formatAuditFields,
  formatAuditTitle,
  formatAuditWhen,
  humanizeAuditKey,
  type AuditRow,
} from '@/lib/audit';

function ViewAction({ href, name }: { href: string; name: string }) {
  return (
    <Link href={href} aria-label={`View ${name}`} className={cn(buttonClasses({ variant: 'ghost' }), 'h-11 px-3 py-0')}>
      <Icon name="arrow-right" />
      View
    </Link>
  );
}

const columns = (href: (id: string) => string): DataTableColumn<AuditRow>[] => [
  {
    key: 'when',
    header: 'When',
    render: (row) => <span className="tabular-nums">{formatAuditWhen(row.createdAt)}</span>,
  },
  {
    key: 'actor',
    header: 'Who',
    render: (row) => row.actor ?? 'System',
  },
  {
    key: 'action',
    header: 'Action',
    render: (row) => formatAuditAction(row.action),
  },
  {
    key: 'entity',
    header: 'Entity',
    render: (row) => humanizeAuditKey(row.entityType),
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (row) => <ViewAction href={href(row.id)} name={formatAuditTitle(row.action, row.entityType)} />,
  },
];

function AuditFields({ title, value }: { title: string; value: unknown }) {
  const fields = formatAuditFields(value);
  return (
    <FormSection title={title}>
      {value == null || fields.length === 0 ? (
        <p className="font-ui text-base text-neutral-500">None</p>
      ) : (
        <dl className="space-y-3">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {field.label}
              </dt>
              <dd className="mt-1 font-ui text-base text-charcoal">{field.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </FormSection>
  );
}

export function AuditResults({ rows, viewing }: { rows: AuditRow[]; viewing: AuditRow | null }) {
  const router = useRouter();
  const pathname = usePathname();
  // Shared with the filter row (D117), so a filter change dims the list.
  const { searchParams, navigate, isPending } = useQueryNavigation();
  const requestedPage = Number(searchParams.get('page') ?? 1);
  const paged = paginate(rows, requestedPage);

  const withParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    navigate(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const sheet = (
    <Sheet
      open={Boolean(viewing)}
      onOpenChange={(open) => !open && navigate(() => router.push(withParam('row', null)))}
      title={viewing ? formatAuditTitle(viewing.action, viewing.entityType) : 'Audit'}
    >
      {viewing ? (
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-5">
          <p className="font-ui text-base text-neutral-500">
            {viewing.actor ?? 'System'} · {formatAuditWhen(viewing.createdAt)}
          </p>
          <AuditFields title="Before" value={viewing.before} />
          <AuditFields title="After" value={viewing.after} />
        </div>
      ) : null}
    </Sheet>
  );

  if (rows.length === 0) {
    return (
      <>
        <BusyRegion busy={isPending}>
          <EmptyState title="No audit rows" description="Nothing matches this filter yet." fill />
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
          caption={`${paged.total} events`}
          columns={columns((id) => withParam('row', id))}
          rows={paged.items}
          getRowKey={(row) => row.id}
        />
      </div>
      <ListRows busy={isPending} label="Audit events" className="border-y border-neutral-200">
        {paged.items.map((row) => (
          <ListRowLink
            key={row.id}
            href={withParam('row', row.id)}
            label={`View ${formatAuditTitle(row.action, row.entityType)}`}
          >
            <p className="font-ui text-base font-semibold text-charcoal">{formatAuditTitle(row.action, row.entityType)}</p>
            <p className="mt-1 font-ui text-base text-neutral-500">
              {row.actor ?? 'System'} · {formatAuditWhen(row.createdAt)}
            </p>
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
      {sheet}
    </>
  );
}
