import { useEffect, type RefObject } from 'react';

/**
 * The keyboard contract every modal on the platform keeps: focus lands
 * inside on open, Escape closes, Tab cycles within the panel, and focus goes
 * back to whatever opened it. Shared by Dialog and PromoPopup so the two
 * cannot drift apart.
 */
export function useModalFocus(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  close: () => void,
  initialFocusRef: RefObject<HTMLElement | null> | undefined,
  fallbackFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    (initialFocusRef?.current ?? fallbackFocusRef?.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (opener as HTMLElement | null)?.focus?.();
    };
  }, [open, close, panelRef, initialFocusRef, fallbackFocusRef]);
}
