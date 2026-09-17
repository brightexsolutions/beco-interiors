'use client';

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/cn';

/**
 * Dashboard menus. Construction follows shadcn's Radix copy-paste so focus,
 * keyboard and ARIA are not reinvented. The look is Beco: Titillium, 16px
 * floor, 44px rows, rounded-panel surface, no shadow, no zoom animation.
 * If this looks like default shadcn, it is not finished. See D88.
 *
 * Lives in @beco/ui. Never paste a second copy into an app. The storefront
 * does not import this.
 *
 * `modal` defaults to false: a menu is not a dialog, and locking the page
 * behind it makes jsdom clicks hang (`pointer-events: none` on body).
 */

export function DropdownMenu({
  modal = false,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root modal={modal} {...props} />;
}

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 8, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-56 rounded-panel border border-neutral-200 bg-high-vis-white p-1.5',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

export const DropdownMenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn('px-2.5 pb-1.5 pt-1 font-ui text-sm text-neutral-500', className)}
      {...props}
    />
  );
});

export const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'flex min-h-11 items-center rounded-[2px] px-2.5 font-ui text-sm text-charcoal outline-none',
        'focus:bg-neutral-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
});

export const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('my-1 h-px bg-neutral-200', className)}
      {...props}
    />
  );
});
