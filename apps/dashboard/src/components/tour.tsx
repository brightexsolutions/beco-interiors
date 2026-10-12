'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { Button, Icon, Portal } from '@beco/ui';
import { findTarget, isShown, placeCard, type TourStep } from '@/lib/tour';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The screen tour, D149. The page dims, the part the step is about is cut
 * out of the dimming with a white edge, and a card beside it says what it is
 * for, with Back, Next and how far through the reader is. Escape or Skip
 * ends it; the arrow keys step through it; focus stays in the card and
 * returns to whatever opened the tour. The page under the dimming cannot be
 * clicked while the tour is up.
 */
export function Tour({
  steps,
  onClose,
  onOpenGuide,
  shown = isShown,
}: {
  steps: TourStep[];
  onClose: () => void;
  onOpenGuide?: (() => void) | undefined;
  /** Injected in tests, where jsdom lays nothing out. */
  shown?: (el: Element) => boolean;
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cardHeight, setCardHeight] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const step = steps[index];
  const last = index === steps.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = findTarget(step.target, shown);
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    if (!el) {
      setBox(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setBox({
      top: rect.top - PAD,
      left: rect.left - PAD,
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    });
  }, [step, shown]);

  // What opened the tour, read on the first render: by the time any effect
  // runs, focus has already moved to Next.
  const [opener] = useState(() => (typeof document === 'undefined' ? null : document.activeElement));
  useEffect(() => () => (opener as HTMLElement | null)?.focus?.(), [opener]);

  // Each step: bring its part into view, then light it.
  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target, shown);
    el?.scrollIntoView?.({
      block: 'center',
      inline: 'nearest',
      behavior: reduceMotion() ? 'auto' : 'smooth',
    });
    measure();
    nextRef.current?.focus();
  }, [step, shown, measure]);

  useEffect(() => {
    let frame = 0;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
  }, [measure]);

  // The card's real height decides which side it fits on.
  useLayoutEffect(() => {
    const height = cardRef.current?.offsetHeight;
    if (height && Math.abs(height - cardHeight) > 1) setCardHeight(height);
  });

  if (!step) return null;

  const go = (next: number) => {
    if (next < 0) return;
    if (next >= steps.length) onClose();
    else setIndex(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === 'Tab') {
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const end = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  // Beside the lit part, never over it; docked above the bottom bar on a
  // phone or when no side has room.
  const place = placeCard(box, viewport, cardHeight);
  const cardStyle: CSSProperties =
    place.side === 'docked'
      ? {
          ...(place.width ? { left: '50%', width: place.width, transform: 'translateX(-50%)' } : { left: 16, right: 16 }),
          ...(place.edge === 'top' ? { top: 16 } : { bottom: 'calc(var(--dock, 0px) + 16px)' }),
        }
      : { top: place.top, left: place.left, width: place.width };

  return (
    <Portal>
      <div data-tour-layer className="fixed inset-0 z-[70]">
        {/* Catches clicks so the page under the tour stays still. */}
        <div
          aria-hidden
          className="absolute inset-0"
          onClick={(event) => event.stopPropagation()}
        />
        {box ? (
          <div
            aria-hidden
            data-tour-spotlight
            className="pointer-events-none fixed rounded-card ring-2 ring-high-vis-white transition-[top,left,width,height] duration-300 ease-out motion-reduce:transition-none"
            style={{ ...box, boxShadow: '0 0 0 9999px rgb(10 12 16 / 0.62)' }}
          />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-ink/60" />
        )}
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          onKeyDown={onKeyDown}
          className="fixed rounded-card border border-neutral-200 bg-high-vis-white p-5 shadow-panel"
          style={cardStyle}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-ui text-sm text-neutral-500">
              Step {index + 1} of {steps.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="beco-ring -mr-2 -mt-2 inline-flex h-11 items-center gap-1.5 rounded-control px-2 font-ui text-sm font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-charcoal"
            >
              Skip tour
            </button>
          </div>
          <h2 id={titleId} className="mt-1 font-ui text-lg font-semibold text-charcoal">
            {step.title}
          </h2>
          <p id={bodyId} className="mt-1 font-ui text-base text-neutral-700">
            {step.body}
          </p>
          <div aria-hidden className="mt-4 flex gap-1">
            {steps.map((item, i) => (
              <span
                key={`${item.target}-${i}`}
                className={
                  i === index
                    ? 'h-1 w-5 rounded-full bg-charcoal'
                    : 'h-1 w-1.5 rounded-full bg-neutral-300'
                }
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {onOpenGuide ? (
              <button
                type="button"
                onClick={onOpenGuide}
                className="beco-ring -ml-2 inline-flex h-11 items-center gap-1.5 rounded-control px-2 font-ui text-sm font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-charcoal"
              >
                <Icon name="help" className="h-4 w-4" />
                Full guide
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {index > 0 ? (
                <Button type="button" variant="outline" onClick={() => go(index - 1)}>
                  Back
                </Button>
              ) : null}
              <Button ref={nextRef} type="button" variant="secondary" onClick={() => go(index + 1)}>
                {last ? 'Done' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
