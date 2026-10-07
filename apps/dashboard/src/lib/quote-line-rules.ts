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

export interface RemoveInput {
  status: QuoteStatus;
  convertedOrderReference: string | null;
  lineCount: number;
  dirty: boolean;
}

/** Null when a line can come off; otherwise why not. Same order as remove_quote_line's checks. */
export function removeBlock({ status, convertedOrderReference, lineCount, dirty }: RemoveInput): string | null {
  if (convertedOrderReference) return `This quote became order ${convertedOrderReference}. Nothing can be removed.`;
  if (status === 'won') return 'A won quote is closed. Nothing can be removed.';
  if (status === 'lost') return 'Reopen this quote to remove items.';
  if (lineCount <= 1) return 'A quote needs at least one item. Mark it lost instead.';
  if (dirty) return 'Save your line changes first.';
  return null;
}
