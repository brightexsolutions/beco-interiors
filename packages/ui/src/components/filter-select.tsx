import { cn } from '../lib/cn';

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  /** The short caption drawn inside the control, "Owner", "Status". */
  label: string;
  /** Names the select for assistive tech. Defaults to "Filter by <label>". */
  accessibleName?: string | undefined;
  value: string;
  options: readonly FilterSelectOption[];
  onChange: (value: string) => void;
  className?: string | undefined;
}

/**
 * A list filter that names itself and its value in one 44px control: the
 * caption on top in small print, the current choice under it. A label above
 * a select costs a row per filter, and on a 390px phone the quote filters
 * spent two thirds of the screen before the first quote. This spends one
 * control height per filter and still says what each one is.
 *
 * The native select sits over the whole box, transparent, so a tap opens the
 * phone's own picker and the keyboard and screen reader get a real select
 * with its own name and value. The drawn caption and value are hidden from
 * assistive tech, which would otherwise read them twice.
 *
 * Text is 16px on the select itself even though it is invisible: iOS zooms
 * the page on focus for anything smaller.
 */
export function FilterSelect({ label, accessibleName, value, options, onChange, className }: FilterSelectProps) {
  const current = options.find((option) => option.value === value) ?? options[0];
  return (
    <label
      className={cn(
        'relative flex h-11 min-w-0 flex-col justify-center rounded-control border border-neutral-300 bg-high-vis-white pl-3 pr-8',
        'transition-colors duration-200 hover:border-charcoal',
        'has-[select:focus-visible]:border-charcoal has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-warm-red',
        className,
      )}
    >
      <span aria-hidden className="block truncate font-ui text-sm leading-4 text-neutral-500">
        {label}
      </span>
      <span aria-hidden className="block truncate font-ui text-base font-semibold leading-5 text-charcoal">
        {current?.label}
      </span>
      <select
        aria-label={accessibleName ?? `Filter by ${label.toLowerCase()}`}
        value={current?.value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-control font-ui text-base opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 stroke-current text-neutral-500"
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
