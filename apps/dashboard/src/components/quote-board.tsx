'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ConfirmDialog, Field, Icon, StatusPill, Textarea, cn, toast } from '@beco/ui';
import type { QuoteStatus } from '@beco/types';
import { setQuoteStatus } from '@/app/(app)/quotes/actions';
import { QUOTE_FLOW, canMoveQuote, quoteMoves } from '@/lib/quote-transitions';
import { QUOTE_SOURCE_LABEL, QUOTE_STATUS, quoteMoney, type QuoteListItem } from '@/lib/quotes';

interface Pending {
  quote: QuoteListItem;
  to: QuoteStatus;
}

/** A card in the air: where the pointer is and where it took hold of the card. */
interface Lifted {
  quote: QuoteListItem;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

/** A press that may become a drag: a mouse once it moves, a finger once it holds still. */
interface Press {
  quote: QuoteListItem;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  rect: DOMRect;
  timer: ReturnType<typeof setTimeout> | null;
  started: boolean;
}

const MOUSE_SLOP = 5;
const TOUCH_SLOP = 8;
const TOUCH_HOLD_MS = 300;
const EDGE = 48;

/** The column under a point, read through the lifted card, which ignores the pointer. */
const columnAt = (x: number, y: number): QuoteStatus | null => {
  const hits = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
  for (const el of hits) {
    const column = el.closest<HTMLElement>('[data-column]');
    if (column) return column.dataset.column as QuoteStatus;
  }
  return null;
};

/**
 * The quotes as columns by status, D148. A card is picked up and dropped on
 * the next column: with a mouse by dragging, on a phone by pressing and
 * holding (a quick swipe still scrolls the columns), and from the keyboard
 * by its grip: Space to lift, arrows to choose, Space to drop, Escape to
 * put it back, each step announced. Only the moves `quoteMoves` allows light
 * up as targets, so a drop is never refused after the fact; won and lost ask
 * first, lost with the reason the record keeps. The card lands at once and
 * the server's answer either settles it or puts it back with the reason.
 */
export function QuoteBoard({ quotes, viewerId, isAdmin }: { quotes: QuoteListItem[]; viewerId: string; isAdmin: boolean }) {
  const [shown, move] = useOptimistic(quotes, (current, change: { id: string; to: QuoteStatus }) =>
    current.map((quote) => (quote.id === change.id ? { ...quote, status: change.to } : quote)),
  );
  const [, startTransition] = useTransition();
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [held, setHeld] = useState<{ quote: QuoteListItem; index: number } | null>(null);
  const [over, setOver] = useState<QuoteStatus | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [announce, setAnnounce] = useState('');
  const press = useRef<Press | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const instructionsId = useId();

  // Stable, because ConfirmDialog reruns its focus effect when this changes:
  // an inline function sent focus back to Cancel on every keystroke of the
  // lost reason.
  const closeDialog = useCallback((open: boolean) => {
    if (open) return;
    setPending(null);
    setLostReason('');
  }, []);

  const movesFor = useCallback(
    (quote: QuoteListItem) => quoteMoves(quote, canMoveQuote(isAdmin, viewerId, quote.assignedTo)),
    [isAdmin, viewerId],
  );

  const commit = (quote: QuoteListItem, to: QuoteStatus, reason?: string) => {
    const form = new FormData();
    form.set('quoteId', quote.id);
    form.set('updatedAt', quote.updatedAt);
    form.set('status', to);
    if (reason) form.set('lostReason', reason);
    startTransition(async () => {
      move({ id: quote.id, to });
      const result = await setQuoteStatus({}, form);
      if (result.error) toast.error(`${quote.referenceNumber}: ${result.error}`);
      else toast.success(`${quote.referenceNumber} moved to ${QUOTE_STATUS[to].label}.`);
    });
  };

  const request = (quote: QuoteListItem, to: QuoteStatus) => {
    if (!movesFor(quote).includes(to)) return;
    if (to === 'won' || to === 'lost') setPending({ quote, to });
    else commit(quote, to);
  };
  const requestRef = useRef(request);
  requestRef.current = request;

  // ---------- pointer: mouse, pen and touch ----------

  const lift = useCallback((current: Press, x: number, y: number) => {
    current.started = true;
    if (current.touch) navigator.vibrate?.(10);
    setLifted({
      quote: current.quote,
      x,
      y,
      offsetX: current.startX - current.rect.left,
      offsetY: current.startY - current.rect.top,
      width: current.rect.width,
    });
  }, []);

  useEffect(() => {
    const endPress = () => {
      const current = press.current;
      if (current?.timer) clearTimeout(current.timer);
      press.current = null;
      setLifted(null);
      setOver(null);
    };

    const onMove = (event: PointerEvent) => {
      const current = press.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
      if (!current.started) {
        if (current.touch) {
          // Moving before the hold completes is a scroll, not a drag.
          if (distance > TOUCH_SLOP) endPress();
          return;
        }
        if (distance <= MOUSE_SLOP) return;
        lift(current, event.clientX, event.clientY);
      }
      setLifted((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev));
      const target = columnAt(event.clientX, event.clientY);
      setOver(target && movesFor(current.quote).includes(target) ? target : null);
      // Near the edge of a scrolling board, carry it along.
      const board = boardRef.current;
      if (board && board.scrollWidth > board.clientWidth) {
        const box = board.getBoundingClientRect();
        if (event.clientX < box.left + EDGE) board.scrollLeft -= 14;
        else if (event.clientX > box.right - EDGE) board.scrollLeft += 14;
      }
    };

    const onUp = (event: PointerEvent) => {
      const current = press.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (current.started) {
        const target = columnAt(event.clientX, event.clientY);
        // The click a mouse sends after a drop must not open the quote
        // underneath; a finger may send none, so the guard lasts one tick.
        const swallow = (click: MouseEvent) => {
          click.preventDefault();
          click.stopPropagation();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
        if (target && target !== current.quote.status) requestRef.current(current.quote, target);
      }
      endPress();
    };

    // While a finger carries a card the page must not scroll under it.
    const onTouchMove = (event: TouchEvent) => {
      if (press.current?.started) event.preventDefault();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', endPress);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', endPress);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [movesFor, lift]);

  const onPointerDown = (event: ReactPointerEvent<HTMLLIElement>, quote: QuoteListItem) => {
    if (event.button !== 0 || movesFor(quote).length === 0 || held) return;
    const touch = event.pointerType === 'touch';
    const current: Press = {
      quote,
      pointerId: event.pointerId,
      touch,
      startX: event.clientX,
      startY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      timer: null,
      started: false,
    };
    if (touch) {
      current.timer = setTimeout(() => {
        if (press.current === current && !current.started) lift(current, current.startX, current.startY);
      }, TOUCH_HOLD_MS);
    }
    press.current = current;
  };

  // ---------- keyboard: lift, choose, drop ----------

  const onHandleKey = (event: ReactKeyboardEvent<HTMLButtonElement>, quote: QuoteListItem) => {
    const moves = movesFor(quote);
    if (moves.length === 0) return;
    const lift = event.key === ' ' || event.key === 'Enter';
    if (!held || held.quote.id !== quote.id) {
      if (!lift) return;
      event.preventDefault();
      setHeld({ quote, index: 0 });
      setOver(moves[0]!);
      setAnnounce(
        `Picked up ${quote.referenceNumber}. ${QUOTE_STATUS[moves[0]!].label}. Arrow keys choose a column, Space drops, Escape puts it back.`,
      );
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const index = (held.index + step + moves.length) % moves.length;
      setHeld({ quote, index });
      setOver(moves[index]!);
      setAnnounce(QUOTE_STATUS[moves[index]!].label);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setHeld(null);
      setOver(null);
      setAnnounce(`${quote.referenceNumber} put back in ${QUOTE_STATUS[quote.status].label}.`);
      return;
    }
    if (lift) {
      event.preventDefault();
      const to = moves[held.index]!;
      setHeld(null);
      setOver(null);
      setAnnounce(`${quote.referenceNumber} dropped on ${QUOTE_STATUS[to].label}.`);
      request(quote, to);
    }
  };

  const carried = lifted?.quote ?? held?.quote ?? null;
  const targets = carried ? movesFor(carried) : [];

  return (
    <>
      <p id={instructionsId} className="sr-only">
        To move a quote, focus its grip and press Space, choose a column with the arrow keys, then press Space again.
      </p>
      <p role="status" aria-live="assertive" className="sr-only">
        {announce}
      </p>
      <div
        ref={boardRef}
        data-quote-board
        data-dragging={carried ? 'true' : undefined}
        className={cn(
          'relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-5 sm:px-5 xl:mx-0 xl:grid xl:snap-none xl:grid-cols-5 xl:overflow-visible xl:px-5 xl:pt-1',
          lifted && 'snap-none',
        )}
      >
        {QUOTE_FLOW.map((status) => {
          const cards = shown.filter((quote) => quote.status === status);
          const total = cards.reduce((sum, quote) => sum + (quote.isPriced ? quote.value : 0), 0);
          const isTarget = targets.includes(status);
          const isOver = over === status && isTarget;
          return (
            <section
              key={status}
              aria-labelledby={`board-${status}`}
              data-column={status}
              data-target={isTarget || undefined}
              data-over={isOver || undefined}
              className={cn(
                'flex w-[17.5rem] shrink-0 snap-start flex-col rounded-card border bg-neutral-50 transition-colors motion-reduce:transition-none xl:w-auto xl:min-w-0',
                isOver ? 'border-charcoal bg-neutral-100' : isTarget ? 'border-dashed border-neutral-400' : 'border-neutral-200',
                carried && !isTarget && carried.status !== status && 'opacity-60',
              )}
            >
              <header className="flex items-baseline justify-between gap-2 px-3 pb-2 pt-3">
                <h3 id={`board-${status}`} className="flex items-center gap-2 font-ui text-sm font-semibold text-charcoal">
                  {QUOTE_STATUS[status].label}
                  <span className="rounded-full bg-high-vis-white px-2 font-ui text-xs font-semibold tabular-nums leading-5 text-neutral-600 ring-1 ring-inset ring-neutral-200">
                    {cards.length}
                  </span>
                </h3>
                {total > 0 ? <span className="font-ui text-xs tabular-nums text-neutral-500">{quoteMoney(total)}</span> : null}
              </header>
              <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {cards.length === 0 ? (
                  <li className="flex flex-1 items-center justify-center rounded-control border border-dashed border-neutral-200 px-3 py-6 text-center font-ui text-sm text-neutral-500">
                    {isTarget ? 'Drop here' : 'None'}
                  </li>
                ) : (
                  cards.map((quote) => {
                    const movable = movesFor(quote).length > 0;
                    return (
                      <li
                        key={quote.id}
                        data-quote={quote.referenceNumber}
                        data-movable={movable || undefined}
                        onPointerDown={(event) => onPointerDown(event, quote)}
                        onContextMenu={(event) => {
                          // A long press on a phone lifts the card, not the browser's menu.
                          if (movable) event.preventDefault();
                        }}
                        className={cn(
                          'select-none rounded-control [-webkit-touch-callout:none]',
                          movable && 'cursor-grab',
                          carried?.id === quote.id && 'opacity-40',
                        )}
                      >
                        <BoardCard
                          quote={quote}
                          movable={movable}
                          held={held?.quote.id === quote.id}
                          describedBy={instructionsId}
                          onHandleKey={(event) => onHandleKey(event, quote)}
                          onHandleBlur={() => {
                            if (held?.quote.id === quote.id) {
                              setHeld(null);
                              setOver(null);
                            }
                          }}
                        />
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {lifted ? (
        <div
          aria-hidden
          data-lifted
          className="pointer-events-none fixed left-0 top-0 z-50 rotate-1 cursor-grabbing"
          style={{
            width: lifted.width,
            transform: `translate(${lifted.x - lifted.offsetX}px, ${lifted.y - lifted.offsetY}px)`,
          }}
        >
          <div className="shadow-lg">
            <BoardCard quote={lifted.quote} movable={false} held={false} />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pending?.to === 'won'}
        onOpenChange={closeDialog}
        title={pending ? `Mark ${pending.quote.referenceNumber} won` : 'Mark won'}
        description={
          pending
            ? `${pending.quote.customerName} said yes. A won quote is closed: its lines and status no longer change. Convert it to an order from the quote.`
            : ''
        }
        confirmLabel="Mark won"
        onConfirm={() => {
          if (pending) commit(pending.quote, 'won');
          setPending(null);
        }}
      />
      <ConfirmDialog
        open={pending?.to === 'lost'}
        onOpenChange={closeDialog}
        title={pending ? `Mark ${pending.quote.referenceNumber} lost` : 'Mark lost'}
        description={
          <div className="space-y-3">
            <p>
              {pending?.quote.referenceNumber} will be marked lost. It stays on the record. Reopen it if the client comes back.
            </p>
            <Field label="Why it was lost" htmlFor="board-lost-reason">
              <Textarea
                id="board-lost-reason"
                value={lostReason}
                onChange={(event) => setLostReason(event.target.value)}
                rows={3}
                maxLength={400}
              />
            </Field>
          </div>
        }
        confirmLabel="Mark lost"
        destructive
        onConfirm={() => {
          if (!pending) return;
          if (!lostReason.trim()) {
            toast.error('Say why this quote was lost.');
            return;
          }
          commit(pending.quote, 'lost', lostReason.trim());
          setPending(null);
          setLostReason('');
        }}
      />
    </>
  );
}

function BoardCard({
  quote,
  movable,
  held,
  describedBy,
  onHandleKey,
  onHandleBlur,
}: {
  quote: QuoteListItem;
  movable: boolean;
  held: boolean;
  describedBy?: string;
  onHandleKey?: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onHandleBlur?: () => void;
}) {
  const waiting = quote.requiresApproval && !quote.approvedAt;
  return (
    <div
      className={cn(
        'rounded-control border bg-high-vis-white p-3 shadow-panel',
        held ? 'border-charcoal ring-2 ring-charcoal' : 'border-neutral-200',
      )}
    >
      <div className="flex items-start gap-1">
        <Link
          href={`/quotes/${quote.referenceNumber}`}
          draggable={false}
          className="beco-ring block min-w-0 flex-1 rounded-control font-ui text-base font-semibold text-charcoal hover:underline"
        >
          <span className="block truncate">{quote.customerName}</span>
        </Link>
        {movable ? (
          <button
            type="button"
            aria-label={`Move ${quote.referenceNumber}`}
            aria-describedby={describedBy}
            aria-pressed={held}
            onKeyDown={onHandleKey}
            onBlur={onHandleBlur}
            className="beco-ring -mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-control text-neutral-400 hover:bg-neutral-100 hover:text-charcoal"
          >
            <Icon name="grip" className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <p className="mt-0.5 truncate font-ui text-sm text-neutral-500">
        {quote.referenceNumber} · {QUOTE_SOURCE_LABEL[quote.source]}
      </p>
      {waiting ? <StatusPill label="Needs approval" tone="warning" className="mt-2" /> : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        {quote.isPriced ? (
          <span className="font-ui text-sm font-semibold tabular-nums text-charcoal">{quoteMoney(quote.value)}</span>
        ) : (
          <span title="Pricing on application" className="font-ui text-sm text-neutral-500">
            POA
          </span>
        )}
        {quote.assignedToName ? (
          <span
            title={quote.assignedToName}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-ui text-xs font-semibold text-neutral-700"
          >
            <span aria-hidden>{initials(quote.assignedToName)}</span>
            <span className="sr-only">Assigned to {quote.assignedToName}</span>
          </span>
        ) : (
          <span className="font-ui text-sm text-neutral-400">Unassigned</span>
        )}
      </div>
    </div>
  );
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
