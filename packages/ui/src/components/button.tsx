import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * The reference component. Every other component follows this shape.
 *
 * NOTE ON RED: `primary` uses warm-red-DEEP, not warm-red. Pure Warm Red
 * carries white text at 4.38:1, below the 4.5 AA floor. The deep variant
 * measures 5.88:1. This is why the contrast check exists.
 *
 * No shadcn default colour, radius or shadow survives here. If a component
 * looks like default shadcn, it is not finished. See the design-system skill.
 */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-ui font-semibold uppercase tracking-[0.09em]',
    'text-sm', // 16px floor, never smaller
    'rounded-[2px] px-6 py-3.5',
    'min-h-[2.75rem]', // 44px touch target
    'transition-colors duration-200 ease-brand',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px]',
    'focus-visible:outline-warm-red',
    'disabled:opacity-50 disabled:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        /** The single most important action on a screen. Rationed. */
        primary: 'bg-warm-red-deep text-high-vis-white hover:bg-warm-red',
        secondary: 'bg-charcoal text-high-vis-white hover:bg-neutral-700',
        outline:
          'border border-charcoal text-charcoal hover:bg-charcoal hover:text-high-vis-white',
        ghost: 'text-charcoal hover:bg-neutral-100',
        whatsapp: 'bg-whatsapp text-high-vis-white hover:brightness-95',
      },
      size: {
        default: '',
        large: 'px-8 py-4 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

/**
 * The same styles, for when the control is genuinely a link.
 *
 * A quote call to action that navigates must be an `<a>`, not a button with an
 * onClick, or it loses middle click, open in new tab, and the status bar
 * preview. Exported as classes rather than as a component so this package
 * stays free of next/link, the same reason ProductCard takes its image as a
 * node.
 *
 * Anything that looks like a button must come from here. Hand written copies
 * of these classes are how the primary action ends up a different red on one
 * page than on another.
 */
export const buttonClasses = button;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

/**
 * Forwards its ref, so a dialog can place initial focus on a specific button.
 * Without this, ConfirmDialog cannot put focus on Cancel, which is the whole
 * reason Cancel comes first.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />;
});
