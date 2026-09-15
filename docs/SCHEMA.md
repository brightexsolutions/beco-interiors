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

**RLS.** Anonymous reads published only. `beco_product_manager` and above write.

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
| `specs` | jsonb | `[{label, value}]` |
| `meta_title`, `meta_description` | text | |
| `is_published` | boolean | |
| `sort_order` | int | |
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

**RLS.** Anonymous reads `is_published and deleted_at is null`. `beco_product_manager` and above
write.

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
| `subtotal`, `vat_amount`, `total_amount` | numeric(12,2) | |
| `currency` | text default 'KES' | |
| `valid_until` | date | |
| `finalized_at` | timestamptz null | Stamped on reaching won |
| `lost_reason` | text null | |
| `converted_order_id` | uuid FK orders null | |
| `updated_at` | timestamptz | **Optimistic locking.** Compared on save, refused if stale, so two salespeople cannot silently overwrite each other |
| `deleted_at` | timestamptz null | |

**RLS.** Anonymous may `insert` only, through a rate limited server action. `beco_sales` reads
all, writes only rows where it is `assigned_to` unless an admin reassigns. Reassignment is
itself audited.

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

Keeping `list_price` beside `unit_price` makes every discount measurable after the fact, which
is what makes D7's free price override safe without an approval gate.

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
| `subtotal`, `vat_amount`, `total_amount` | numeric(12,2) | |
| `created_by`, `salesperson_id` | uuid FK users | Attribution survives conversion |
| `deleted_at` | timestamptz null | |

**Payments are offline**, so reports show invoiced and collected as two separate figures rather
than pretending to know one from the other.

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
which makes "was this sent" a three state question rather than two.

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

Written by trigger, not by application code, so it cannot be forgotten. **Read by admin roles
through the dashboard, filterable by user and date.** An audit trail nobody can read is not an
audit trail.

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

### testimonials, announcements

`announcements` carries `starts_at`, `ends_at`, `priority`, `is_active`, so a mid year sale
appears and retires on its own and nobody has to remember to take it down.

### settings

Key/value. VAT rate, quote validity days, bank and till details, notification recipients,
WhatsApp number, quote footer, and `brightex_allowed_emails` for the D42 Studio gate. **Without
this table each of those is a code deploy.**

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
| `current_user_role()` | Reads the caller's role for policies |
| `audit_trigger()` | Writes `audit_log` on insert, update and soft delete |

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
  blog_posts          R**    R       R         RW       RW           RW
  users               -      -       -         -        R            RW
  audit_log           -      -       -         -        R            R
  settings            R***   R       R         R        RW           RW
  analytics_events    C*     -       -         -        R            R
  import_*            -      -       R         -        R            RW

  R read   W write   C create only   -  denied
  *   through rate limited server actions only
  **  published posts only
  *** public keys only, never bank details
  +   reads all, writes only its own unless an admin reassigns
```

Every one of these is proven in pgTAP, testing the negative rather than only the positive. See
the `rls-policy` skill.
