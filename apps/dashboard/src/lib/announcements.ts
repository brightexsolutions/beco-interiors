import type { AnnouncementType } from '@beco/types';
import { ANNOUNCEMENT_TYPES } from '@beco/types';
import { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

export const ANNOUNCEMENT_TYPE_LABEL: Record<AnnouncementType, string> = {
  sale: 'Sale',
  clearance: 'Clearance',
  notice: 'Notice',
  event: 'Event',
};

export const ANNOUNCEMENT_TYPE_VALUES = ANNOUNCEMENT_TYPES;

export type AnnouncementWindow = 'live' | 'scheduled' | 'expired' | 'off';

export const ANNOUNCEMENT_WINDOW_LABEL: Record<AnnouncementWindow, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  expired: 'Ended',
  off: 'Off',
};

export interface StaffAnnouncement {
  id: string;
  title: string;
  body: string | null;
  type: AnnouncementType;
  ctaLabel: string | null;
  ctaUrl: string | null;
  startsAt: string;
  endsAt: string;
  priority: number;
  isActive: boolean;
  createdBy: string | null;
}

export interface AnnouncementListFilters {
  search?: string | undefined;
  type?: AnnouncementType | undefined;
  window?: AnnouncementWindow | undefined;
}

const sanitizeSearchTerm = (term: string): string => term.replace(/[,()]/g, '').trim();

export const announcementWindow = (
  row: Pick<StaffAnnouncement, 'isActive' | 'startsAt' | 'endsAt'>,
  now = Date.now(),
): AnnouncementWindow => {
  if (!row.isActive) return 'off';
  const start = Date.parse(row.startsAt);
  const end = Date.parse(row.endsAt);
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'live';
};

const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string =>
  parts.find((item) => item.type === type)?.value ?? '';

export const toDatetimeLocalValue = (iso: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}T${part(parts, 'hour')}:${part(parts, 'minute')}`;
};

/** Nairobi is UTC+3 with no DST, so a fixed offset is honest. */
export const fromDatetimeLocalValue = (value: string): string => {
  if (!value) return '';
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+03:00`).toISOString();
};

export const formatAnnouncementWhen = (iso: string): string =>
  new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
    hourCycle: 'h23',
  });

export const announcementMutationMessage = (
  error: { message?: string; code?: string } | null | undefined,
): string => {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (code === '23514' || /announcements_dates/i.test(message)) {
    return 'The end has to be after the start.';
  }
  if (code === '42501') return 'You do not have permission to change announcements.';
  if (message) return message;
  return 'The database refused that write.';
};

const toAnnouncement = (row: {
  id: string;
  title: string;
  body: string | null;
  type: AnnouncementType;
  cta_label: string | null;
  cta_url: string | null;
  starts_at: string;
  ends_at: string;
  priority: number;
  is_active: boolean;
  created_by: string | null;
}): StaffAnnouncement => ({
  id: row.id,
  title: row.title,
  body: row.body,
  type: row.type,
  ctaLabel: row.cta_label,
  ctaUrl: row.cta_url,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  priority: row.priority,
  isActive: row.is_active,
  createdBy: row.created_by,
});

export async function fetchAnnouncements(
  supabase: SupabaseClient,
  filters: AnnouncementListFilters = {},
): Promise<StaffAnnouncement[]> {
  let query = supabase
    .from('announcements')
    .select('id, title, body, type, cta_label, cta_url, starts_at, ends_at, priority, is_active, created_by')
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false })
    .limit(200);

  const term = filters.search ? sanitizeSearchTerm(filters.search) : '';
  if (term) query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  if (filters.type) query = query.eq('type', filters.type);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load announcements: ${error.message}`);

  let rows = (data ?? []).map(toAnnouncement);
  if (filters.window) {
    rows = rows.filter((row) => announcementWindow(row) === filters.window);
  }
  return rows;
}

export async function fetchAnnouncementById(
  supabase: SupabaseClient,
  id: string,
): Promise<StaffAnnouncement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, type, cta_label, cta_url, starts_at, ends_at, priority, is_active, created_by')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load that announcement: ${error.message}`);
  return data ? toAnnouncement(data) : null;
}
