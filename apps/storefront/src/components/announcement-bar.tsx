import Link from 'next/link';
import { getLiveAnnouncement } from '@/lib/announcements';

/**
 * The announcement bar, per D36.
 *
 * Above the header, full width, and RENDERED ON THE SERVER with its height
 * part of the first paint. A bar that appears after paint and pushes the page
 * down is a direct CLS failure, and CLS is in the performance budget.
 *
 * Scheduling is the database's job: the RLS policy only returns rows that are
 * active and inside their window, so a mid year sale appears and retires on
 * its own and nobody has to remember to take it down. That is the whole point,
 * because a stale "SALE ENDS FRIDAY" banner live in November is how these go
 * wrong.
 *
 * A clearance inverts to Warm Red so it reads as genuinely different from the
 * site chrome. Everything else is charcoal, which keeps Warm Red rationed.
 *
 * **Not dismissible**, which revises D36. The bar already retires on its own
 * when `ends_at` passes, so the case for a close button was only to let a
 * visitor silence something still current, and Beco would rather it stayed
 * visible for its whole window. Nothing here is a control, so there is no
 * decorative one either: the only interactive element is the call to action,
 * and it navigates. See D49.
 */
const TONE = {
  sale: 'bg-charcoal text-high-vis-white',
  notice: 'bg-charcoal text-high-vis-white',
  event: 'bg-charcoal text-high-vis-white',
  // The one case that earns the red ground: a clearance is not business as
  // usual and should not look like it.
  clearance: 'bg-warm-red-deep text-high-vis-white',
} as const;

export async function AnnouncementBar() {
  const announcement = await getLiveAnnouncement();
  if (!announcement) return null;

  return (
    <aside
      aria-label="Announcement"
      className={`relative z-[60] ${TONE[announcement.type] ?? TONE.notice}`}
    >
      <div className="mx-auto max-w-[1380px] px-6 py-3">
        <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center font-ui text-sm">
          <span className="font-semibold uppercase tracking-[0.12em]">{announcement.title}</span>
          {announcement.body ? (
            <span className="text-neutral-300">{announcement.body}</span>
          ) : null}
          {announcement.cta_label && announcement.cta_url ? (
            <Link
              href={announcement.cta_url}
              className="font-semibold underline underline-offset-4 hover:no-underline"
            >
              {announcement.cta_label}
            </Link>
          ) : null}
        </p>
      </div>
    </aside>
  );
}
