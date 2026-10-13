import type { QuoteStatus } from '@beco/types';

/** The board's columns and the order a quote moves through them. */
export const QUOTE_FLOW: readonly QuoteStatus[] = ['new', 'reviewing', 'quoted', 'won', 'lost'];

export interface MovableQuote {
  status: QuoteStatus;
  requiresApproval: boolean;
  approvedAt: string | null;
}

/**
 * Where a quote may go next, as `set_quote_status` and the
 * `quotes_finalized_requires_approval` constraint see it: never back to
 * new, won and lost are closed (a lost quote comes back through Reopen),
 * won only from quoted, and a quote waiting on approval may only be
 * reviewed. The detail screen's buttons and the board's drop targets both
 * read this, so the two never offer different moves.
 */
export function quoteMoves(quote: MovableQuote, canMutate: boolean): QuoteStatus[] {
  const { status } = quote;
  if (!canMutate || status === 'won' || status === 'lost') return [];
  const moves: QuoteStatus[] = [];
  if (status === 'new') moves.push('reviewing');
  if (status === 'new' || status === 'reviewing') moves.push('quoted');
  if (status === 'quoted') moves.push('won');
  if (status === 'reviewing' || status === 'quoted') moves.push('lost');
  if (quote.requiresApproval && !quote.approvedAt) return moves.filter((next) => next === 'reviewing');
  return moves;
}

/** An admin moves any quote; a salesperson the quotes assigned to them. */
export const canMoveQuote = (isAdmin: boolean, viewerId: string, assignedTo: string | null): boolean =>
  isAdmin || (assignedTo !== null && assignedTo === viewerId);

/** Moves that close a quote for good and so ask first. */
export const MOVES_THAT_ASK: ReadonlySet<QuoteStatus> = new Set(['won', 'lost']);
