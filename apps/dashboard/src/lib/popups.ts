import type { PopupSection, PopupTrigger, PopupVariant, ProductImage } from '@beco/types';
import { POPUP_SECTIONS, POPUP_TRIGGERS, POPUP_VARIANTS } from '@beco/types';
import { createServerClient } from '@beco/supabase-client';
import { announcementWindow, type AnnouncementWindow } from './announcements';

type SupabaseClient = ReturnType<typeof createServerClient>;

export const POPUP_VARIANT_VALUES = POPUP_VARIANTS;
export const POPUP_TRIGGER_VALUES = POPUP_TRIGGERS;
export const POPUP_SECTION_VALUES = POPUP_SECTIONS;

export const POPUP_VARIANT_LABEL: Record<PopupVariant, string> = {
  split: 'Photo beside copy',
  offer: 'Offer card',
};

export const POPUP_VARIANT_HINT: Record<PopupVariant, string> = {
  split: 'One room photo, copy on white.',
  offer: 'Charcoal card, badge, strip of stones.',
};

export const POPUP_TRIGGER_LABEL: Record<PopupTrigger, string> = {
  delay: 'After a wait',
  scroll: 'After scrolling',
  exit: 'When leaving',
  section: 'On reaching a section',
};

/** Each section by the heading a visitor sees there, so Beco can find it on the site. */
export const POPUP_SECTION_LABEL: Record<PopupSection, string> = {
  'home-ranges': 'Home: Six ranges, one supplier',
  'home-stones': 'Home: Stone that behaves like a finished surface',
  'home-bookmatch': 'Home: Two slabs. One block.',
  'home-beyond-stone': 'Home: A finished room needs more than a worktop',
  'home-process': 'Home: From a shortlist to a priced quote',
  'home-services': 'Home: We do not just supply it',
  'home-showroom': 'Home: The showroom film',
  'product-details': 'Any product page: its details',
  'site-footer': 'Any page: the footer',
};

/** Same four states as announcements, by the same rule. */
export type PopupWindow = AnnouncementWindow;
export const popupWindow = announcementWindow;

export interface StaffPopup {
  id: string;
  variant: PopupVariant;
  eyebrow: string | null;
  badge: string | null;
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  productIds: string[];
  trigger: PopupTrigger;
  triggerValue: number;
  triggerSection: PopupSection | null;
  showAgainDays: number;
  startsAt: string;
  endsAt: string;
  priority: number;
  isActive: boolean;
}

/** A stone the editor can put in a pop up, with the one photograph it will show. */
export interface PopupStone {
  id: string;
  name: string;
  slabPath: string | null;
  roomPath: string | null;
}

/** What opens it, in a few words, for the list. */
export const describeTrigger = (row: Pick<StaffPopup, 'trigger' | 'triggerValue' | 'triggerSection'>): string => {
  if (row.trigger === 'delay') return row.triggerValue === 0 ? 'At once' : `After ${row.triggerValue}s`;
  if (row.trigger === 'scroll') return `At ${row.triggerValue}% scrolled`;
  if (row.trigger === 'section') {
    return row.triggerSection ? `At ${POPUP_SECTION_LABEL[row.triggerSection]}` : 'At a section';
  }
  return 'When leaving';
};

export const popupMutationMessage = (error: { message?: string; code?: string } | null | undefined): string => {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (/popups_dates/i.test(message)) return 'The end has to be after the start.';
  if (/popups_cta_pair/i.test(message)) return 'A button needs both a label and a link.';
  if (/popups_products_bounded/i.test(message)) return 'Pick up to 6 stones.';
  if (/popups_trigger_value/i.test(message)) return 'That wait or scroll depth is out of range.';
  if (/popups_trigger_section/i.test(message)) return 'Pick the section it waits for.';
  if (code === '42501') return 'You do not have permission to change pop ups.';
  if (message) return message;
  return 'The database refused that write.';
};

const COLUMNS =
  'id, variant, eyebrow, badge, title, body, cta_label, cta_url, product_ids, trigger, trigger_value, trigger_section, show_again_days, starts_at, ends_at, priority, is_active';

interface PopupDbRow {
  id: string;
  variant: PopupVariant;
  eyebrow: string | null;
  badge: string | null;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  product_ids: string[];
  trigger: PopupTrigger;
  trigger_value: number;
  trigger_section: PopupSection | null;
  show_again_days: number;
  starts_at: string;
  ends_at: string;
  priority: number;
  is_active: boolean;
}

export const toPopup = (row: PopupDbRow): StaffPopup => ({
  id: row.id,
  variant: row.variant,
  eyebrow: row.eyebrow,
  badge: row.badge,
  title: row.title,
  body: row.body,
  ctaLabel: row.cta_label,
  ctaUrl: row.cta_url,
  productIds: row.product_ids ?? [],
  trigger: row.trigger,
  triggerValue: row.trigger_value,
  triggerSection: row.trigger_section,
  showAgainDays: row.show_again_days,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  priority: row.priority,
  isActive: row.is_active,
});

export async function fetchPopups(supabase: SupabaseClient): Promise<StaffPopup[]> {
  const { data, error } = await supabase
    .from('popups')
    .select(COLUMNS)
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load pop ups: ${error.message}`);
  return ((data ?? []) as PopupDbRow[]).map(toPopup);
}

const firstOfRole = (images: ProductImage[], role: ProductImage['role']) =>
  images.filter((i) => i.role === role).sort((a, b) => a.sort - b.sort)[0]?.path ?? null;

export const toPopupStone = (row: { id: string; name: string; images: ProductImage[] | null }): PopupStone => {
  const images = row.images ?? [];
  const any = [...images].sort((a, b) => a.sort - b.sort)[0]?.path ?? null;
  return {
    id: row.id,
    name: row.name,
    slabPath: firstOfRole(images, 'slab') ?? firstOfRole(images, 'bookmatch') ?? any,
    roomPath: firstOfRole(images, 'application') ?? firstOfRole(images, 'slab') ?? any,
  };
};

/** Published products with at least one photograph: the only ones a visitor could see in a pop up. */
export async function fetchPopupStones(supabase: SupabaseClient): Promise<PopupStone[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, images')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('name')
    .limit(500);
  if (error) throw new Error(`Could not load stones: ${error.message}`);
  return ((data ?? []) as { id: string; name: string; images: ProductImage[] | null }[])
    .map(toPopupStone)
    .filter((stone) => stone.slabPath !== null);
}
