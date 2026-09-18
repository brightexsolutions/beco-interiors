'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { whatsappLink } from '@/lib/site';

/**
 * The one contact channel reachable from anywhere on the site, on request:
 * most of this traffic arrives from Instagram, TikTok and Meta ads, where
 * WhatsApp is already the expected way to reach a business, not an email
 * form.
 *
 * Replaces `MobileActionBar`'s own WhatsApp button, which only existed
 * below `md` and only after the reader had scrolled past the first screen.
 * This is the opposite on purpose: visible immediately, on every
 * breakpoint, since a reader who leaves without finding it is the exact
 * failure the old, scroll gated version risked. Calling is still reachable
 * from the header's own business line and from `/contact`, so retiring the
 * dock's second button does not remove it, only its second copy.
 *
 * Opens a small card rather than navigating straight to WhatsApp on click,
 * on request: a reader gets a line of context and a real, named button
 * before a new app opens under them. NOT `ConfirmDialog`: nothing here is
 * destructive, so the full modal treatment, the dark backdrop and the
 * trapped tab order, would be a heavier interaction than a "send us a
 * message" prompt calls for. It still gets the same rigour everywhere it
 * matters: Escape closes it, a click outside closes it, and focus lands on
 * the card's own heading on open and returns to the FAB on close.
 *
 * `beco-pop-in` and the breathing ring both reuse existing keyframes from
 * `motion.css` (the hero rail's own entrance, the active chip's own idle
 * pulse) rather than adding a new animation primitive for one button, and
 * both already collapse under `prefers-reduced-motion` the same way every
 * other use of them does. The card's own entrance reuses `beco-pop-in` too.
 *
 * Shaped as an actual chat bubble, on request: a tail pointing down toward
 * the button it came from, a small sender row naming who it is from, and
 * the message itself sitting in its own rounded bubble inside the card,
 * the same shape a received WhatsApp message takes with one corner kept
 * square. The point is that this reads as the start of a conversation,
 * not a generic popover that happens to mention WhatsApp.
 *
 * Opens on a typing indicator, three dots, before the message itself
 * replaces it, on request: an instant wall of text reads as a popover
 * that happens to look like a bubble, where a beat of "typing" first is
 * what actually sells it as a conversation starting. `prefers-reduced-motion`
 * skips the wait outright rather than only hiding the dot bounce, since the
 * delay itself, not just its animation, is the thing that reader does not
 * want.
 */
const TYPING_MS = 1100;

export function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    // Replays every time the bubble opens, not just the first time: a
    // reader who closes it and opens it again is starting the
    // conversation over, not resuming one already in progress.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setTyping(!reducedMotion);
    const typingTimer = reducedMotion ? undefined : setTimeout(() => setTyping(false), TYPING_MS);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      clearTimeout(typingTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // Focus returns to the FAB whenever the card closes, whether that was
  // Escape, an outside click, or the button inside it navigating away.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50 pb-[env(safe-area-inset-bottom)]">
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="beco-pop-in absolute bottom-[4.5rem] right-0 w-[calc(100vw-3rem)] max-w-[20rem] rounded-[3px] bg-high-vis-white p-5 shadow-[0_24px_60px_rgba(16,24,32,0.28)] focus:outline-none"
        >
          {/* The tail: a real chat bubble needs one to actually read as a
              message rather than a rounded card that happens to float
              near the button. A rotated square, same fill as the bubble,
              carries no shadow of its own so it reads as part of the same
              shape rather than a second layer. */}
          <span aria-hidden className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 rounded-[2px] bg-high-vis-white" />

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-neutral-400 hover:text-charcoal"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>

          {/* A small sender row, the same convention a real chat message
              carries: who this is from, before what it says. A flat brand
              mark rather than an icon in a circle, per the design rules'
              own "never build" list, and the same reason the FAB button
              below carries the WhatsApp mark on a square, not a circle. */}
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-3 pr-6">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-whatsapp">
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-high-vis-white">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.42 1.31-1.95 1.36-.5.05-.98.23-3.3-.69-2.77-1.09-4.54-3.92-4.68-4.1-.14-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29a1 1 0 0 1 .73-.34h.52c.17 0 .39-.06.61.47.23.55.78 1.9.85 2.04.07.14.12.3.02.48-.09.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.18-.28.37-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.21.52.32.07.12.07.66-.17 1.34Z" />
              </svg>
            </span>
            <div>
              <p id={headingId} className="font-display text-lg leading-none text-charcoal">
                Beco Interiors
              </p>
              <p className="mt-1 font-ui text-xs font-medium uppercase tracking-[0.08em] text-neutral-400">
                Usually replies within minutes
              </p>
            </div>
          </div>

          {typing ? (
            // The typing indicator: three dots, staggered, in the same
            // bubble shape the real message is about to take. Tailwind's
            // own `animate-bounce`, not a new keyframe, and gone outright
            // under reduced motion since `typing` itself never turns true
            // there rather than only having its bounce suppressed.
            <div aria-hidden className="mt-4 flex w-fit items-center gap-1 rounded-lg rounded-tl-[3px] bg-neutral-100 px-4 py-3.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-none" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-none" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-none" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <>
              {/* Two bubbles now, a greeting before the actual prompt, on
                  request: one message alone read as a single canned line
                  rather than the start of a real exchange. Same bubble
                  shape both times, staggered a beat apart so the second
                  reads as following the first rather than arriving with
                  it. The reply time already sits under the sender's name
                  above, so it is not repeated in either bubble. */}
              <p className="beco-pop-in mt-4 max-w-[26ch] rounded-lg rounded-tl-[3px] bg-neutral-100 px-4 py-3 text-sm leading-[1.6] text-charcoal">
                Hi there!
              </p>
              <p
                className="beco-pop-in mt-2 max-w-[26ch] rounded-lg rounded-tl-[3px] bg-neutral-100 px-4 py-3 text-sm leading-[1.6] text-charcoal"
                style={{ animationDelay: '120ms' }}
              >
                Ask about a stone, a price, or anything else. We would love to help.
              </p>

              <a
                href={whatsappLink()}
                data-analytics="whatsapp_click"
                target="_blank"
                rel="noopener noreferrer"
                className="beco-pop-in mt-4 flex min-h-11 items-center justify-center gap-2 rounded-[2px] bg-whatsapp px-4 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-high-vis-white transition-colors duration-200 ease-brand hover:brightness-95"
                style={{ animationDelay: '220ms' }}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.42 1.31-1.95 1.36-.5.05-.98.23-3.3-.69-2.77-1.09-4.54-3.92-4.68-4.1-.14-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29a1 1 0 0 1 .73-.34h.52c.17 0 .39-.06.61.47.23.55.78 1.9.85 2.04.07.14.12.3.02.48-.09.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.18-.28.37-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.21.52.32.07.12.07.66-.17 1.34Z" />
                </svg>
                Open WhatsApp
              </a>
            </>
          )}
        </div>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close WhatsApp chat' : 'Chat with Beco on WhatsApp'}
        className="beco-pop-in group relative flex h-14 w-14 items-center justify-center transition-transform duration-200 ease-brand hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-warm-red motion-reduce:transition-none"
        style={{ animationDelay: '600ms' }}
      >
        {/* The breathing ring: opacity only, the same restraint
            `beco-chip-active-ring` already holds the hero's own "showing
            now" indicator to, so this reads as a quiet accent rather than a
            second effect. -inset-1, not further out: kept close enough to
            the button that it reads as a soft edge rather than a halo,
            reduced on request from -inset-2 and half the fill opacity.
            Stops breathing while the card is open, since a pulsing ring
            behind an already-acknowledged control reads as still asking for
            attention it already has. */}
        {!open ? (
          <span
            aria-hidden
            className="beco-chip-active-ring pointer-events-none absolute -inset-1 rounded-full bg-whatsapp/25 blur-[2px]"
          />
        ) : null}
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp shadow-[0_8px_24px_rgba(16,24,32,0.28)]">
          {open ? (
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0 stroke-high-vis-white" fill="none" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-high-vis-white">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.42 1.31-1.95 1.36-.5.05-.98.23-3.3-.69-2.77-1.09-4.54-3.92-4.68-4.1-.14-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29a1 1 0 0 1 .73-.34h.52c.17 0 .39-.06.61.47.23.55.78 1.9.85 2.04.07.14.12.3.02.48-.09.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.18-.28.37-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.21.52.32.07.12.07.66-.17 1.34Z" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
