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
  /** Scroll sideways in one row instead of wrapping. Off by default: a chip
   *  cut in half at the screen's edge reads as a layout fault (D112). */
  scroll?: boolean | undefined;
  className?: string | undefined;
}

/**
 * One tap filters for a phone: 44px chips instead of a native select that
 * hides its options behind a wheel. Pressed state is `aria-pressed`, so each
 * chip is a real toggle button. The chips wrap, so every option is on
 * screen and none is cut at the edge; a group with many options belongs in
 * a select instead (D112).
 */
export function ChipGroup({ label, options, value, onChange, clearValue, scroll = false, className }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex gap-2', scroll ? 'scrollbar-none overflow-x-auto pb-1' : 'flex-wrap', className)}
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
