'use client';

import { cn } from '../lib/cn';
import { Icon, type IconName } from './icon';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  /** Names the group for assistive tech, for example "View". */
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Hide the words under `sm`, leaving the glyphs, when every option has one. */
  compactOnPhone?: boolean;
  className?: string;
}

/**
 * Two or three ways of looking at the same thing: List or Cards, Edit or
 * Preview, Table or Board. Drawn as one tray with the chosen option raised
 * on white, so it never reads as a row of separate action buttons beside a
 * real action like Save. Each option is a pressed or unpressed button.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  compactOnPhone = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex shrink-0 items-center rounded-control border border-neutral-200 bg-neutral-100', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const hideWord = compactOnPhone && option.icon != null;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={hideWord ? option.label : undefined}
            onClick={() => {
              if (!active) onChange(option.value);
            }}
            className={cn(
              'beco-ring inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-control px-3.5 font-ui text-sm font-semibold transition-colors motion-reduce:transition-none',
              active
                ? 'bg-high-vis-white text-charcoal shadow-sm ring-1 ring-inset ring-neutral-300'
                : 'text-neutral-600 hover:text-charcoal',
            )}
          >
            {option.icon ? <Icon name={option.icon} className="h-[1.05rem] w-[1.05rem]" /> : null}
            <span aria-hidden={hideWord || undefined} className={cn(hideWord && 'hidden sm:inline')}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
