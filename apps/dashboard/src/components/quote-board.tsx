'use client';

import Link from 'next/link';
import { useCallback, useOptimistic, useState, useTransition, type DragEvent } from 'react';
import { ConfirmDialog, Field, Select, StatusPill, Textarea, cn, toast } from '@beco/ui';
import type { QuoteStatus } from '@beco/types';
import { setQuoteStatus } from '@/app/(app)/quotes/actions';
import { QUOTE_FLOW, canMoveQuote, quoteMoves } from '@/lib/quote-transitions';
import { QUOTE_SOURCE_LABEL, QUOTE_STATUS, quoteMoney, type QuoteListItem } from '@/lib/quotes';

interface Pending {
  quote: QuoteListItem;
  to: QuoteStatus;
}

/**
 * The quotes as columns by status, D148: drag a card to the next column, or
 * use its Move control on a phone or from the keyboard. Only the moves
 * `quoteMoves` allows light up as targets, so a drop is never refused after
 * the fact; won and lost ask first, lost with the reason the record keeps.
 * The card moves at once and the server's answer either settles it or
 * puts it back with the reason in a toast.
 */
export function QuoteBoard({ quotes, viewerId, isAdmin }: { quotes: QuoteListItem[]; viewerId: string; isAdmin: boolean }) {
  const [shown, move] = useOptimistic(quotes, (current, change: { id: string; to: QuoteStatus }) =>
    current.map((quote) => (quote.id === change.id ? { ...quote, status: change.to } : quote)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<QuoteListItem | null>(null);
  const [over, setOver] = useState<QuoteStatus | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [lostReason, setLostReason] = useState('');

  // Stable, because ConfirmDialog reruns its focus effect when this changes:
  // an inline function sent focus back to Cancel on every keystroke of the
  // lost reason.
  const closeDialog = useCallback((open: boolean) => {
    if (open) return;
    setPending(null);
    setLostReason('');
  }, []);

  const movesFor = (quote: QuoteListItem) => quoteMoves(quote, canMoveQuote(isAdmin, viewerId, quote.assignedTo));

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

  const onDrop = (event: DragEvent<HTMLElement>, to: QuoteStatus) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    const quote = shown.find((q) => q.id === id) ?? dragging;
    setDragging(null);
    setOver(null);
    if (quote && quote.status !== to) request(quote, to);
  };

  const targets = dragging ? movesFor(dragging) : [];

  return (
    <>
      <div
        data-quote-board
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-5 sm:px-5 xl:mx-0 xl:grid xl:snap-none xl:grid-cols-5 xl:overflow-visible xl:px-5 xl:pt-1"
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
              onDragOver={(event) => {
                if (!isTarget) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (over !== status) setOver(status);
              }}
              onDragLeave={() => setOver((current) => (current === status ? null : current))}
              onDrop={(event) => onDrop(event, status)}
              className={cn(
                'flex w-[17.5rem] shrink-0 snap-start flex-col rounded-card border bg-neutral-50 transition-colors xl:w-auto xl:min-w-0',
                isOver ? 'border-charcoal bg-neutral-100' : isTarget ? 'border-dashed border-neutral-400' : 'border-neutral-200',
                dragging && !isTarget && dragging.status !== status && 'opacity-60',
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
                  cards.map((quote) => (
                    <BoardCard
                      key={quote.id}
                      quote={quote}
                      moves={movesFor(quote)}
                      onMove={(to) => request(quote, to)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', quote.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDragging(quote);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      lifted={dragging?.id === quote.id}
                    />
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>

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
  moves,
  onMove,
  onDragStart,
  onDragEnd,
  lifted,
}: {
  quote: QuoteListItem;
  moves: QuoteStatus[];
  onMove: (to: QuoteStatus) => void;
  onDragStart: (event: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
  lifted: boolean;
}) {
  const draggable = moves.length > 0;
  const waiting = quote.requiresApproval && !quote.approvedAt;
  return (
    <li
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={onDragEnd}
      data-quote={quote.referenceNumber}
      className={cn(
        'rounded-control border border-neutral-200 bg-high-vis-white p-3 shadow-panel transition-[opacity,transform] motion-reduce:transition-none',
        draggable && 'cursor-grab active:cursor-grabbing',
        lifted && 'opacity-50',
      )}
    >
      <Link
        href={`/quotes/${quote.referenceNumber}`}
        className="beco-ring block min-w-0 rounded-control font-ui text-base font-semibold text-charcoal hover:underline"
      >
        <span className="block truncate">{quote.customerName}</span>
      </Link>
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
      {moves.length > 0 ? (
        <Select
          aria-label={`Move ${quote.referenceNumber} to`}
          value=""
          onChange={(event) => {
            const to = event.currentTarget.value as QuoteStatus;
            if (to) onMove(to);
          }}
          className="mt-2.5"
        >
          <option value="">Move to</option>
          {moves.map((to) => (
            <option key={to} value={to}>
              {QUOTE_STATUS[to].label}
            </option>
          ))}
        </Select>
      ) : null}
    </li>
  );
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
