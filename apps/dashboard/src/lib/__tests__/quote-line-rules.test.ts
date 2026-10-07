import { describe, expect, it } from 'vitest';
import { closedBlock, lineEditBlock, removeBlock } from '../quote-line-rules';

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

describe('closedBlock (D132)', () => {
  it('is null on every open status', () => {
    for (const status of ['new', 'reviewing', 'quoted'] as const) {
      expect(closedBlock({ status, convertedOrderReference: null })).toBeNull();
    }
  });

  it('closes won, lost and converted quotes for every line change, in the database order', () => {
    expect(closedBlock({ status: 'won', convertedOrderReference: null })).toBe('A won quote is closed. Its items are fixed.');
    expect(closedBlock({ status: 'lost', convertedOrderReference: null })).toBe('Reopen this quote to change its items.');
    // Converted answers first, whatever the status says.
    expect(closedBlock({ status: 'won', convertedOrderReference: 'BEC-O-00012' })).toBe(
      'This quote became order BEC-O-00012. Its items are fixed.',
    );
    expect(closedBlock({ status: 'reviewing', convertedOrderReference: 'BEC-O-00012' })).toMatch(/^This quote became order/);
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
      'This quote became order BEC-O-00012. Its items are fixed.',
    );
    expect(removeBlock({ ...open, status: 'won' })).toBe('A won quote is closed. Its items are fixed.');
    expect(removeBlock({ ...open, status: 'lost' })).toBe('Reopen this quote to change its items.');
    expect(removeBlock({ ...open, lineCount: 1 })).toBe('A quote needs at least one item. Mark it lost instead.');
  });

  it('asks for unsaved quantity and price changes to be saved first, so a removal cannot discard them', () => {
    expect(removeBlock({ ...open, dirty: true })).toBe('Save your line changes first.');
  });
});
