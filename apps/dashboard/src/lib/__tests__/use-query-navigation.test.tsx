import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const push = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/quotes',
  useSearchParams: () => params,
}));

const { QueryNavigationProvider, useQueryNavigation } = await import('../use-query-navigation');

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

  it('shares one pending state across siblings inside a provider, so a pill tap dims the list', async () => {
    let finish: () => void = () => {};
    push.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const wrapper = ({ children }: { children: ReactNode }) => <QueryNavigationProvider>{children}</QueryNavigationProvider>;
    const { result } = renderHook(() => ({ pills: useQueryNavigation(), list: useQueryNavigation() }), { wrapper });
    act(() => result.current.pills.setParam('category', 'handles'));
    expect(result.current.pills.isPending).toBe(true);
    expect(result.current.list.isPending).toBe(true);
    await act(async () => finish());
    expect(result.current.list.isPending).toBe(false);
  });

  it('keeps each caller to its own transition outside a provider', async () => {
    let finish: () => void = () => {};
    push.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => ({ one: useQueryNavigation(), other: useQueryNavigation() }));
    act(() => result.current.one.setParam('category', 'handles'));
    expect(result.current.one.isPending).toBe(true);
    expect(result.current.other.isPending).toBe(false);
    await act(async () => finish());
  });
});
