import { useEffect, type RefObject } from 'react';

/**
 * Stops the page behind a modal from scrolling. `overflow: hidden` on body
 * is not enough: a wheel over a fixed overlay still chains to the document
 * in several browsers. We lock html and body, then cancel wheel and touch
 * moves unless they land in a descendant of `allowedRef` that can still
 * scroll in that direction.
 */

type Unlock = () => void;

let lockCount = 0;
let previous: {
  bodyOverflow: string;
  htmlOverflow: string;
  bodyOverscroll: string;
  htmlOverscroll: string;
} | null = null;

const allowed = new Set<HTMLElement>();

const nearestScrollable = (start: Node, root: HTMLElement): HTMLElement | null => {
  let node: Node | null = start;
  while (node) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const canY =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 1;
      const canX =
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        node.scrollWidth > node.clientWidth + 1;
      if (canY || canX) return node;
    }
    if (node === root) break;
    node = node.parentNode;
  }
  return null;
};

const canScroll = (el: HTMLElement, deltaX: number, deltaY: number): boolean => {
  if (deltaY !== 0) {
    const maxY = el.scrollHeight - el.clientHeight;
    if (maxY > 0) {
      if (deltaY < 0 && el.scrollTop > 0) return true;
      if (deltaY > 0 && el.scrollTop < maxY) return true;
    }
  }
  if (deltaX !== 0) {
    const maxX = el.scrollWidth - el.clientWidth;
    if (maxX > 0) {
      if (deltaX < 0 && el.scrollLeft > 0) return true;
      if (deltaX > 0 && el.scrollLeft < maxX) return true;
    }
  }
  return false;
};

const eventRoot = (target: EventTarget | null, root: HTMLElement): Node | null => {
  if (!(target instanceof Node)) return null;
  if (root.contains(target)) return target;
  // A wheel that originates in an iframe reports the iframe as the target
  // in this document. Treat that as inside the panel so the PDF can scroll.
  if (target instanceof HTMLIFrameElement && root.contains(target)) return target;
  return null;
};

const onWheel = (event: WheelEvent) => {
  for (const root of allowed) {
    const start = eventRoot(event.target, root);
    if (!start) continue;
    if (start instanceof HTMLIFrameElement) return;
    const scrollable = nearestScrollable(start, root);
    if (scrollable && canScroll(scrollable, event.deltaX, event.deltaY)) return;
  }
  event.preventDefault();
};

const onTouchMove = (event: TouchEvent) => {
  if (event.touches.length > 1) return;
  for (const root of allowed) {
    const start = eventRoot(event.target, root);
    if (!start) continue;
    if (start instanceof HTMLIFrameElement) return;
    if (nearestScrollable(start, root)) return;
  }
  event.preventDefault();
};

const acquire = (root: HTMLElement | null): Unlock => {
  if (root) allowed.add(root);
  if (lockCount === 0) {
    previous = {
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      htmlOverscroll: document.documentElement.style.overscrollBehavior,
    };
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  }
  lockCount += 1;

  return () => {
    if (root) allowed.delete(root);
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0 || !previous) return;
    document.body.style.overflow = previous.bodyOverflow;
    document.documentElement.style.overflow = previous.htmlOverflow;
    document.body.style.overscrollBehavior = previous.bodyOverscroll;
    document.documentElement.style.overscrollBehavior = previous.htmlOverscroll;
    document.removeEventListener('wheel', onWheel, { capture: true });
    document.removeEventListener('touchmove', onTouchMove, { capture: true });
    previous = null;
  };
};

export function useScrollLock(locked: boolean, allowedRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!locked) return;
    return acquire(allowedRef?.current ?? null);
  }, [locked, allowedRef]);
}
