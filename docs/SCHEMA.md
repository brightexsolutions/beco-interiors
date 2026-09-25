# Data Model

Reference BEC-2026-004-PLAN. Every table, its columns, and the RLS intent behind it.

**Rule from the `supabase-migration` skill: a table does not exist without its RLS policies and
their tests in the same migration.** There is no follow up commit for policies.

Conventions: `snake_case` columns, `timestamptz` always, `numeric(12,2)` for money never float,
`uuid` primary keys defaulting to `gen_random_uuid()`.

---

## Enums

```sql
user_role          beco_admin | beco_sales | beco_product_manager | beco_editor | brightex_admin
price_display_mode fixed | poa
availability       in_stock | pre_order | poa
face_type          book_match | one_face
product_badge      hot | new | sale | clearance
quote_status       new | reviewing | quoted | won | lost
quote_source       web | walk_in | phone | whatsapp
order_status       pending | confirmed | fulfilled | cancelled
payment_status     unpaid | paid
fulfilment         pickup | delivery
document_type      quote | receipt
audit_action       create | update | delete | login | send | export | assign
image_role         slab | on_stand | bookmatch | application | unknown
import_outcome     new | changed | moved | unchanged | missing
announcement_type  sale | clearance | notice | event
post_status        draft | published
```

`quote_source` carries `whatsapp` from day one though nothing writes it yet, so the seam for
automated intake exists without a later migration.

---

## Core commerce

### users

Profile table alongside Supabase Auth. **No public signup.** Rows exist only because Brightex
created them.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Matches `auth.users.id` |
| `email` | citext unique | Also the Studio gate, see D42 |
| `full_name` | text | |
| `role` | user_role | |
| `is_active` | boolean default true | False ends the session and blocks login. **Never delete a user**, it orphans audit history and quote attribution |
| `must_change_password` | boolean default true | Forced change on first login |
| `last_login_at` | timestamptz | |
| `is_public` | boolean default false | Storefront `/team` only. Check `users_only_sales_are_public` refuses the flag on any role but `beco_sales` |
| `can_write_blog` | boolean default false | Kept on the row. Does not open Studio. Write is `is_brightex_user()` |
| `can_read_audit` | boolean default false | Brightex assigns this. Role `brightex_admin` already reads `/audit` |
| `public_title`, `public_phone` | text null | Shown on `/team` |
| `public_photo` | jsonb null | Catalogue stem plus alt, width, height, blur. Derivatives at 400/800/1600 webp on R2 |
| `sort_order` | int | `/team` listing order |
| `created_by` | uuid FK users | |

**RLS.** A user reads their own row. `beco_admin` reads all Beco users. `brightex_admin` reads
and writes all. Nobody may change their own `role`, enforced by policy not by UI.

### categories

Self referential, so subcategories need no second table.

**Exactly two levels, enforced by a trigger** rather than by convention, because the
storefront's browse tree assumes it and a third level would render as a group with neither
products nor children. `enforce_category_depth` refuses a grandchild on insert and on update, a
category made its own parent, and a category with children being given a parent. See migration
19 and D52.

Five GROUPS sit above the Drive folders: Sintered Stone, Wall Panels, Flooring, Hardware and
Accessories. Lighting stays top level with no children by design. A group is an editorial row,
so `source_path` is null on it, which is what keeps the importer, which upserts on
`source_path`, from ever colliding with one.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name`, `slug` | text, slug unique | Slug derives from the Drive folder name |
| `parent_id` | uuid FK categories | Null on a group and on Lighting. Depth capped at two by trigger |
| `description` | text | 150 to 400 words. **A grid alone does not rank** |
| `meta_title`, `meta_description` | text | SEO overrides, editable without a deploy |
| `hero_image` | jsonb | |
| `sort_order` | int | |
| `is_published` | boolean | |
| `source_path` | text unique | Drive folder path, keeps taxonomy traceable. **The category's identity, not its slug**, see migration 11. Null on an editorial group, and a unique constraint permits many nulls |

`published_product_count` is a view or generated value. **Zero means `noindex` and no sitemap
entry**, flipping automatically on first import. See D27.

**RLS.** Anonymous reads published only. `beco_product_manager` and above write. Writes come
from the dashboard's `/categories` screen (D91) as of migration 49, not only from the importer:
`categories_touch_updated_at` (migration 53) bumps `updated_at` on every write, the same
optimistic lock the products editor already relies on. Nothing bumped it before that migration,
so it stayed frozen at insert time forever.

### category_slugs

Slug history for categories, the same job `product_slugs` does for products: a rename made in
`/categories` 301s from its former URL instead of losing whatever it had ranked for. Migration
49, D91.

| Column | Type |
|---|---|
| `slug` | text PK |
| `category_id` | uuid FK categories |
| `created_at` | timestamptz |

### products

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name`, `slug` | text, slug unique | |
| `sku` | text | |
| `category_id` | uuid FK categories | |
| `description`, `short_description` | text | |
| `price` | numeric(12,2) null | Null when POA |
| `compare_at_price` | numeric(12,2) null | Struck through original during a sale |
| `price_display_mode` | price_display_mode | **Deliberately separate from availability.** A card can say In Stock and POA at once without ambiguity |
| `availability` | availability | |
| `face_type` | face_type null | Book match or one face. A real specification buyers ask about |
| `unit` | text | "per slab", "per piece", "per metre" |
| `badge` | product_badge null | |
| `images` | jsonb | Role structured, below |
| `specs` | jsonb | Object of label to value, `{ "Finish": "Silky" }` |
| `meta_title`, `meta_description` | text | |
| `is_published` | boolean | |
| `sort_order` | int | |
| `stock_quantity` | numeric(12,2) null | Manual count. NULL is uncounted. Zero is out of stock on the storefront. Half units only when `unit = 'per slab'` |
| `low_stock_threshold` | numeric(12,2) null | Flag on the catalogue list when quantity is at or below this and still above zero |
| `source_path` | text | |
| `deleted_at` | timestamptz null | Soft delete |

**`images` carries roles, never a flat list:**

```json
[{ "role": "slab",
   "path": "sintered-stones-12mm/limestone-ivory/slab",
   "alt": "Limestone Ivory sintered stone slab",
   "width": 1600, "height": 1067,
   "blur": "data:image/...", "sort": 0 }]
```

An entry the importer wrote also carries `driveFileId`, the Drive file it came from, so a re
run can find and keep that exact entry when the file is unchanged rather than losing it to a
full array replace (D90). An entry uploaded through the dashboard editor has no `driveFileId`
and never needs one, since nothing about it depends on Drive.

**RLS.** Anonymous reads `is_published and deleted_at is null`. `beco_product_manager` and admins
write, including `stock_quantity` and `low_stock_threshold`. `beco_sales` and anon cannot. Soft
delete sets `deleted_at`; existing quote lines keep their `product_id`, description and price.

### product_slugs

Slug history, so a renamed Drive folder does not 404 a live URL and lose its ranking. Every
former slug 301s to the current one. From `docs/REVIEW.md` 2.3.

| Column | Type |
|---|---|
| `slug` | text PK |
| `product_id` | uuid FK products |
| `created_at` | timestamptz |

---

## Quotes: the product

### quotes

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `reference_number` | text unique | `BEC-Q-00042`, minted by `next_quote_reference()` |
| `customer_name`, `customer_phone` | text | The only hard required fields |
| `customer_email`, `company` | text null | |
| `project_type` | text null | |
| `fulfilment` | fulfilment null | |
| `delivery_address`, `timeline`, `budget_note`, `project_details` | text null | Collected by the prototype's own form and absent from the original schema |
| `source` | quote_source | |
| `status` | quote_status default 'new' | |
| `created_by` | uuid FK users null | **Null for web submissions.** A web quote arrives unowned |
| `assigned_to` | uuid FK users null | |
| `subtotal`, `vat_amount`, `total_amount` | numeric(12,2) | Kept in sync with priced `quote_items` by `refresh_quote_money`. Unpriced lines do not zero priced ones. Migration 44 |
| `currency` | text default 'KES' | |
| `valid_until` | date | |
| `finalized_at` | timestamptz null | Stamped on reaching won or lost. Cleared if the quote leaves those states |
| `reviewing_at`, `quoted_at`, `won_at`, `lost_at`, `reopened_at` | timestamptz null | Lifecycle dates for the Dates rail. Persist after reopen. Trigger `stamp_quote_milestones`, migration 37 |
| `lost_reason` | text null | |
| `converted_order_id` | uuid FK orders null | |
| `updated_at` | timestamptz | **Optimistic locking.** Compared on save, refused if stale, so two salespeople cannot silently overwrite each other |
| `deleted_at` | timestamptz null | |
| `requires_approval` | boolean default false | D86. True when a line deviates from the catalogue (`unit_price <> list_price`) or is a priced custom line (`product_id is null`). Recomputed by a trigger on every `quote_items` change, never set by hand |
| `approved_by`, `approved_at` | uuid FK users null, timestamptz null | Set only by `is_admin()`. Cleared automatically the moment the lines change again after approval |

**RLS.** Anonymous may `insert` only, through a rate limited server action. `beco_sales` reads
all, writes only rows where it is `assigned_to` unless an admin reassigns. Reassignment is
itself audited. `requires_approval`, `approved_by` and `approved_at` are pinned in
`quotes_update_own`: a self-update by `beco_sales` may not move them, only an admin write or
the approval trigger can. A `check` constraint refuses `status in ('quoted','won','lost')` while
`requires_approval` and `approved_at is null`, enforced at the database regardless of RLS or
the UI. See D86.

### quote_items

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `quote_id` | uuid FK quotes on delete cascade | |
| `product_id` | uuid FK products **null** | **Nullable on purpose.** A salesperson can add an item not yet in the catalog rather than being blocked at the counter |
| `description` | text | Snapshot, so the line survives the product changing |
| `quantity` | numeric(12,2) | |
| `list_price` | numeric(12,2) null | What it should have cost |
| `unit_price` | numeric(12,2) | What it did cost. **Stored on the line, never read live from products**, so a quote issued last week does not silently reprice |
| `line_total` | numeric generated always as (quantity * unit_price) stored | Derived, so it cannot disagree with its inputs |
| `notes` | text | |
| `sort_order` | int | |

Keeping `list_price` beside `unit_price` makes every discount measurable after the fact. D7
still lets any `beco_sales` set any `unit_price`, so raising a quote never waits; D86 is what
compares the two and gates FINALIZING one, not the pricing itself.

---

## Orders

### orders

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `reference_number` | text unique | `BEC-O-00042`. Absent from the original schema and needed the moment D1 lands |
| `quote_id` | uuid FK quotes null | |
| `customer_name`, `customer_phone`, `customer_email` | text | |
| `source` | quote_source | |
| `fulfilment`, `delivery_address`, `notes` | | |
| `status` | order_status default 'pending' | |
| `payment_status` | payment_status default 'unpaid' | |
| `paid_at` | timestamptz null | |
| `confirmed_at`, `fulfilled_at`, `cancelled_at` | timestamptz null | Migration 40. Status stamps, same idea as quote milestones |
| `subtotal`, `vat_amount`, `total_amount` | numeric(12,2) | Kept in sync with priced `order_items` by `refresh_order_money`. Conversion refreshes the quote first so a stale header of 0 cannot land on the order. Migration 44 |
| `created_by`, `salesperson_id` | uuid FK users | Attribution survives conversion |
| `deleted_at` | timestamptz null | |

**Payments are offline**, so reports show invoiced and collected as two separate figures rather
than pretending to know one from the other.

One live quote becomes one order: unique index `orders_one_quote_idx` on `quote_id` where the
quote is set and the order is not deleted. Conversion is `convert_quote_to_order`, not a
dashboard insert, because sales cannot write `order_items` under RLS.

### order_items

Same shape as `quote_items`: nullable `product_id`, description snapshot, `list_price` beside
`unit_price`, generated `line_total`.

---

## Documents and audit

### documents

Answers "did we send them the quote, and when" from the dashboard rather than from memory.

| Column | Type |
|---|---|
| `id` | uuid PK |
| `type` | document_type |
| `quote_id`, `order_id` | uuid FK, nullable |
| `reference_number` | text |
| `storage_path` | text |
| `generated_by` | uuid FK users |
| `sent_to` | text null |
| `sent_at` | timestamptz null |
| `sent_channel` | text null |

`sent_to` and `sent_at` are nullable because a counter customer may take only a printed copy,
which makes "was this sent" a three state question rather than two. The `/reports` sales
review PDF is generated on download and is not stored here: `document_type` is quote or
receipt only.

### audit_log

| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid FK users |
| `action` | audit_action |
| `entity_type`, `entity_id` | text, uuid |
| `before`, `after` | jsonb |
| `ip` | inet |
| `created_at` | timestamptz |

Written by trigger, not by application code, so it cannot be forgotten. **Read by
`brightex_admin`, and by anyone Brightex has granted `can_read_audit`.** Filterable
by entity and action. An audit trail nobody can read is not an audit trail.

---

## Content

### blog_posts

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title`, `slug`, `excerpt`, `body` | text | Body is markdown |
| `cover_image` | jsonb | |
| `cover_image_alt` | text | **Required before publish** |
| `category`, `tags` | text, jsonb | |
| `meta_title`, `meta_description` | text | |
| `target_term` | text | The post exists to own a search term |
| `reading_time` | int | Computed |
| `status` | post_status | |
| `published_at` | timestamptz null | |
| `author` | text | **A person, never "AI"** |
| `generated_by_model`, `generation_prompt` | text null | So an underperforming post is traceable to what produced it |

Dashboard authoring is `/studio/blog`. Write is `is_brightex_user()` only
(role plus the allowlist, D42). `users.can_write_blog` remains on the row
but does not open Studio or `blog_posts`. Anon still reads published rows
only. Cover alt is required before publish.

### testimonials, announcements

`announcements` carries `starts_at`, `ends_at`, `priority`, `is_active`, so a mid year sale
appears and retires on its own and nobody has to remember to take it down. Anonymous reads are
only live rows inside the window. Staff read all. `beco_admin` and `brightex_admin` write.
Dashboard authoring is `/announcements`. Audit trigger already on the table.

### settings

Key/value. VAT rate, quote validity days, payment channels (bank, till, paybill,
send money), notification recipients, WhatsApp number, quote footer, and
`brightex_allowed_emails` for the D42 Studio gate. **Without this table each of
those is a code deploy.** Dashboard authoring is `/settings`.
Launch date stays on `/launch`. `notification_recipients` is a jsonb email list.
Paybill, till and send-money numbers stay off `settings_read_public`, same as
bank details.

`site_launch_at` (nullable ISO instant) and `site_launch_live` (boolean) drive the first
anniversary countdown and reveal, set from `apps/dashboard`'s `/launch` control. Both are on
the `settings_read_public` allowlist because the storefront renders them server side for
anonymous visitors. See migration 25 and D80.

### analytics_events

`event_type`: `page_view`, `product_view`, `add_to_cart`, `quote_started`, `quote_submitted`,
`whatsapp_click`, `call_click`, `post_read`, `document_downloaded`.

`whatsapp_click` and `call_click` carry the originating product or category in `metadata`,
because those two leads leave the site into channels analytics cannot follow and that is the
only signal we get.

**Needs a retention policy.** A row per page view will outgrow a 500MB free tier eventually.

---

## Import pipeline

### import_files

What makes change detection work without re downloading anything.

| Column | Type |
|---|---|
| `drive_file_id` | text PK |
| `path`, `md5_checksum` | text |
| `size_bytes` | bigint |
| `drive_modified_time` | timestamptz |
| `product_id` | uuid FK products null |
| `role` | image_role null |
| `status` | import_outcome |
| `first_seen_at`, `last_seen_at`, `imported_at` | timestamptz |

### import_runs, import_issues, import_state

`import_runs` one row per run with a jsonb summary. `import_issues` what was skipped and why,
which will have rows on day one and that is the point. `import_state` a single row holding the
Drive changes feed page token and the last full reconciliation timestamp.

---

## Functions

| Function | Purpose |
|---|---|
| `next_quote_reference()` | `BEC-Q-00042` from a sequence **inside the database**, so two salespeople saving in the same second cannot collide |
| `next_order_reference()` | Same for `BEC-O-00042` |
| `is_brightex_user()` | D42: `role = 'brightex_admin'` **and** email in `settings.brightex_allowed_emails`. An explicit address list, not a domain suffix, because Brightex's addresses are gmail.com |
| `current_user_role()` | Reads the caller's role for policies. Null for an inactive account |
| `audit_trigger()` | Writes `audit_log` on insert, update and soft delete |
| `submit_quote(...)` | The public quote write, one atomic transaction, `security definer`. Products, descriptions and prices resolved from the catalogue, never the request. Enforces the D68 half-slab rule per product |
| `add_catalogue_quote_line(...)` | Dashboard. Adds a published product to an existing quote, snapshots name and `list_price`, optimistic lock. Unpublished or deleted products are refused |
| `add_catalogue_quote_lines(...)` | Dashboard. Adds several published products under one lock so a second add cannot race `updated_at`. Unpublished or deleted products refuse the whole batch |
| `update_quote_lines(...)` | Dashboard. Saves every dirty line in one lock so a second row cannot race `updated_at` |
| `add_custom_quote_line(...)` | Dashboard. Adds a line with `product_id` null and a description snapshot |
| `create_counter_quote(...)` | Dashboard. Walk-in or phone quote in one transaction. `created_by` and `assigned_to` are the salesperson. Refuses `web` |
| `claim_quote(...)` | Dashboard. Salesperson takes an unassigned quote. Optimistic lock |
| `assign_quote(...)` | Dashboard. Admin assigns to a Beco salesperson or Beco admin. Refuses `brightex_admin`. Migration 34 |
| `set_quote_status(...)` | Dashboard. Moves a quote through reviewing, quoted, won or lost. Lost requires a reason. Cannot quietly un-lose; that is `reopen_quote` |
| `reopen_quote(...)` | Dashboard. Lost to reviewing when the client comes back. Clears `lost_reason` and `finalized_at`. Won stays closed. Same owner or admin, optimistic lock |
| `reissue_quote(...)` | Dashboard. Stamps a fresh `valid_until` on an expired open quote |
| `dashboard_summary()` | Dashboard home. One jsonb round trip, Africa/Nairobi boundaries, security invoker so RLS decides who sees which figures. Migration 31 |
| `convert_quote_to_order(p_quote_id, p_expected_updated_at)` | Dashboard. Won quote becomes a pending unpaid order. Refreshes quote money from the lines, copies every line price, then refreshes the order header. `salesperson_id` is the quote owner. Stamps `converted_order_id` and `finalized_at`. Does not touch stock (D89). Sales own only. Optimistic lock. Migration 40, 44 |
| `set_order_status(p_order_id, p_status, p_expected_updated_at)` | Dashboard. Pending to confirmed to fulfilled, or cancelled. Cannot move back to pending. Sales own only. Optimistic lock. Migration 40 |
| `mark_order_paid(p_order_id, p_expected_updated_at)` | Dashboard. Stamps `payment_status = paid` and `paid_at` together. Refuses cancelled and already paid. Does not touch stock. Migration 40 |
| `report_period_bounds(p_period, p_from, p_to)` | Nairobi this-month / last-month window, or a custom inclusive date range. Invalid custom dates fall back to this month. Migration 41, 43 |
| `salesperson_leaderboard(p_period, p_from, p_to)` | Admin reports. Raised, won, won value, conversion. Team and per-person invoiced vs collected (D8). SECURITY INVOKER. Migration 41, 42, 43 |
| `conversion_report(p_period, p_from, p_to)` | Admin reports. Views, add to cart, quotes, WhatsApp and call clicks per product and category. SECURITY INVOKER so a role that cannot read `analytics_events` sees empty rows. Migration 41, 43 |
| `refresh_quote_money(p_quote_id)` | Sums priced lines into the quote header (VAT inclusive, D50). Triggered from `quote_items`. Migration 33, 44 |
| `refresh_order_money(p_order_id)` | Same for an order. Triggered from `order_items`. Leaves a header-only order alone when it has no lines. Migration 44 |
| `record_sign_in()` | `security definer`. Stamps `users.last_login_at` with `clock_timestamp()` and writes the `login` `audit_log` row, which the trigger cannot. Called by the dashboard sign-in action. No-op for an inactive account. `execute` to `authenticated` only. Migration 26, D83 |
| `complete_first_login()` | `security definer`. Clears `users.must_change_password` once, for `auth.uid()`. Called by the change-password action after Supabase Auth accepts the new password. `execute` to `authenticated` only. Migration 26, D83 |
| `end_user_sessions(p_user_id)` | `security definer`. Deletes that user's GoTrue sessions and refresh tokens. `is_brightex_user()` gated. Called after deactivation and password reset. `execute` to `authenticated` only. Migration 45 |

Migration 45 adds `guard_users_staff`: even an allowlisted `brightex_admin` cannot change their own `role`, `is_active` or `email`, and cannot deactivate or demote the last active `beco_admin` or `brightex_admin`.

Migration 26 also narrowed `users_update_self_safe`: a self-update may change `full_name`, but
`role`, `is_active`, `email`, `must_change_password` and `last_login_at` are each pinned to
their stored value in the policy. Those columns move only through `users_write_brightex` (an
admin) or the two `security definer` functions above.

---

## Realtime

`quotes` and `orders` are in the `supabase_realtime` publication, with `replica identity full`
so an UPDATE payload carries the old row. That is what lets a client tell `assigned_to` changed
from null to someone else, which is the event another salesperson needs.

**Nothing else is published.** Stock has one product manager, reports are snapshots, the audit
log is historical. RLS applies to the stream, so a salesperson receives events only for rows it
could already read.

See D46 and `docs/ARCHITECTURE.md` section 17.

## RLS summary

```
                     anon  sales  prod_mgr  editor  beco_admin  brightex_admin
  published products  R      R       RW        R        RW           RW
  categories          R      R       RW        R        RW           RW
  quotes              C*     RW+     -         -        RW           RW
  orders              C*     RW+     -         -        RW           RW
  products (draft)    -      R       RW        R        RW           RW
  blog_posts          R**    R       R         R         R            RW
  users               -      -       -         -        R            RW
  audit_log           -      -       -         -        -            R
  settings            R***   R       R         R        RW           RW
  analytics_events    C*     -       -         -        R            R
  import_*            -      -       R         -        R            RW

  R read   W write   C create only   -  denied
  *   through rate limited server actions only
  **  published posts only
  *** public keys only, never bank details
  +   reads all, writes only its own unless an admin reassigns
  Audit read also opens to a user Brightex has granted `can_read_audit`.
  Studio / blog write is `is_brightex_user()` only.
```

Every one of these is proven in pgTAP, testing the negative rather than only the positive. See
the `rls-policy` skill.
