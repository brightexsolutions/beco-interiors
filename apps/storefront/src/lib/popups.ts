import { createClient } from '@supabase/supabase-js';
import type { PopupSection, PopupTrigger, PopupVariant, ProductImage } from '@beco/types';

/**
 * The live storefront pop ups, D159.
 *
 * As with announcements (D36), scheduling is the RLS policy's job:
 * `popups_read_live` only lets anonymous reads see rows that are switched on
 * and inside their window. Several can be live, each on its own trigger:
 * one after a wait, another at a section. The host opens one at a time.
 *
 * Its photographs are the catalogue's own. The products are read with the
 * anonymous key too, so an unpublished or deleted stone falls out of the
 * strip without the pop up needing to know.
 */
export interface PopupImage {
  path: string;
  alt: string;
  blur?: string | undefined;
}

export interface LivePopup {
  id: string;
  variant: PopupVariant;
  eyebrow: string | null;
  badge: string | null;
  title: string;
  body: string | null;
  cta: { label: string; href: string } | null;
  trigger: PopupTrigger;
  triggerValue: number;
  triggerSection: PopupSection | null;
  showAgainDays: number;
  images: PopupImage[];
}

export interface PopupRow {
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
}

export interface PopupProduct {
  id: string;
  images: ProductImage[] | null;
}

const byRole = (images: ProductImage[], role: ProductImage['role']) =>
  [...images].filter((i) => i.role === role).sort((a, b) => a.sort - b.sort)[0];

/**
 * One photograph per stone. The split look's single frame is the room the
 * stone was fitted in, which sells it better than a flat slab; the offer
 * strip's small tiles are the slab itself, where the veining is the point.
 * Either falls back to whatever the stone has.
 */
export const pickPopupImage = (images: ProductImage[], variant: PopupVariant): ProductImage | undefined => {
  if (images.length === 0) return undefined;
  const preferred = variant === 'split' ? ['application', 'slab'] : ['slab', 'bookmatch'];
  for (const role of preferred) {
    const hit = byRole(images, role as ProductImage['role']);
    if (hit) return hit;
  }
  return [...images].sort((a, b) => a.sort - b.sort)[0];
};

/** The row and its stones, as the host component draws them. Pure, so it is tested without a database. */
export const toLivePopup = (row: PopupRow, products: PopupProduct[]): LivePopup | null => {
  const byId = new Map(products.map((p) => [p.id, p]));
  const images = row.product_ids
    .map((id) => byId.get(id))
    .map((p) => (p ? pickPopupImage(p.images ?? [], row.variant) : undefined))
    .filter((i): i is ProductImage => Boolean(i))
    .map((i) => ({ path: i.path, alt: i.alt, blur: i.blur }));

  // A pop up whose every stone has gone is copy floating on nothing. Better
  // to show nothing than a card built around an empty frame.
  if (images.length === 0) return null;

  return {
    id: row.id,
    variant: row.variant,
    eyebrow: row.eyebrow,
    badge: row.badge,
    title: row.title,
    body: row.body,
    cta: row.cta_label && row.cta_url ? { label: row.cta_label, href: row.cta_url } : null,
    trigger: row.trigger,
    triggerValue: row.trigger_value,
    triggerSection: row.trigger_section,
    showAgainDays: row.show_again_days,
    images: row.variant === 'split' ? images.slice(0, 1) : images,
  };
};

/** At most this many are armed on a page. More than that is a site shouting. */
export const MAX_LIVE_POPUPS = 4;

export const getLivePopups = async (): Promise<LivePopup[]> => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb
    .from('popups')
    .select(
      'id,variant,eyebrow,badge,title,body,cta_label,cta_url,product_ids,trigger,trigger_value,trigger_section,show_again_days',
    )
    .order('priority', { ascending: false })
    .order('starts_at', { ascending: false })
    .limit(MAX_LIVE_POPUPS);

  // A promotion is never important enough to break the page under it.
  if (error || !data || data.length === 0) return [];
  const rows = data as PopupRow[];
  const ids = [...new Set(rows.flatMap((row) => row.product_ids))];
  if (ids.length === 0) return [];

  const { data: products, error: productsError } = await sb.from('products').select('id,images').in('id', ids);
  if (productsError) return [];
  const stones = (products as PopupProduct[] | null) ?? [];
  return rows.map((row) => toLivePopup(row, stones)).filter((popup): popup is LivePopup => popup !== null);
};
