import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }));

const { default: StockRedirect } = await import('../page');

describe('StockRedirect', () => {
  it('sends /stock to the catalogue editor', () => {
    expect(() => StockRedirect()).toThrow('REDIRECT:/products');
  });
});
