'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PromoPopup } from '@beco/ui';
import type { LivePopup } from '@/lib/popups';

/**
 * Opens each live pop up once, on the trigger Beco chose for it, D159.
 *
 * Seen means closed or followed. A visitor who has seen it is left alone for
 * `showAgainDays`, remembered per pop up in localStorage, so a new pop up
 * still reaches someone who closed the last one. 0 days is once a visit, in
 * sessionStorage. Storage that throws (a private window, blocked site data)
 * means the pop up is not shown at all: without a memory it would nag on
 * every page.
 *
 * Never on the quote flow. A customer building a quote is already converting,
 * and a modal over that form is the one thing that could stop them.
 */
const DAY = 24 * 60 * 60 * 1000;
export const popupStorageKey = (id: string) => `beco-popup:${id}`;

const QUIET_PATHS = ['/quote'];
export const isQuietPath = (pathname: string) =>
  QUIET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/** Whether this visitor should see the pop up now. Throws nothing. */
export const shouldShowPopup = (popup: Pick<LivePopup, 'id' | 'showAgainDays'>, now = Date.now()): boolean => {
  try {
    const key = popupStorageKey(popup.id);
    if (popup.showAgainDays === 0) return window.sessionStorage.getItem(key) === null;
    const seen = Number(window.localStorage.getItem(key) ?? 0);
    return !seen || now - seen >= popup.showAgainDays * DAY;
  } catch {
    return false;
  }
};

export const rememberPopupSeen = (popup: Pick<LivePopup, 'id' | 'showAgainDays'>, now = Date.now()) => {
  try {
    const store = popup.showAgainDays === 0 ? window.sessionStorage : window.localStorage;
    store.setItem(popupStorageKey(popup.id), String(now));
  } catch {
    // Nothing to do: shouldShowPopup already refuses when storage throws.
  }
};

const hasFinePointer = () => {
  try {
    return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  } catch {
    return false;
  }
};

const scrolledPast = (percent: number) => {
  const room = document.documentElement.scrollHeight - window.innerHeight;
  if (room <= 0) return false;
  return (window.scrollY / room) * 100 >= percent;
};

/** A touch screen has no pointer to leave with, so exit intent becomes halfway down the page there. */
const TOUCH_EXIT_SCROLL = 50;

/**
 * Calls `fire` once, when the popup's trigger is met. Returns the undo.
 * `section` watches its `data-popup-section` mark come a quarter into view;
 * on a page without that section it never fires, and waits for a page that
 * has it.
 */
export const armTrigger = (popup: Pick<LivePopup, 'trigger' | 'triggerValue' | 'triggerSection'>, fire: () => void) => {
  const cleanups: Array<() => void> = [];
  let fired = false;
  const once = () => {
    if (fired) return;
    fired = true;
    cleanups.forEach((undo) => undo());
    fire();
  };
  const onScrollPast = (percent: number) => {
    const check = () => {
      if (scrolledPast(percent)) once();
    };
    window.addEventListener('scroll', check, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', check));
  };

  if (popup.trigger === 'delay') {
    const timer = window.setTimeout(once, popup.triggerValue * 1000);
    cleanups.push(() => window.clearTimeout(timer));
  } else if (popup.trigger === 'scroll') {
    onScrollPast(popup.triggerValue);
  } else if (popup.trigger === 'section') {
    const target = popup.triggerSection
      ? document.querySelector(`[data-popup-section="${popup.triggerSection}"]`)
      : null;
    if (target && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) once();
        },
        { threshold: 0.25 },
      );
      observer.observe(target);
      cleanups.push(() => observer.disconnect());
    }
  } else if (hasFinePointer()) {
    const leave = (event: MouseEvent) => {
      if (!event.relatedTarget && event.clientY <= 0) once();
    };
    document.addEventListener('mouseout', leave);
    cleanups.push(() => document.removeEventListener('mouseout', leave));
  } else {
    onScrollPast(TOUCH_EXIT_SCROLL);
  }

  return () => cleanups.forEach((undo) => undo());
};

/**
 * Every live pop up is armed on its own trigger, and they open one at a time.
 * One whose trigger fires while another is open is skipped for this page
 * rather than queued: two in a row is a site shouting. It is not marked
 * seen, so it can still open on a later page.
 */
export function PromoPopupHost({ popups }: { popups: LivePopup[] }) {
  const pathname = usePathname() ?? '/';
  const [openId, setOpenId] = useState<string | null>(null);
  const openRef = useRef<string | null>(null);

  useEffect(() => {
    if (isQuietPath(pathname)) return;
    const undos = popups
      .filter((popup) => shouldShowPopup(popup))
      .map((popup) =>
        armTrigger(popup, () => {
          if (openRef.current) return;
          openRef.current = popup.id;
          setOpenId(popup.id);
        }),
      );
    return () => undos.forEach((undo) => undo());
  }, [popups, pathname]);

  const popup = popups.find((p) => p.id === openId) ?? null;

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next || !popup) return;
      rememberPopupSeen(popup);
      openRef.current = null;
      setOpenId(null);
    },
    [popup],
  );

  if (!popup) return null;

  return (
    <PromoPopup
      open
      onOpenChange={onOpenChange}
      onCtaClick={() => rememberPopupSeen(popup)}
      variant={popup.variant}
      eyebrow={popup.eyebrow}
      badge={popup.badge}
      title={popup.title}
      body={popup.body}
      cta={popup.cta}
      images={popup.images.map((image, index) => (
        <Image
          key={`${index}:${image.path}`}
          src={image.path}
          alt={image.alt}
          fill
          sizes={popup.variant === 'split' ? '(max-width: 640px) 100vw, 460px' : '160px'}
          {...(image.blur ? { placeholder: 'blur' as const, blurDataURL: image.blur } : {})}
          className="object-cover"
        />
      ))}
    />
  );
}
