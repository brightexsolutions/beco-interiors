/**
 * A labelled horizontal bar. The value is in the text; the fill is visual
 * only. First row is charcoal, the rest are neutral, so the leader is named
 * without spending Warm Red.
 */
export function ReportBars({
  caption,
  items,
  format = String,
}: {
  caption: string;
  items: ReadonlyArray<{ label: string; value: number }>;
  format?: (value: number) => string;
}) {
  const max = Math.max(0, ...items.map((item) => item.value));

  return (
    <figure>
      <figcaption className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {caption}
      </figcaption>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => {
          const width = max === 0 ? 0 : Math.round((item.value / max) * 100);
          return (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 truncate font-ui text-base text-charcoal">{item.label}</span>
                <span className="shrink-0 font-ui text-base tabular-nums text-charcoal">{format(item.value)}</span>
              </div>
              <div className="mt-1.5 h-2 bg-neutral-100" aria-hidden>
                <div
                  className={`h-2 ${index === 0 ? 'bg-charcoal' : 'bg-neutral-400'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
