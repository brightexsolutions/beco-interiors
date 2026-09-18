'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Select, buttonClasses } from '@beco/ui';

/**
 * Period and PDF download for the reports screen. Live in the page heading's
 * actions slot, so they sit on the title row, to the right of Reports.
 */
export function ReportFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const period = searchParams.get('period') ?? 'this_month';

  const setPeriod = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'this_month') params.delete('period');
    else params.set('period', value);
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const pdfParams = new URLSearchParams();
  if (period !== 'this_month') pdfParams.set('period', period);
  const pdfHref = pdfParams.size > 0 ? `/reports/pdf?${pdfParams}` : '/reports/pdf';

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-3">
        <span className="sr-only font-ui text-sm font-semibold text-charcoal sm:not-sr-only">Period</span>
        <span className="block w-28 shrink-0 sm:w-44">
          <Select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Filter by period"
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
          </Select>
        </span>
      </label>
      <a
        href={pdfHref}
        aria-label="Download sales review PDF"
        className={buttonClasses({ variant: 'outline' })}
      >
        <span className="sm:hidden">PDF</span>
        <span className="hidden sm:inline">Download PDF</span>
      </a>
    </div>
  );
}
