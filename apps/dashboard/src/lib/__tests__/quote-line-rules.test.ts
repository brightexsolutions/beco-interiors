import { describe, expect, it } from 'vitest';
import { lineEditBlock, removeBlock } from '../quote-line-rules';

describe('lineEditBlock', () => {
  it('is null for someone who can edit', () => {
    expect(lineEditBlock({ canMutate: true, canClaim: true, assignedToName: null })).toBeNull();
  });

  it('tells a salesperson on an unassigned quote to claim it, the cause of "cannot edit" (D131)', () => {
    expect(lineEditBlock({ canMutate: false, canClaim: true, assignedToName: null })).toEqual({
      reason: 'Claim this quote to change its items.',
      claim: true,
    });
  });

  it('names the owner when someone else holds it', () => {
    expect(lineEditBlock({ canMutate: false, canClaim: false, assignedToName: 'Ken Mutiso' })).toEqual({
      reason: 'Assigned to Ken Mutiso. Only they or an admin can change its items.',
      claim: false,
    });
    expect(lineEditBlock({ canMutate: false, canClaim: false, assignedToName: null })?.reason).toMatch(
      /assigned salesperson or an admin/,
    );
  });
});

describe('removeBlock', () => {
  const open = { status: 'reviewing' as const, convertedOrderReference: null, lineCount: 2, dirty: false };

  it('is null on an open quote with more than one line', () => {
    expect(removeBlock(open)).toBeNull();
    expect(removeBlock({ ...open, status: 'new' })).toBeNull();
    expect(removeBlock({ ...open, status: 'quoted' })).toBeNull();
  });

  it('follows the database: converted, won, lost, last line', () => {
    expect(removeBlock({ ...open, status: 'won', convertedOrderReference: 'BEC-O-00012' })).toBe(
      'This quote became order BEC-O-00012. Nothing can be removed.',
    );
    expect(removeBlock({ ...open, status: 'won' })).toBe('A won quote is closed. Nothing can be removed.');
    expect(removeBlock({ ...open, status: 'lost' })).toBe('Reopen this quote to remove items.');
    expect(removeBlock({ ...open, lineCount: 1 })).toBe('A quote needs at least one item. Mark it lost instead.');
  });

  it('asks for unsaved quantity and price changes to be saved first, so a removal cannot discard them', () => {
    expect(removeBlock({ ...open, dirty: true })).toBe('Save your line changes first.');
  });
});
