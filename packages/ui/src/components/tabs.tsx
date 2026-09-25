'use client';

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../lib/cn';

/**
 * Dashboard section switcher. Construction follows shadcn's Radix copy-paste
 * so keyboard and ARIA are not reinvented. The look is Beco: a hairline, a
 * charcoal underline on the active tab, 44px targets, 16px type. No muted
 * track, no rounded pill list, no zoom. If this looks like default shadcn,
 * it is not finished. See D88.
 *
 * Lives in @beco/ui. Never paste a second copy into an app. The storefront
 * does not import this.
 */

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex gap-1 overflow-x-auto border-b border-neutral-200', className)}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center px-4 font-ui text-base font-semibold text-neutral-500',
        '-mb-px border-b-2 border-transparent',
        'data-[state=active]:border-charcoal data-[state=active]:text-charcoal',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-warm-red',
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'pt-6 focus-visible:outline-none',
        'hidden data-[state=active]:block',
        className,
      )}
      {...props}
    />
  );
});
