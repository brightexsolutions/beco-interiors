/**
 * The opening of every dashboard screen: an eyebrow carrying the one Warm
 * Red mark the page spends on itself, a Cormorant display title, an
 * optional lede, and a slot for the screen's primary actions, closed by a
 * hairline so the screen below it starts on a line rather than in space.
 *
 * On a phone the actions come after the lede and run full width, so a
 * button never sits orphaned between the title and its sentence; from `sm`
 * they sit to the right of the title (D112).
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
    // A little tighter on a phone, where the space under the hairline was
    // pushing the first row of every list below the fold's midpoint.
    <header className="mb-6 border-b border-neutral-200 pb-5 sm:mb-8 sm:pb-6">
      {eyebrow ? (
        <p className="flex items-center gap-3 font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
          <span aria-hidden className="inline-block h-px w-6 bg-warm-red" />
          {eyebrow}
        </p>
      ) : null}
      <div
        data-heading-row
        className="mt-1 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      >
        <h1 className="min-w-0 font-display text-4xl leading-[1.08] text-charcoal [overflow-wrap:anywhere]">{title}</h1>
        {lede ? (
          <p className="order-2 max-w-[60ch] font-ui text-base text-neutral-500 sm:order-none sm:col-start-1 sm:row-start-2">
            {lede}
          </p>
        ) : null}
        {actions ? (
          <div className="order-3 flex flex-col gap-2 [&>*]:w-full sm:order-none sm:col-start-2 sm:row-start-1 sm:row-span-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
