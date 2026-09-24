import type { ReactNode } from 'react';

/**
 * One heading and its prose, for a policy page.
 *
 * Shared by `/terms` and `/privacy` rather than each page defining its own
 * copy, per rule 5: a pattern used twice is a component, not a second hand
 * written version of the first.
 */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-neutral-200 pt-8">
      <h2 className="font-display text-2xl leading-tight text-charcoal">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-[1.65] text-neutral-700">{children}</div>
    </section>
  );
}
