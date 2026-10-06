'use client';

import { useEffect, useState } from 'react';

export interface VisualViewportState {
  /** Height of what the reader can actually see, keyboard excluded. */
  height: number;
  /** How far the visible area has scrolled down the layout viewport. */
  offsetTop: number;
  /** An on screen keyboard is taking a meaningful share of the screen. */
  keyboardOpen: boolean;
}

/** Past this, the gap between layout and visual height is a keyboard, not a toolbar collapsing. */
const KEYBOARD_THRESHOLD = 150;

export const readVisualViewport = (
  vv: { height: number; offsetTop: number } | null | undefined,
  innerHeight: number,
): VisualViewportState | null => {
  if (!vv) return null;
  return {
    height: vv.height,
    offsetTop: vv.offsetTop,
    keyboardOpen: innerHeight - vv.height > KEYBOARD_THRESHOLD,
  };
};

/**
 * The visible part of the page on a phone. iOS keeps `100dvh` and every
 * `position: fixed` box anchored to the layout viewport when the keyboard
 * opens, so anything pinned to the bottom lands under the keys. Reading the
 * visual viewport is the only reliable way to size around it. Null where
 * the API does not exist, so callers fall back to their CSS.
 */
export function useVisualViewport(): VisualViewportState | null {
  const [state, setState] = useState<VisualViewportState | null>(null);

  useEffect(() => {
    const vv = typeof window === 'undefined' ? null : window.visualViewport;
    if (!vv) return;
    const update = () => setState(readVisualViewport(vv, window.innerHeight));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return state;
}
