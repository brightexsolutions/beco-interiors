import { createClient } from '@supabase/supabase-js';

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

export const getLiveAnnouncement = async (): Promise<Announcement | null> => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb
    .from('announcements')
    .select('id,title,body,type,cta_label,cta_url')
    // Highest priority wins when two are live at once.
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // An announcement is never important enough to break the page it sits above.
  if (error) return null;
  return (data as Announcement | null) ?? null;
};

/** Cookie carrying the id of the announcement this visitor has dismissed. */
export const DISMISS_COOKIE = 'beco_announcement_dismissed';
