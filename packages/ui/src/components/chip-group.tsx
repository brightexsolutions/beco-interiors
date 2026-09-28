'use client';

import { cn } from '../lib/cn';

export interface ChipOption {
  value: string;
  label: string;
  /** Shown beside the label, muted, for a range or a status count. */
  count?: number | undefined;
}

export interface ChipGroupProps {
  /** Names the group for assistive tech; not shown. */
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  /** Tapping the active chip again clears to this value, for an "All" chip. */
  clearValue?: string | undefined;
  className?: string | undefined;
}

/**
 * One tap filters for a phone: a horizontal strip of 44px chips instead of
 * a native select that hides its options behind a wheel. Pressed state is
 * `aria-pressed`, so each chip is a real toggle button, and the strip
 * scrolls sideways rather than wrapping into a wall of chips.
 */
export function ChipGroup({ label, options, value, onChange, clearValue, className }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('scrollbar-none flex gap-2 overflow-x-auto pb-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && clearValue !== undefined ? clearValue : option.value)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 font-ui text-sm font-semibold transition-colors',
              active
                ? 'border-charcoal bg-charcoal text-high-vis-white'
                : 'border-neutral-300 bg-high-vis-white text-charcoal hover:border-charcoal',
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn('tabular-nums', active ? 'text-neutral-300' : 'text-neutral-500')}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
