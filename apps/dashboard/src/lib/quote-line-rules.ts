import type { QuoteStatus } from '@beco/types';

/**
 * Why the line items on a quote cannot be changed by this viewer, in words
 * the screen shows (D131). Mirrors the database: remove_quote_line and its
 * siblings decide, this only explains. Never a silent read-only list.
 */

export interface LineAccessInput {
  canMutate: boolean;
  canClaim: boolean;
  assignedToName: string | null;
}

/** Null when the viewer may edit the lines; otherwise the reason, and whether Claim is the way in. */
export function lineEditBlock({ canMutate, canClaim, assignedToName }: LineAccessInput):
  | { reason: string; claim: boolean }
  | null {
  if (canMutate) return null;
  if (canClaim) return { reason: 'Claim this quote to change its items.', claim: true };
  return {
    reason: assignedToName
      ? `Assigned to ${assignedToName}. Only they or an admin can change its items.`
      : 'Only the assigned salesperson or an admin can change its items.',
    claim: false,
  };
}

export interface ClosedInput {
  status: QuoteStatus;
  convertedOrderReference: string | null;
}

/**
 * Null while the quote is open; otherwise why none of its lines can change,
 * quantity, price, an added item or a removal alike (D132). Same order as
 * assert_quote_lines_open() in migration 67: converted, won, lost.
 */
export function closedBlock({ status, convertedOrderReference }: ClosedInput): string | null {
  if (convertedOrderReference) return `This quote became order ${convertedOrderReference}. Its items are fixed.`;
  if (status === 'won') return 'A won quote is closed. Its items are fixed.';
  if (status === 'lost') return 'Reopen this quote to change its items.';
  return null;
}

export interface RemoveInput extends ClosedInput {
  lineCount: number;
  dirty: boolean;
}

/** Null when a line can come off; otherwise why not. Same order as remove_quote_line's checks. */
export function removeBlock({ status, convertedOrderReference, lineCount, dirty }: RemoveInput): string | null {
  const closed = closedBlock({ status, convertedOrderReference });
  if (closed) return closed;
  if (lineCount <= 1) return 'A quote needs at least one item. Mark it lost instead.';
  if (dirty) return 'Save your line changes first.';
  return null;
}
