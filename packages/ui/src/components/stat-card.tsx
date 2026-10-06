import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A number, what it is measured against, and what it implies. Per D37 and
 * the design-system skill: "a number with no comparison is decoration."
 *
 * Beyond the figure, a card can carry the one visual that answers what the
 * number cannot on its own: a trend chip against last month, a meter for a
 * rate or a paid share, or a split bar for where the day's leads came from.
 * Never a sparkline for its own sake. An `action` (a link, supplied by the
 * app so this package stays router free) stretches over the whole card, so
 * every figure is one tap from the screen that explains it.
 *
 * `tone`: `plain` is the default. `attention` (Warm Red) is a claim that
 * someone must act today and should be rare on one screen. `positive` uses
 * the success token, never the brand red. `inverse` is the one featured
 * figure on charcoal.
 */
export type StatCardTone = 'plain' | 'attention' | 'positive' | 'inverse';
export type StatCardSize = 'default' | 'compact';

export interface StatCardDelta {
  direction: 'up' | 'down' | 'flat';
  label: string;
  /** Whether the direction is good news. Up is not always good. */
  sentiment?: 'good' | 'bad' | 'neutral' | undefined;
}

export interface StatCardMeter {
  /** 0 to 1. Clamped. */
  value: number;
  label: string;
}

export interface StatCardSegment {
  label: string;
  value: number;
}

const TONES: Record<StatCardTone, { card: string; value: string; label: string; meta: string; track: string; fill: string }> = {
  plain: {
    card: 'border-neutral-200 bg-high-vis-white',
    value: 'text-charcoal',
    label: 'text-neutral-500',
    meta: 'text-neutral-500',
    track: 'bg-neutral-100',
    fill: 'bg-charcoal',
  },
  attention: {
    card: 'border-warm-red-deep/25 bg-warm-red-deep/[0.04]',
    value: 'text-warm-red-deep',
    label: 'text-neutral-500',
    meta: 'text-neutral-700',
    track: 'bg-warm-red-deep/10',
    fill: 'bg-warm-red-deep',
  },
  positive: {
    card: 'border-success/25 bg-success/[0.04]',
    value: 'text-success',
    label: 'text-neutral-500',
    meta: 'text-neutral-500',
    track: 'bg-success/10',
    fill: 'bg-success',
  },
  inverse: {
    card: 'border-charcoal bg-charcoal',
    value: 'text-high-vis-white',
    label: 'text-neutral-300',
    meta: 'text-neutral-300',
    track: 'bg-high-vis-white/15',
    fill: 'bg-high-vis-white',
  },
};

const SEGMENT_FILLS = ['bg-charcoal', 'bg-neutral-500', 'bg-neutral-300'];

const DELTA_TONE: Record<NonNullable<StatCardDelta['sentiment']>, string> = {
  good: 'bg-success/10 text-success',
  bad: 'bg-neutral-100 text-neutral-700',
  neutral: 'bg-neutral-100 text-neutral-500',
};

const ARROW: Record<StatCardDelta['direction'], string> = { up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', flat: 'M5 12h14' };

export interface StatCardProps {
  label: string;
  value: string;
  /** What the value is measured against, for example "vs 8 last month". */
  comparison?: string | undefined;
  /** What the number means in one short sentence, not a repeat of the label. */
  implication?: string | undefined;
  tone?: StatCardTone;
  size?: StatCardSize;
  delta?: StatCardDelta | undefined;
  meter?: StatCardMeter | undefined;
  segments?: StatCardSegment[] | undefined;
  /** A link to the screen behind the number. Its hit area covers the card. */
  action?: ReactNode;
  className?: string | undefined;
}

export function StatCard({
  label,
  value,
  comparison,
  implication,
  tone = 'plain',
  size = 'default',
  delta,
  meter,
  segments,
  action,
  className,
}: StatCardProps) {
  const t = TONES[tone];
  const compact = size === 'compact';
  const segmentTotal = segments?.reduce((sum, s) => sum + s.value, 0) ?? 0;
  // A figure never breaks inside itself: `break-words` let "Ksh 96,000" split
  // after the comma and read as two numbers on the phone grid. Normal wrapping
  // may still break at the space, "Ksh" over "96,000", which reads correctly,
  // and a long figure holds at 24px, which is what a five column row at
  // 1440px and the two column phone grid both fit without touching an edge.
  const longFigure = String(value).length > 8;

  return (
    <div
      className={cn(
        'group relative flex min-w-0 flex-col rounded-panel border transition-[box-shadow,border-color] duration-200',
        compact ? 'p-2.5 sm:p-3' : 'p-4 sm:p-5',
        action ? 'hover:border-neutral-300 hover:shadow-panel focus-within:ring-2 focus-within:ring-charcoal focus-within:ring-offset-2' : null,
        t.card,
        className,
      )}
    >
      {/* The trend chip drops under the label when the card is narrow, so a
          two word label never breaks letter by letter beside it. */}
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <p className={cn('min-w-[6.5rem] flex-1 break-words font-ui text-sm font-semibold leading-snug', t.label)}>{label}</p>
        {delta ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 font-ui text-xs font-semibold tabular-nums',
              tone === 'inverse' ? 'bg-high-vis-white/10 text-high-vis-white' : DELTA_TONE[delta.sentiment ?? 'neutral'],
            )}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={ARROW[delta.direction]} />
            </svg>
            {delta.label}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          // Lining figures: Cormorant's default old-style "1" reads as "I".
          'mt-2 [overflow-wrap:normal] font-display leading-none tabular-nums lining-nums',
          compact ? 'text-lg sm:text-xl' : longFigure ? 'text-2xl' : 'text-3xl sm:text-4xl',
          t.value,
        )}
      >
        {value}
      </p>

      {meter ? (
        <div className="mt-3">
          <div
            role="meter"
            aria-label={meter.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(1, Math.max(0, meter.value)) * 100)}
            className={cn('h-1.5 w-full overflow-hidden rounded-full', t.track)}
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none', t.fill)}
              style={{ width: `${Math.min(1, Math.max(0, meter.value)) * 100}%` }}
            />
          </div>
          <p className={cn('mt-1.5 font-ui text-sm', t.meta)}>{meter.label}</p>
        </div>
      ) : null}

      {segments && segments.length > 0 ? (
        <div className="mt-3">
          <div className={cn('flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full', t.track)} aria-hidden>
            {segmentTotal > 0
              ? segments.map((segment, i) =>
                  segment.value > 0 ? (
                    <div
                      key={segment.label}
                      className={cn('h-full', SEGMENT_FILLS[i % SEGMENT_FILLS.length])}
                      style={{ width: `${(segment.value / segmentTotal) * 100}%` }}
                    />
                  ) : null,
                )
              : null}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {segments.map((segment, i) => (
              <li key={segment.label} className={cn('inline-flex items-center gap-1.5 font-ui text-sm', t.meta)}>
                <span aria-hidden className={cn('h-2 w-2 rounded-full', SEGMENT_FILLS[i % SEGMENT_FILLS.length])} />
                <span className="tabular-nums">{segment.value}</span> {segment.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {comparison ? (
        <p className={cn('line-clamp-2 font-ui text-sm', compact ? 'mt-1' : 'mt-2', t.meta)}>{comparison}</p>
      ) : null}
      {implication ? (
        <p className={cn('font-ui text-sm', compact ? 'mt-0.5 hidden sm:block' : 'mt-1', t.meta)}>{implication}</p>
      ) : null}

      {action ? (
        <div
          className={cn(
            'mt-auto flex items-center gap-1 pt-3 font-ui text-sm font-semibold leading-tight',
            tone === 'inverse' ? 'text-high-vis-white' : 'text-charcoal',
            // The link inside stretches over the whole card: one tap target,
            // one accessible name, no nested interactive elements.
            '[&_a]:after:absolute [&_a]:after:inset-0 [&_a]:after:content-[""] [&_a:focus-visible]:outline-none',
          )}
        >
          {action}
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
