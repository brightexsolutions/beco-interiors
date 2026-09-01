'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A deck of cards, held as a fan and dealt from the top.
 *
 * The same physical language as the room stack on the home page: real depth,
 * a real hand of cards, the front one swiped away to the right and returning
 * to the back. The difference is that this one is DRIVEN, not automatic, so it
 * can carry a product's photographs where the reader chooses the pace.
 *
 * Why a deck rather than a thumbnail strip. A strip has to reserve room for
 * every image, so a three image gallery and a six image gallery look like
 * different components, and a fifth of the catalogue has only three. A deck
 * occupies exactly one card's worth of space whatever it holds, and the depth
 * behind the front card is itself the count.
 *
 * Accessibility is not sacrificed to it. The deck is a button that advances,
 * every card is reachable directly from the tablist the caller renders
 * alongside, and the live region announces what is now on top.
 */
export interface DeckCard {
  key: string;
  node: ReactNode;
  /** Announced when this card reaches the front. */
  label: string;
}

export interface CardDeckProps {
  cards: readonly DeckCard[];
  /** Index of the card currently on top. Controlled by the caller. */
  active: number;
  onActiveChange: (index: number) => void;
  className?: string | undefined;
  /**
   * Frame shape. Slabs are portrait; a room reads better wider. Height is
   * capped on large screens, because a 4:5 frame in a wide column becomes a
   * photograph nearly a thousand pixels tall.
   */
  aspect?: string | undefined;
}

/** How long the front card takes to leave. Matches the CSS below. */
const SWIPE_MS = 420;

export function CardDeck({
  cards, active, onActiveChange, className,
  aspect = 'aspect-[4/5] lg:aspect-auto lg:h-[min(66vh,38rem)]',
}: CardDeckProps) {
  // The card in flight, and the one that has just landed at the back and must
  // not tween across the screen to get there.
  const [leaving, setLeaving] = useState<number | null>(null);
  const [snapping, setSnapping] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { for (const t of timers.current) clearTimeout(t); }, []);

  const advance = useCallback(() => {
    if (cards.length < 2 || leaving !== null) return;
    const outgoing = active;
    setLeaving(outgoing);
    // The rest of the fan moves up immediately, so the deck does not appear
    // to wait for the top card to finish leaving.
    onActiveChange((active + 1) % cards.length);

    timers.current.push(setTimeout(() => {
      // Land it at the back with no transition, while it is still invisible,
      // so it never tweens backwards across the frame.
      setSnapping(outgoing);
      setLeaving(null);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setSnapping(null)),
      );
    }, SWIPE_MS));
  }, [active, cards.length, leaving, onActiveChange]);

  if (cards.length === 0) return null;

  return (
    // The outer box CLIPS. A card leaves to the right and must stop at the
    // edge of its own column rather than travelling across whatever is beside
    // it, which on the product page is the price and the quote button. The
    // padding leaves room for the fan behind the front card.
    <div className={cn('relative overflow-hidden pb-14', className)}>
      <div className={cn('relative', aspect)}>
      {cards.map((card, i) => {
        // Distance from the front, which is this card's slot in the fan.
        const slot = (i - active + cards.length) % cards.length;
        const isLeaving = leaving === i;
        const isSnapping = snapping === i;

        return (
          <div
            key={card.key}
            aria-hidden={slot !== 0 || isLeaving ? true : undefined}
            style={{
              transform: isLeaving
                ? 'translate3d(145%, -8%, 0) rotate(20deg) scale(1.02)'
                : `translate3d(${slot * -2.3}%, ${slot * 1.1}rem, 0) rotate(${slot * -3}deg) scale(${1 - slot * 0.03})`,
              // Invisible while leaving, and still invisible on the frame it
              // lands at the back. It fades in once transitions resume.
              opacity: isLeaving || isSnapping ? 0 : 1,
              zIndex: isLeaving ? 60 : 50 - slot,
              transition: isSnapping
                ? 'none'
                : `transform ${SWIPE_MS}ms cubic-bezier(0.65,0,0.35,1), opacity 300ms ease-out`,
              // Only the front three carry their weight; deeper cards are
              // decoration and should not cost paint.
              display: slot > 3 && !isLeaving ? 'none' : undefined,
            }}
            className={cn(
              'absolute inset-0 origin-bottom overflow-hidden bg-neutral-100',
              'shadow-[0_22px_60px_rgba(16,24,32,0.22)] will-change-transform',
              'after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15',
              'motion-reduce:transition-none',
            )}
          >
            {card.node}
          </div>
        );
      })}

      {/* The whole deck advances. A real control, not a decorative one: it is
          a button, it is keyboard reachable, and it says what it does. */}
      {cards.length > 1 ? (
        <button
          type="button"
          onClick={advance}
          aria-label={`Show the next photograph, ${cards.length} in total`}
          className="absolute inset-0 z-[70] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-warm-red"
        >
          <span className="sr-only">Next photograph</span>
          {/* The count is the affordance: it says the deck has more in it. */}
          <span
            aria-hidden
            className="absolute bottom-4 right-4 inline-flex min-h-11 items-center gap-2 bg-charcoal/90 px-4 font-ui text-sm font-semibold tabular-nums text-high-vis-white backdrop-blur-sm"
          >
            {String(active + 1).padStart(2, '0')}
            <span className="text-neutral-500">/{String(cards.length).padStart(2, '0')}</span>
            <span className="ml-1 text-neutral-300">&rarr;</span>
          </span>
        </button>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {cards[active]?.label}
      </p>
      </div>
    </div>
  );
}
