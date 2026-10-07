'use client';

import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

/**
 * A short line saying what a control means, for the control that needs one.
 *
 * Shown three ways, because the dashboard is used on a phone more than
 * anywhere else and a hover-only tip never shows there:
 *  - a mouse resting on the control or the tip
 *  - keyboard focus on the control
 *  - a tap on the small info button beside it, which toggles the tip and is a
 *    44px target of its own
 *
 * The tip is linked to the control with `aria-describedby`, so a screen
 * reader reads it after the control's own name and never in place of it. It
 * stays in the DOM while closed, `hidden`, because a description reference
 * still resolves to hidden text. Escape closes it without moving focus, and a
 * tap anywhere else closes a tapped tip (WCAG 1.4.13).
 *
 * Built from plain elements, like ConfirmDialog, so its behaviour can be
 * asserted in jsdom. A Radix tooltip deliberately ignores touch, which is the
 * case this one exists for.
 */
export interface TooltipProps {
  /** One or two plain sentences. */
  content: string;
  /** The control being explained. It receives `aria-describedby`. */
  children: ReactElement<{ 'aria-describedby'?: string | undefined }>;
  /** Accessible name of the info button, for example "About Publish". */
  infoLabel: string;
  /** Which edge the tip lines up with. `end` for a control at the right of
   *  its row, so the tip opens leftward instead of past the screen edge. */
  align?: 'start' | 'end';
  className?: string | undefined;
}

export function Tooltip({ content, children, infoLabel, align = 'start', className }: TooltipProps) {
  const tipId = `${useId()}-tip`;
  const rootRef = useRef<HTMLSpanElement>(null);
  const infoRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = !dismissed && (hovered || focused || pinned);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDismissed(true);
      setPinned(false);
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setPinned(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // A touch also fires pointerenter. Only a real mouse counts as hover, so a
  // tap on the control does not leave a tip stuck open on a phone.
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    setDismissed(false);
    setHovered(true);
  };
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    setHovered(false);
  };
  // Focus on the info button is not counted: that button opens the tip by
  // being pressed, so a second tap can close it again.
  const onFocus = (event: FocusEvent) => {
    if (event.target === infoRef.current) return;
    setDismissed(false);
    setFocused(true);
  };
  const onBlur = (event: FocusEvent) => {
    if (event.target === infoRef.current) return;
    setFocused(false);
  };

  const describedBy = [children.props['aria-describedby'], tipId].filter(Boolean).join(' ');

  return (
    <span
      ref={rootRef}
      className={cn('relative inline-flex items-center', className)}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <button
        ref={infoRef}
        type="button"
        aria-label={infoLabel}
        aria-expanded={pinned}
        aria-controls={tipId}
        onClick={() => {
          setDismissed(false);
          setPinned((current) => !current);
        }}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-neutral-500 transition-colors hover:text-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-warm-red"
      >
        <Icon name="info" className="h-5 w-5" />
      </button>
      {/* pt-2 rather than a margin, so the pointer can travel from the
          control onto the tip without leaving it and closing it. */}
      <span
        id={tipId}
        role="tooltip"
        hidden={!open}
        className={cn(
          'absolute top-full z-50 w-max max-w-[min(20rem,calc(100vw-2rem))] pt-2',
          align === 'end' ? 'right-0' : 'left-0',
        )}
      >
        <span className="block whitespace-normal bg-charcoal px-3 py-2 font-ui text-sm font-normal normal-case leading-snug tracking-normal text-high-vis-white shadow-panel">
          {content}
        </span>
      </span>
    </span>
  );
}
