import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { AnnouncementFilters } from '@/components/announcement-filters';
import { AnnouncementResults } from '@/components/announcement-results';
import { NewAnnouncementFab } from '@/components/new-announcement';
import {
  fetchAnnouncementById,
  fetchAnnouncements,
  type AnnouncementListFilters,
  type AnnouncementWindow,
} from '@/lib/announcements';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import { ANNOUNCEMENT_TYPES, type AnnouncementType } from '@beco/types';

export const metadata: Metadata = {
  title: 'Announcements',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const WINDOWS: AnnouncementWindow[] = ['live', 'scheduled', 'expired', 'off'];

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/announcements');
  const params = await searchParams;
  const typeRaw = one(params.type);
  const windowRaw = one(params.window);
  const filters: AnnouncementListFilters = {
    search: one(params.search) || undefined,
    type: (ANNOUNCEMENT_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as AnnouncementType) : undefined,
    window: WINDOWS.includes(windowRaw as AnnouncementWindow) ? (windowRaw as AnnouncementWindow) : undefined,
  };

  const supabase = await getSupabase();
  const announcements = await fetchAnnouncements(supabase, filters);
  const editId = one(params.edit);
  const creating = one(params.new) === '1' && !editId;
  const editing = editId
    ? (announcements.find((row) => row.id === editId) ?? (await fetchAnnouncementById(supabase, editId)))
    : null;

  return (
    <>
      <PageHeading eyebrow="Storefront" title="Announcements" />
      <div className="mb-4">
        <AnnouncementFilters />
      </div>
      <div className="pb-24">
        <AnnouncementResults announcements={announcements} editing={editing} creating={creating} />
      </div>
      <NewAnnouncementFab />
    </>
  );
}
