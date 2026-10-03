import type { AnnouncementType } from '@beco/types';

/**
 * The storefront bar as a visitor sees it: charcoal, or the Warm Red pass
 * for Clearance. Shared by the editor's live preview and the list page's
 * "On the site now" strip, so the two cannot drift from each other.
 */
export function AnnouncementPreview({
  title,
  body,
  type,
  ctaLabel,
}: {
  title: string;
  body: string;
  type: AnnouncementType;
  ctaLabel: string;
}) {
  const tone = type === 'clearance' ? 'bg-warm-red-deep text-high-vis-white' : 'bg-charcoal text-high-vis-white';
  return (
    <div className={`${tone} px-4 py-3`}>
      <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center font-ui text-sm">
        <span className="font-semibold uppercase tracking-[0.12em]">{title || 'Title'}</span>
        {body ? <span className="text-high-vis-white/75">{body}</span> : null}
        {ctaLabel ? <span className="underline underline-offset-4">{ctaLabel}</span> : null}
      </p>
    </div>
  );
}
