import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }));

const { default: CategoriesRedirect } = await import('../page');

describe('CategoriesRedirect', () => {
  it('sends /categories to the catalogue editor', () => {
    expect(() => CategoriesRedirect()).toThrow('REDIRECT:/products');
  });
});
