'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
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
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
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
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const sheet = (
    <Sheet
      open={Boolean(viewing)}
      onOpenChange={(open) => !open && startTransition(() => router.push(withParam('row', null)))}
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
        <EmptyState title="No audit rows" description="Nothing matches this filter yet." fill />
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
      <ul className="grid min-w-0 grid-cols-1 gap-2 overflow-x-hidden xl:hidden">
        {paged.items.map((row) => (
          <li key={row.id}>
            <Link
              href={withParam('row', row.id)}
              aria-label={`View ${formatAuditTitle(row.action, row.entityType)}`}
              className="block min-w-0 overflow-hidden rounded-panel border border-neutral-200 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red"
            >
              <p className="font-semibold text-charcoal">
                {formatAuditTitle(row.action, row.entityType)}
              </p>
              <p className="mt-1 text-neutral-500">
                {row.actor ?? 'System'} · {formatAuditWhen(row.createdAt)}
              </p>
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
      {sheet}
    </>
  );
}
