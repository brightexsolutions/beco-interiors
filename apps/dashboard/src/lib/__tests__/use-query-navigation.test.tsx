import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/quotes',
  useSearchParams: () => params,
}));

const { useQueryNavigation } = await import('../use-query-navigation');

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
});

describe('useQueryNavigation', () => {
  it('writes the param, keeps the others and drops the page', () => {
    params = new URLSearchParams('owner=mine&page=4');
    const { result } = renderHook(() => useQueryNavigation());
    act(() => result.current.setParam('status', 'won'));
    expect(push).toHaveBeenCalledWith('/quotes?owner=mine&status=won');
  });

  it('removes a param when the value is empty, and pushes the bare path when nothing is left', () => {
    params = new URLSearchParams('status=won');
    const { result } = renderHook(() => useQueryNavigation());
    act(() => result.current.setParam('status', ''));
    expect(push).toHaveBeenCalledWith('/quotes');
  });

  it('exposes isPending, which starts false, so a filter can show the list is reloading', () => {
    const { result } = renderHook(() => useQueryNavigation());
    expect(result.current.isPending).toBe(false);
    act(() => result.current.navigate(() => push('/quotes?view=people')));
    expect(push).toHaveBeenCalledWith('/quotes?view=people');
  });
});
