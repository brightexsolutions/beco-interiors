'use client';

import { useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { useModalFocus } from '../lib/use-modal-focus';
import { useScrollLock } from '../lib/use-scroll-lock';
import { buttonClasses } from './button';
import { Icon } from './icon';

/**
 * A storefront pop up, D159. Two looks, picked per pop up in the dashboard:
 *
 *   split  one photograph beside a white panel of copy. The stone fills half
 *          the card, so the offer reads as a material before it reads as a
 *          discount.
 *   offer  a charcoal card: a live dot and a badge, the headline, the button,
 *          then a strip of the stones it is about.
 *
 * `PromoPopupCard` is the card alone, so the dashboard's preview draws the
 * exact thing the storefront does. `PromoPopup` puts it in a modal: portalled,
 * escape and the backdrop close, Tab stays inside, focus returns to where it
 * was. Never a browser dialog (rule 4).
 *
 * Images are slots, the same as ProductCard: the storefront passes next/image
 * elements on its own loader, the dashboard plain derivatives.
 */
export type PromoPopupVariant = 'split' | 'offer';

export interface PromoPopupContent {
  variant: PromoPopupVariant;
  eyebrow?: string | null | undefined;
  badge?: string | null | undefined;
  title: string;
  body?: string | null | undefined;
  cta?: { label: string; href: string } | null | undefined;
  /** Stone photographs, in order. `split` shows the first; `offer` all of them as a strip. */
  images: ReactNode[];
}

/**
 * How wide each look sits on a desktop, shared by the modal and the
 * dashboard preview. The offer card is wide enough for a two line headline
 * at display size and a strip of stones that fills it; the split card gives
 * its photograph close to a square.
 */
export const promoPopupWidth = (variant: PromoPopupVariant): string =>
  variant === 'offer' ? 'max-w-[42rem]' : 'max-w-[56rem]';

export interface PromoPopupCardProps extends PromoPopupContent {
  /** The close control. Omitted in a static preview, which has nothing to close. */
  onClose?: (() => void) | undefined;
  /** Called as the button is followed, so the host can remember the visitor acted. */
  onCtaClick?: (() => void) | undefined;
  closeRef?: React.Ref<HTMLButtonElement> | undefined;
  titleId?: string | undefined;
  className?: string | undefined;
}

function CloseButton({
  onClose,
  closeRef,
  tone,
}: {
  onClose: () => void;
  closeRef?: React.Ref<HTMLButtonElement> | undefined;
  tone: 'light' | 'dark';
}) {
  return (
    <button
      ref={closeRef}
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={cn(
        'beco-ring absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-control transition-colors',
        tone === 'dark'
          ? 'bg-high-vis-white/10 text-high-vis-white hover:bg-high-vis-white/20'
          : 'bg-charcoal text-high-vis-white hover:bg-neutral-700',
      )}
    >
      <Icon name="x" className="h-5 w-5" />
    </button>
  );
}

function Eyebrow({ children, live, tone }: { children: ReactNode; live?: boolean; tone: 'light' | 'dark' }) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-ui text-xs font-semibold uppercase tracking-[0.16em]',
        tone === 'dark' ? 'text-neutral-300' : 'text-neutral-500',
      )}
    >
      {live ? (
        <span aria-hidden className="h-2 w-2 rounded-full bg-warm-red" />
      ) : (
        <span aria-hidden className="h-px w-8 bg-warm-red" />
      )}
      {children}
    </p>
  );
}

export function PromoPopupCard({
  variant,
  eyebrow,
  badge,
  title,
  body,
  cta,
  images,
  onClose,
  onCtaClick,
  closeRef,
  titleId,
  className,
}: PromoPopupCardProps) {
  const button = cta ? (
    <a
      href={cta.href}
      onClick={onCtaClick}
      className={cn(buttonClasses({ variant: 'primary', size: 'large' }), 'w-full sm:w-auto')}
    >
      {cta.label}
    </a>
  ) : null;

  if (variant === 'offer') {
    return (
      <div
        data-variant="offer"
        className={cn('relative w-full overflow-hidden rounded-card bg-charcoal text-high-vis-white', className)}
      >
        {onClose ? <CloseButton onClose={onClose} closeRef={closeRef} tone="dark" /> : null}
        <div className="px-6 pb-7 pt-7 sm:px-10 sm:pb-8 sm:pt-9">
          <div className="flex flex-wrap items-center gap-3 pr-12">
            {eyebrow ? <Eyebrow live tone="dark">{eyebrow}</Eyebrow> : null}
            {badge ? (
              <span className="rounded-control bg-warm-red-deep px-2.5 py-1 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-paper">
                {badge}
              </span>
            ) : null}
          </div>
          <h2 id={titleId} className="mt-5 max-w-[20ch] pr-8 font-display text-4xl leading-[1.08] sm:text-[2.75rem]">
            {title}
          </h2>
          {body ? <p className="mt-4 max-w-[52ch] text-base leading-[1.6] text-neutral-300">{body}</p> : null}
          {button ? <div className="mt-8">{button}</div> : null}
        </div>
        {images.length > 0 ? (
          <ul
            aria-label="Stones in this offer"
            className="flex snap-x gap-3 overflow-x-auto border-t border-high-vis-white/10 px-6 py-6 [scrollbar-width:none] sm:px-10 sm:pb-8"
          >
            {images.map((image, index) => (
              <li
                key={index}
                className="relative h-36 min-w-[6rem] flex-1 snap-start overflow-hidden rounded-control bg-neutral-700 sm:h-44"
              >
                {image}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-variant="split"
      className={cn(
        'relative grid w-full overflow-hidden rounded-card bg-high-vis-white text-charcoal sm:grid-cols-[1fr_1.1fr]',
        className,
      )}
    >
      {onClose ? <CloseButton onClose={onClose} closeRef={closeRef} tone="light" /> : null}
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100 sm:aspect-auto sm:min-h-[26rem]">
        {images[0] ?? null}
      </div>
      <div className="flex flex-col justify-center px-6 py-7 sm:px-9 sm:py-10">
        {eyebrow ? <Eyebrow tone="light">{eyebrow}</Eyebrow> : null}
        <h2 id={titleId} className="mt-4 pr-10 font-display text-4xl leading-[1.05] sm:pr-0">
          {title}
        </h2>
        {badge ? (
          <p className="mt-3 font-ui text-lg font-semibold uppercase tracking-[0.08em] text-warm-red-deep">{badge}</p>
        ) : null}
        {body ? <p className="mt-4 max-w-[38ch] text-base leading-[1.6] text-neutral-700">{body}</p> : null}
        {button ? <div className="mt-7">{button}</div> : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="beco-ring mt-3 inline-flex min-h-11 items-center self-start font-ui text-sm text-neutral-500 underline underline-offset-4 hover:text-charcoal"
          >
            No thanks
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface PromoPopupProps extends PromoPopupContent {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCtaClick?: (() => void) | undefined;
}

export function PromoPopup({ open, onOpenChange, onCtaClick, ...content }: PromoPopupProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useScrollLock(open, panelRef);
  // Focus lands on the pop up itself, not on Close: a ring drawn round Close
  // the moment it opens reads as an error, and Tab still reaches Close first.
  useModalFocus(open, panelRef, close, panelRef);

  if (!open) return null;

  return createPortal(
    <div className="beco-popup fixed inset-0 z-[90] flex items-end justify-center overscroll-none p-3 sm:items-center sm:p-6">
      <div aria-hidden onClick={close} className="beco-popup-backdrop absolute inset-0 bg-ink/60 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-popup-title"
        tabIndex={-1}
        className={cn(
          'beco-popup-panel relative outline-none max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto overscroll-contain rounded-card shadow-[0_24px_60px_-16px_rgba(16,24,32,0.4)] sm:max-h-[min(92dvh,48rem)]',
          promoPopupWidth(content.variant),
        )}
      >
        <PromoPopupCard
          {...content}
          onClose={close}
          onCtaClick={onCtaClick}
          closeRef={closeRef}
          titleId="promo-popup-title"
        />
      </div>
    </div>,
    document.body,
  );
}
