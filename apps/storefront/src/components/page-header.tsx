import type { ReactNode } from 'react';

/**
 * The page header, in one place.
 *
 * Red rule, letterspaced eyebrow, Cormorant title, then the lede. That rhythm
 * is the site's one section opening and it was being hand written on every
 * page, each with its own margins, which is how two pages end up looking like
 * they came from two projects.
 *
 * The eyebrow rule is the one piece of Warm Red most pages get.
 */
export function PageHeader({
  eyebrow, title, lede, aside, className,
}: {
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  /** Sits opposite the title on wide screens: a count, a link, a filter. */
  aside?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <header className={className}>
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px w-8 bg-warm-red" />
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {eyebrow}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <h1 className="max-w-[15ch] font-display text-5xl leading-[1.04] tracking-[-0.015em] text-charcoal sm:text-6xl">
          {title}
        </h1>
        {aside ? <div className="pb-2">{aside}</div> : null}
      </div>

      {lede ? (
        <div className="mt-6 max-w-[58ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
          {lede}
        </div>
      ) : null}
    </header>
  );
}
