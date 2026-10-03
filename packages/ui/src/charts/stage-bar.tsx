'use client';

import { cn } from '../lib/cn';
import { useChartTheme } from './chart-theme';

export interface Stage {
  key: string;
  label: string;
  value: number;
  /** Draws this stage in the attention colour. One at most. */
  attention?: boolean | undefined;
}

/**
 * One horizontal bar, split by stage from first to last: where every open
 * quote stands. An ordered scale, so a single hue steps from light to dark
 * along it rather than borrowing a categorical palette; a stage that needs
 * someone today may take the attention colour. Each segment carries its own
 * count below it, every segment is separated by a 2px surface gap, and the
 * same figures sit in a list for assistive technology.
 */
export function StageBar({ title, stages, className }: { title: string; stages: Stage[]; className?: string | undefined }) {
  const theme = useChartTheme();
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);
  const shades = [theme.tertiary, theme.secondary, theme.text, theme.primary, theme.primary];

  return (
    <figure className={cn('min-w-0', className)}>
      <figcaption className="flex items-baseline justify-between gap-4">
        <p className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">{title}</p>
        <p className="font-ui text-sm tabular-nums text-neutral-500">{total} in all</p>
      </figcaption>
      {total === 0 ? (
        <p className="mt-3 font-ui text-base text-neutral-500">Nothing in the pipeline yet.</p>
      ) : (
        <>
          <div aria-hidden className="mt-3 flex h-3 w-full gap-[2px] overflow-hidden rounded-[2px]">
            {stages.map((stage, index) =>
              stage.value > 0 ? (
                <div
                  key={stage.key}
                  style={{
                    width: `${(stage.value / total) * 100}%`,
                    backgroundColor: stage.attention ? theme.attention : shades[Math.min(index, shades.length - 1)],
                  }}
                />
              ) : null,
            )}
          </div>
          <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
            {stages.map((stage, index) => (
              <li key={stage.key} className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-[1px]"
                    style={{ backgroundColor: stage.attention ? theme.attention : shades[Math.min(index, shades.length - 1)] }}
                  />
                  <span className="whitespace-nowrap font-ui text-sm text-neutral-500">{stage.label}</span>
                </span>
                <span className={cn('block font-display text-2xl leading-none tabular-nums lining-nums', stage.attention ? 'text-warm-red-deep' : 'text-charcoal')}>
                  {stage.value}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </figure>
  );
}
