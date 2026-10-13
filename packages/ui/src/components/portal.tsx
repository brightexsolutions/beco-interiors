'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders its children on the body, out of every ancestor's stacking
 * context, as Dialog and ConfirmDialog do (D143): a layer drawn inside a
 * sticky or relative parent is painted over by later siblings whatever its
 * z-index. For layers an app draws itself, such as the dashboard's tour.
 */
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
