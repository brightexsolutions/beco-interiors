import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { AnnouncementFilters } from '@/components/announcement-filters';
import { AnnouncementPreview } from '@/components/announcement-preview';
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
  const [announcements, live] = await Promise.all([
    fetchAnnouncements(supabase, filters),
    fetchAnnouncements(supabase, { window: 'live' }),
  ]);
  const showing = [...live].sort((a, b) => b.priority - a.priority);
  const editId = one(params.edit);
  const creating = one(params.new) === '1' && !editId;
  const editing = editId
    ? (announcements.find((row) => row.id === editId) ?? (await fetchAnnouncementById(supabase, editId)))
    : null;

  return (
    <>
      <PageHeading eyebrow="Storefront" title="Announcements" actions={<NewAnnouncementFab />} />
      <section aria-labelledby="on-site-now" className="mb-8 rounded-panel border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="on-site-now" className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
            On the site now
          </h2>
          {showing.length > 1 ? (
            <p className="font-ui text-sm text-neutral-500">{showing.length} live, rotating in priority order</p>
          ) : null}
        </div>
        {showing[0] ? (
          <AnnouncementPreview
            title={showing[0].title}
            body={showing[0].body ?? ''}
            type={showing[0].type}
            ctaLabel={showing[0].ctaLabel ?? ''}
          />
        ) : (
          <p className="font-ui text-base text-neutral-700">Nothing is live. The bar is hidden on the site.</p>
        )}
      </section>
      <div className="mb-4">
        <AnnouncementFilters />
      </div>
      <div className="pb-24">
        <AnnouncementResults announcements={announcements} editing={editing} creating={creating} />
      </div>
    </>
  );
}
