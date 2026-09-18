/**
 * The opening of every dashboard screen: an eyebrow, a Cormorant display
 * title, an optional lede, and a slot for the screen's primary actions. It
 * sits at the top of the content panel, so it needs no rule of its own.
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
    <header className="mb-8">
      {eyebrow ? (
        <p className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
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
