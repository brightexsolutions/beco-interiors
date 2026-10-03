/**
 * The opening of every dashboard screen: an eyebrow carrying the one Warm
 * Red mark the page spends on itself, a Cormorant display title, an
 * optional lede, and a slot for the screen's primary actions, closed by a
 * hairline so the screen below it starts on a line rather than in space.
 */
export function PageHeading({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow?: string | undefined;
  title: string;
  lede?: string | undefined;
  actions?: React.ReactNode | undefined;
}) {
  return (
    <header className="mb-8 border-b border-neutral-200 pb-6">
      {eyebrow ? (
        <p className="flex items-center gap-3 font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
          <span aria-hidden className="inline-block h-px w-6 bg-warm-red" />
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <h1 className="min-w-0 overflow-x-hidden font-display text-4xl leading-[1.08] text-charcoal">{title}</h1>
        {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
      {lede ? (
        <p className="mt-3 max-w-[60ch] font-ui text-base text-neutral-500">{lede}</p>
      ) : null}
    </header>
  );
}
