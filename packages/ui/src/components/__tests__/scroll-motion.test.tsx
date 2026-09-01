import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ScrollMotion } from '../scroll-motion';

/**
 * The property that matters is the DEFAULT, not the animation: an element
 * that never gets `data-inview` must still be readable. The previous reveal
 * shipped fourteen elements as opacity-0 on the home page and depended on
 * JavaScript to make them visible, which fails as a blank section.
 */
type Cb = (entries: { isIntersecting: boolean; target: Element }[]) => void;
let callbacks: Cb[] = [];
const observed = new Set<Element>();

class FakeIO {
  constructor(private cb: Cb) { callbacks.push(cb); }
  observe(el: Element) { observed.add(el); }
  unobserve(el: Element) { observed.delete(el); }
  disconnect() { observed.clear(); }
}

beforeEach(() => {
  callbacks = [];
  observed.clear();
  vi.stubGlobal('IntersectionObserver', FakeIO);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

const withTargets = () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <div class="beco-reveal" id="a"></div>
    <div class="beco-card-flip" id="b"></div>
    <p id="plain"></p>`;
  document.body.append(host);
  return host;
};

describe('ScrollMotion', () => {
  it('marks an element as it arrives, and only then', () => {
    const host = withTargets();
    render(<ScrollMotion />);
    const a = host.querySelector('#a')!;
    expect(a.hasAttribute('data-inview')).toBe(false);

    callbacks[0]!([{ isIntersecting: true, target: a }]);
    expect(a.hasAttribute('data-inview')).toBe(true);
  });

  it('leaves an element that has not arrived untouched, and it stays readable', () => {
    const host = withTargets();
    render(<ScrollMotion />);
    const b = host.querySelector('#b')!;
    callbacks[0]!([{ isIntersecting: false, target: b }]);
    expect(b.hasAttribute('data-inview')).toBe(false);
    // No inline styles are applied, so nothing is hidden waiting for this.
    expect(b.getAttribute('style')).toBeNull();
  });

  it('ignores elements that opted into no motion', () => {
    const host = withTargets();
    render(<ScrollMotion />);
    expect(observed.has(host.querySelector('#plain')!)).toBe(false);
  });

  it('stops observing an element once it has fired, so it animates once', () => {
    const host = withTargets();
    render(<ScrollMotion />);
    const a = host.querySelector('#a')!;
    expect(observed.has(a)).toBe(true);
    callbacks[0]!([{ isIntersecting: true, target: a }]);
    expect(observed.has(a)).toBe(false);
  });

  it('does nothing at all under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const host = withTargets();
    render(<ScrollMotion />);
    expect(observed.size).toBe(0);
    expect(host.querySelector('#a')!.hasAttribute('data-inview')).toBe(false);
  });
});
