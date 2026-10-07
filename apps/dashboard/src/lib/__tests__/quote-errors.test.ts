import { describe, expect, it } from 'vitest';
import { mutationMessage } from '../quote-errors';

describe('mutationMessage', () => {
  it('names a stale lock so the salesperson reloads rather than retrying blindly', () => {
    expect(mutationMessage({ code: 'PT409', message: 'This quote changed while you were editing' })).toMatch(
      /changed while you were editing/i,
    );
  });

  it('explains the approval gate instead of surfacing a check constraint name', () => {
    expect(
      mutationMessage({ code: '23514', message: 'new row violates check constraint quotes_finalized_requires_approval' }),
    ).toMatch(/needs approval/i);
  });

  it('says a picked customer has gone, rather than that the quote has (D130)', () => {
    expect(mutationMessage({ code: 'P0002', message: 'That customer is no longer on file' })).toBe(
      'That customer is no longer on file. Pick another.',
    );
    expect(mutationMessage({ code: 'P0002', message: 'Quote not found' })).toBe('That quote is no longer here.');
  });

  it('says a line has gone, rather than that the quote has (D131)', () => {
    expect(mutationMessage({ code: 'P0002', message: 'Line not found' })).toBe(
      'That item is no longer on this quote. Reload to see the current list.',
    );
  });

  it('passes the removal refusals through as written, they are already sentences (D131)', () => {
    for (const message of [
      'A quote needs at least one item. Mark it lost instead.',
      'A won quote is closed',
      'Reopen this quote to change its items',
      'This quote is already an order. Its items are fixed.',
      'Removing this item clears the approval. Move the quote back to reviewing first.',
    ]) {
      expect(mutationMessage({ code: 'P0001', message })).toBe(message);
    }
  });

  it('does not leak a permission-denied SQLSTATE as the UI copy', () => {
    expect(mutationMessage({ code: '42501', message: 'Not allowed' })).toMatch(/do not have permission/i);
  });

  it('does not surface a PostgREST schema-cache miss as the UI copy', () => {
    expect(
      mutationMessage({
        message: 'Could not find the function public.update_quote_line(...) in the schema cache',
      }),
    ).toMatch(/reload the page/i);
  });
});
