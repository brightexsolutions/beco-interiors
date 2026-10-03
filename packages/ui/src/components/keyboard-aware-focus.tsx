'use client';

import { useEffect } from 'react';

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

/** Fields that raise an on screen keyboard (or a picker wheel, for select). */
export const isTextEntry = (el: Element | null): el is HTMLElement => {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el.isContentEditable === true;
};

/**
 * Whether a field sits outside the part of the screen the reader can see,
 * with a margin so it never ends up flush against the keyboard's edge.
 */
export const needsScroll = (
  rect: { top: number; bottom: number },
  view: { offsetTop: number; height: number },
  margin = 24,
): boolean => rect.top < view.offsetTop + margin || rect.bottom > view.offsetTop + view.height - margin;

/**
 * Mount once per app. When a field takes focus and the keyboard opens, or
 * the keyboard resizes while a field has focus, the field is scrolled to the
 * middle of what is still visible, inside a dialog or a scrolling list as
 * much as on the page itself. Does nothing on a desktop, where focus never
 * hides a field. Respects reduced motion.
 */
export function KeyboardAwareFocus() {
  useEffect(() => {
    const vv = window.visualViewport;
    let timer: number | undefined;

    const reveal = () => {
      const el = document.activeElement;
      if (!isTextEntry(el)) return;
      const view = vv ? { offsetTop: vv.offsetTop, height: vv.height } : { offsetTop: 0, height: window.innerHeight };
      if (!needsScroll(el.getBoundingClientRect(), view)) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    };

    // The keyboard animates in over roughly a quarter second; measuring
    // before it settles scrolls to where the field used to be hidden.
    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reveal, delay);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isTextEntry(event.target as Element)) schedule(300);
    };
    const onResize = () => schedule(80);

    document.addEventListener('focusin', onFocusIn);
    vv?.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn);
      vv?.removeEventListener('resize', onResize);
    };
  }, []);

  return null;
}
