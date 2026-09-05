// Domain enums. These mirror the Postgres enums in supabase/migrations.
// Kept in one place so the database and the apps cannot drift apart.

export const USER_ROLES = [
  'beco_admin',
  'beco_sales',
  'beco_product_manager',
  'beco_editor',
  'brightex_admin',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRICE_DISPLAY_MODES = ['fixed', 'poa'] as const;
export type PriceDisplayMode = (typeof PRICE_DISPLAY_MODES)[number];

export const AVAILABILITY = ['in_stock', 'pre_order', 'poa'] as const;
export type Availability = (typeof AVAILABILITY)[number];

/** Book match versus one face. A manufacturing property, not a photography gap. */
export const FACE_TYPES = ['book_match', 'one_face'] as const;
export type FaceType = (typeof FACE_TYPES)[number];

export const QUOTE_STATUSES = ['new', 'reviewing', 'quoted', 'won', 'lost'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** whatsapp exists from day one though nothing writes it yet, leaving the seam open. */
export const QUOTE_SOURCES = ['web', 'walk_in', 'phone', 'whatsapp'] as const;
export type QuoteSource = (typeof QUOTE_SOURCES)[number];

export const ORDER_STATUSES = ['pending', 'confirmed', 'fulfilled', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Ordered. The product gallery renders in this order. */
export const IMAGE_ROLES = ['slab', 'on_stand', 'bookmatch', 'application', 'unknown'] as const;
export type ImageRole = (typeof IMAGE_ROLES)[number];

/** Which kind of installation an application shot came from, per Irene: Beco
    does both. Optional, and set manually rather than by the import
    pipeline, which has no source for it: no Drive naming convention
    carries this today, per docs/CONTENT-CONVENTIONS.md. Absent on every
    real photo until Beco confirms which project each one is. */
export const PROJECT_TYPES = ['residential', 'commercial'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const ANALYTICS_EVENTS = [
  'page_view',
  'product_view',
  'add_to_cart',
  'quote_started',
  'quote_submitted',
  'whatsapp_click',
  'call_click',
  'post_read',
  'document_downloaded',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
