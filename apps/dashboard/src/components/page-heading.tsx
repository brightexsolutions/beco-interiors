/**
 * The opening of every dashboard screen, D143: a small-caps eyebrow, the
 * title in Geist bold, an optional lede, and a slot for the screen's
 * primary actions. It sits on the grey ground above the screen's own
 * cards, so there is no rule under it: the first card draws its own edge.
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
    <header className="mb-5 sm:mb-6">
      {eyebrow ? (
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{eyebrow}</p>
      ) : null}
      <div
        data-heading-row
        className="mt-1 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      >
        <h1 data-tour="heading" className="min-w-0 font-display text-4xl font-bold leading-[1.15] tracking-[-0.02em] text-charcoal [overflow-wrap:anywhere]">{title}</h1>
        {lede ? (
          <p className="order-2 max-w-[60ch] font-ui text-base text-neutral-500 sm:order-none sm:col-start-1 sm:row-start-2">
            {lede}
          </p>
        ) : null}
        {actions ? (
          <div data-tour="actions" className="order-3 flex flex-col gap-2 [&>*]:w-full sm:order-none sm:col-start-2 sm:row-start-1 sm:row-span-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
