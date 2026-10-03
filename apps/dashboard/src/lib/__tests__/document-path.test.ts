import { describe, expect, it } from 'vitest';
import { isDocumentPathFor } from '../document-path';

const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('isDocumentPathFor', () => {
  it('accepts the exact path a download writes', () => {
    expect(isDocumentPathFor('quotes', 'BEC-Q-00042', `quotes/BEC-Q-00042/${uuid}.pdf`)).toBe(true);
    expect(isDocumentPathFor('receipts', 'BEC-O-00007', `receipts/BEC-O-00007/${uuid}.pdf`)).toBe(true);
  });

  it('refuses another quote, the other kind, and traversal', () => {
    expect(isDocumentPathFor('quotes', 'BEC-Q-00042', `quotes/BEC-Q-00043/${uuid}.pdf`)).toBe(false);
    expect(isDocumentPathFor('quotes', 'BEC-Q-00042', `receipts/BEC-Q-00042/${uuid}.pdf`)).toBe(false);
    expect(isDocumentPathFor('quotes', 'BEC-Q-00042', `quotes/BEC-Q-00042/../BEC-Q-00043/${uuid}.pdf`)).toBe(false);
    expect(isDocumentPathFor('quotes', 'BEC-Q-00042', `quotes/BEC-Q-00042/x.pdf`)).toBe(false);
    expect(isDocumentPathFor('quotes', 'BEC-Q-0004.', `quotes/BEC-Q-00042/${uuid}.pdf`)).toBe(false);
  });
});
