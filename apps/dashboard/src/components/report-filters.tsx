'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, Dialog, Input, Select, buttonClasses } from '@beco/ui';
import { PdfPreview } from '@/components/pdf-preview';
import { nairobiMonthStart, nairobiYmd, periodDisplayLabel } from '@/lib/reports';

export type ReportPersonOption = { id: string; name: string };

function reportPdfHref(
  period: string,
  personId: string,
  download = false,
  from?: string | null,
  to?: string | null,
) {
  const params = new URLSearchParams();
  if (period === 'custom') {
    params.set('period', 'custom');
    params.set('from', from || nairobiMonthStart());
    params.set('to', to || nairobiYmd());
  } else if (period !== 'this_month') {
    params.set('period', period);
  }
  if (personId) params.set('person', personId);
  if (download) params.set('download', '1');
  const query = params.toString();
  return query ? `/reports/pdf?${query}` : '/reports/pdf';
}

/**
 * Period and sales-review PDF for the reports screen. Live in the page
 * heading's actions slot. Custom writes start and end dates into the URL.
 * View opens the document first. The dialog picks the overall review or
 * one salesperson, then Download is that same file.
 */
export function ReportFilters({ people = [] }: { people?: readonly ReportPersonOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const period = searchParams.get('period') ?? 'this_month';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const personId = searchParams.get('person') ?? '';
  const [open, setOpen] = useState(false);
  const rangeFrom = period === 'custom' ? from || nairobiMonthStart() : from;
  const rangeTo = period === 'custom' ? to || nairobiYmd() : to;
  const previewHref = reportPdfHref(period, personId, false, rangeFrom, rangeTo);
  const downloadHref = reportPdfHref(period, personId, true, rangeFrom, rangeTo);
  const personName = people.find((row) => row.id === personId)?.name;
  const when = periodDisplayLabel(period, rangeFrom, rangeTo);
  const title = personName ? `Salesperson review, ${personName}, ${when}` : `Overall sales review, ${when}`;

  const writeParams = (next: { period?: string; from?: string; to?: string; person?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextPeriod = next.period ?? period;
    let nextFrom = next.from !== undefined ? next.from : from;
    let nextTo = next.to !== undefined ? next.to : to;
    const nextPerson = next.person !== undefined ? next.person : personId;

    if (nextPeriod === 'custom') {
      nextFrom = nextFrom || nairobiMonthStart();
      nextTo = nextTo || nairobiYmd();
      if (nextFrom > nextTo) {
        if (next.from !== undefined) nextTo = nextFrom;
        else nextFrom = nextTo;
      }
      params.set('period', 'custom');
      params.set('from', nextFrom);
      params.set('to', nextTo);
    } else {
      if (nextPeriod === 'this_month') params.delete('period');
      else params.set('period', nextPeriod);
      params.delete('from');
      params.delete('to');
    }
    if (!nextPerson) params.delete('person');
    else params.set('person', nextPerson);
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label className="flex items-center gap-3">
        <span className="sr-only font-ui text-sm font-semibold text-charcoal sm:not-sr-only">Period</span>
        <span className="block w-36 shrink-0 sm:w-40">
          <Select
            value={period === 'custom' || period === 'last_month' ? period : 'this_month'}
            onChange={(event) => writeParams({ period: event.target.value })}
            aria-label="Filter by period"
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="custom">Custom</option>
          </Select>
        </span>
      </label>
      {period === 'custom' ? (
        <>
          <label className="block w-[9.75rem] shrink-0">
            <span className="sr-only">Start date</span>
            <Input
              type="date"
              value={rangeFrom}
              max={rangeTo}
              onChange={(event) => writeParams({ from: event.target.value })}
              aria-label="Start date"
            />
          </label>
          <label className="block w-[9.75rem] shrink-0">
            <span className="sr-only">End date</span>
            <Input
              type="date"
              value={rangeTo}
              min={rangeFrom}
              onChange={(event) => writeParams({ to: event.target.value })}
              aria-label="End date"
            />
          </label>
        </>
      ) : null}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label="View sales review PDF"
        className="h-11 shrink-0 px-3 py-0"
      >
        <span className="sm:hidden">PDF</span>
        <span className="hidden sm:inline">View PDF</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen} title={title} className="max-w-5xl">
        <div className="relative min-h-0 flex-1 bg-neutral-100">
          <PdfPreview
            src={previewHref}
            title={`${title} PDF`}
            loadingLabel="Loading sales review PDF"
            fallbackError="Could not open the sales review PDF."
          />
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-high-vis-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="grid min-w-0 gap-1 sm:max-w-xs">
              <span className="font-ui text-sm font-semibold text-charcoal">Review</span>
              <Select
                value={personId}
                onChange={(event) => writeParams({ person: event.target.value })}
                aria-label="Review overall or one salesperson"
              >
                <option value="">Overall</option>
                {people.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </label>
            <a href={downloadHref} className={buttonClasses({ variant: 'outline' })}>
              Download
            </a>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
