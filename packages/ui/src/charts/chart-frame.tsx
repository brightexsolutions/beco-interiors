'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ChartSeries {
  key: string;
  label: string;
  /** Series colour, from the chart theme, so the legend swatch matches the mark. */
  color: string;
  format?: ((value: number) => string) | undefined;
}

/**
 * The frame every chart shares: a heading in text tokens, a legend when
 * there are two or more series, the plot, and a table of the same figures
 * for a reader who cannot or would rather not read the plot. The table is
 * visually hidden, never absent.
 */
export function ChartFrame({
  title,
  description,
  series,
  rows,
  rowLabel,
  children,
  className,
}: {
  title: string;
  description?: string | undefined;
  series: ChartSeries[];
  /** The plotted rows, for the table. */
  rows: Array<Record<string, string | number>>;
  /** Which key names a row. */
  rowLabel: string;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <figure className={cn('min-w-0', className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">{title}</p>
          {description ? <p className="mt-0.5 font-ui text-sm text-neutral-500">{description}</p> : null}
        </div>
        {series.length > 1 ? (
          <ul aria-label="Series" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {series.map((item) => (
              <li key={item.key} className="inline-flex items-center gap-1.5 font-ui text-sm text-neutral-700">
                <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[1px]" style={{ backgroundColor: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}
      </figcaption>
      <div className="mt-3">{children}</div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{rowLabel}</th>
            {series.map((item) => (
              <th key={item.key} scope="col">{item.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${String(row[rowLabel] ?? index)}-${index}`}>
              <th scope="row">{String(row[rowLabel] ?? '')}</th>
              {series.map((item) => {
                const value = row[item.key];
                return <td key={item.key}>{typeof value === 'number' ? (item.format ?? String)(value) : String(value ?? '')}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** A tooltip in text tokens: the value leads, the series name follows. */
export function ChartTip({
  active,
  label,
  payload,
  series,
}: {
  active?: boolean | undefined;
  label?: string | number | undefined;
  payload?: Array<{ dataKey?: string | number | undefined; value?: number | string | undefined }> | undefined;
  series: ChartSeries[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-panel border border-neutral-200 bg-high-vis-white px-3 py-2 shadow-panel">
      <p className="font-ui text-sm text-neutral-500">{String(label ?? '')}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => {
          const item = series.find((s) => s.key === String(entry.dataKey));
          if (!item) return null;
          const raw = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0);
          return (
            <li key={item.key} className="flex items-center gap-2 font-ui text-sm">
              <span aria-hidden className="inline-block h-0.5 w-3" style={{ backgroundColor: item.color }} />
              <span className="font-semibold tabular-nums text-charcoal">{(item.format ?? String)(raw)}</span>
              <span className="text-neutral-500">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
