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
export type StatCardTone = 'plain' | 'attention' | 'positive';

const TONES: Record<StatCardTone, { card: string; value: string }> = {
  plain: { card: 'border-neutral-200 bg-high-vis-white', value: 'text-charcoal' },
  attention: { card: 'border-warm-red-deep/20 bg-warm-red-deep/[0.04]', value: 'text-warm-red-deep' },
  positive: { card: 'border-success/20 bg-success/[0.04]', value: 'text-success' },
};

export interface StatCardProps {
  label: string;
  value: string;
  /** What the value is measured against, for example "vs 8 last month". */
  comparison?: string;
  /** What the number means in one short sentence, not a repeat of the label. */
  implication?: string;
  tone?: StatCardTone;
  className?: string | undefined;
}

export function StatCard({ label, value, comparison, implication, tone = 'plain', className }: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className={cn('rounded-panel border p-5', t.card, className)}>
      <p className="font-ui text-sm font-semibold text-neutral-500">{label}</p>
      <p className={cn('mt-1.5 font-display text-3xl leading-none', t.value)}>{value}</p>
      {comparison ? (
        <p className="mt-2 font-ui text-sm text-neutral-500">{comparison}</p>
      ) : null}
      {implication ? (
        <p className="mt-1 font-ui text-sm text-neutral-700">{implication}</p>
      ) : null}
    </div>
  );
}
