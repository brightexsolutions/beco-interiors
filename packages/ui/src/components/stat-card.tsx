import { cn } from '../lib/cn';

/**
 * A number, what it is measured against, and what it implies. Per D37 and
 * the design-system skill: "a number with no comparison is decoration."
 *
 * `tone` is what makes a mix of coloured and plain cards mean something
 * rather than being wallpaper. `plain` is the default and covers most
 * cards. `attention` (Warm Red) is for a figure that genuinely needs
 * someone to act on it today, for example quotes over the SLA or stock at
 * or below threshold, and should be rare on one screen. `positive` uses the
 * functional success token, not the brand red, so a good number being
 * green never spends the page's Warm Red budget.
 */
export type StatCardTone = 'plain' | 'attention' | 'positive' | 'inverse';
export type StatCardSize = 'default' | 'compact';

const TONES: Record<StatCardTone, { card: string; value: string; label: string; meta: string }> = {
  plain: {
    card: 'border-neutral-200 bg-high-vis-white',
    value: 'text-charcoal',
    label: 'text-neutral-500',
    meta: 'text-neutral-500',
  },
  attention: {
    card: 'border-warm-red-deep/20 bg-warm-red-deep/[0.04]',
    value: 'text-warm-red-deep',
    label: 'text-neutral-500',
    meta: 'text-neutral-700',
  },
  positive: {
    card: 'border-success/20 bg-success/[0.04]',
    value: 'text-success',
    label: 'text-neutral-500',
    meta: 'text-neutral-500',
  },
  /** Charcoal carries the brand. One inverse card on a row of pale ones is
   *  the featured figure, without spending Warm Red on a number that is not
   *  actually late. */
  inverse: {
    card: 'border-charcoal bg-charcoal',
    value: 'text-high-vis-white',
    label: 'text-neutral-300',
    meta: 'text-neutral-300',
  },
};

export interface StatCardProps {
  label: string;
  value: string;
  /** What the value is measured against, for example "vs 8 last month". */
  comparison?: string;
  /** What the number means in one short sentence, not a repeat of the label. */
  implication?: string | undefined;
  tone?: StatCardTone;
  size?: StatCardSize;
  className?: string | undefined;
}

export function StatCard({
  label,
  value,
  comparison,
  implication,
  tone = 'plain',
  size = 'default',
  className,
}: StatCardProps) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        'min-w-0 rounded-panel border',
        size === 'compact' ? 'p-2.5 sm:p-3' : 'p-5',
        t.card,
        className,
      )}
    >
      <p className={cn('truncate font-ui text-sm font-semibold', t.label)}>{label}</p>
      <p
        className={cn(
          'mt-1 break-words font-display leading-none',
          size === 'compact' ? 'text-lg sm:text-xl' : 'text-3xl',
          t.value,
        )}
      >
        {value}
      </p>
      {comparison ? (
        <p
          className={cn(
            'truncate font-ui text-sm',
            size === 'compact' ? 'mt-1' : 'mt-2',
            t.meta,
          )}
        >
          {comparison}
        </p>
      ) : null}
      {implication ? (
        <p
          className={cn(
            'font-ui text-sm',
            size === 'compact' ? 'mt-0.5 hidden sm:block' : 'mt-1',
            t.meta,
          )}
        >
          {implication}
        </p>
      ) : null}
    </div>
  );
}
