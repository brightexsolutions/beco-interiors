import { cn } from '../lib/cn';

/**
 * A lifecycle state, coloured by what it means rather than which table it
 * came from, so a quote's "won" and an order's "confirmed" read the same
 * way. The caller supplies the tone: this component owns no knowledge of
 * `quote_status` or `order_status`.
 *
 * `attention` is the ONLY tone drawn from the brand's Warm Red, reserved for
 * a state that genuinely needs someone to act (awaiting approval, overdue).
 * `positive` and `muted` use the functional success/error tokens, which are
 * deliberately separate from the three brand colours, so a "won" quote does
 * not spend any of the page's Warm Red budget.
 */
export type StatusTone = 'neutral' | 'positive' | 'attention' | 'muted';

const TONES: Record<StatusTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  positive: 'bg-success/10 text-success',
  attention: 'bg-warm-red-deep/10 text-warm-red-deep',
  muted: 'bg-neutral-100 text-neutral-500',
};

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
  className?: string | undefined;
}

export function StatusPill({ label, tone = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-ui text-xs font-semibold leading-none',
        TONES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
