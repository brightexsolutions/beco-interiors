import { createClient } from '@supabase/supabase-js';
import { SITE } from '@/lib/site';

/**
 * The live announcement, if there is one.
 *
 * Scheduling is enforced by RLS, not by this query: the `announcements_read_live`
 * policy already restricts anonymous reads to rows that are active and inside
 * their date window. So a mid year sale appears and retires on its own, and it
 * does so even if some future caller forgets to filter, because the database
 * is the authority. See D36.
 */
export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  type: 'sale' | 'clearance' | 'notice' | 'event';
  cta_label: string | null;
  cta_url: string | null;
}

/**
 * Every live announcement, highest priority first.
 *
 * The bar rotates through these together with Beco's phone and email, so a
 * quiet week still has something in the slot and the contact line is never
 * more than a few seconds away. Scheduling is still the RLS policy's job:
 * only rows that are active and inside their window come back.
 */
export const getLiveAnnouncements = async (): Promise<Announcement[]> => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb
    .from('announcements')
    .select('id,title,body,type,cta_label,cta_url')
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false });

  // An announcement is never important enough to break the page it sits above.
  if (error) return [];
  return (data as Announcement[] | null) ?? [];
};

/** The single highest-priority announcement, for callers that want just one. */
export const getLiveAnnouncement = async (): Promise<Announcement | null> =>
  (await getLiveAnnouncements())[0] ?? null;

/**
 * One line in the rotating bar. Built server side, in this module rather than
 * in the client component, so the layout (an RSC) can assemble it without
 * reaching across the server/client boundary.
 */
export interface AnnouncementBarItem {
  key: string;
  /** The uppercase lead, e.g. "Now on the floor" or "Call the showroom". */
  label: string;
  /** The sentence or the number. */
  text?: string | null;
  /** Makes the call to action, or the text itself, a link. */
  href?: string | null;
  /** The call to action label. With `href` and no `cta`, `text` becomes the link. */
  cta?: string | null;
  tone?: 'charcoal' | 'clearance';
}

/** Every live announcement, then Beco's phone and email. */
export const buildAnnouncementItems = (
  announcements: Announcement[],
): AnnouncementBarItem[] => [
  ...announcements.map((a) => ({
    key: a.id,
    label: a.title,
    text: a.body,
    href: a.cta_url,
    cta: a.cta_label,
    tone: a.type === 'clearance' ? ('clearance' as const) : ('charcoal' as const),
  })),
  {
    key: 'call',
    label: 'Call the showroom',
    text: SITE.phone,
    href: SITE.phoneHref,
    tone: 'charcoal' as const,
  },
  {
    key: 'email',
    label: 'Email us:',
    text: SITE.email,
    href: `mailto:${SITE.email}`,
    tone: 'charcoal' as const,
  },
];
