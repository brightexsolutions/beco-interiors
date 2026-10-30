-- Storefront pop ups, D159. A promotion Beco schedules from the dashboard:
-- a headline, a call to action and photographs of the stones it is about,
-- shown once to a visitor and then remembered.
--
-- Two looks, chosen per pop up:
--   split  the photograph on one side, the copy on a white panel beside it
--   offer  a charcoal card with a badge, the copy, and a strip of stones
--
-- The photographs are never uploaded here. A pop up names catalogue
-- products and shows their own images, so the stone on offer is the stone
-- in the catalogue, and an unpublished product drops out of the strip on its
-- own because anonymous reads of `products` only ever see published rows.
--
-- Several can be live at once, each on its own trigger: one after a wait,
-- another when the visitor reaches a section. The storefront opens one at a
-- time; priority decides between two that fire together.
--
-- Scheduling is the database's job, as for announcements (D36): anonymous
-- reads see only rows that are switched on and inside their window, so a sale
-- appears and retires without anyone remembering to take it down.
--
-- No delete. A finished pop up is switched off or left to expire, which keeps
-- the audit trail pointing at a real row.

create type popup_variant as enum ('split', 'offer');
create type popup_trigger as enum ('delay', 'scroll', 'exit', 'section');

create table popups (
  id              uuid primary key default gen_random_uuid(),
  variant         popup_variant not null default 'split',
  eyebrow         text,
  badge           text,
  title           text not null,
  body            text,
  cta_label       text,
  cta_url         text,
  -- Catalogue products whose photographs the pop up shows, in order. Not a
  -- foreign key: an array cannot carry one, and a missing or unpublished
  -- product is simply not drawn.
  product_ids     uuid[] not null default '{}',
  -- What opens it. `delay` waits trigger_value seconds, `scroll` waits for
  -- trigger_value percent of the page, `exit` waits for the pointer to leave
  -- toward the tabs (and falls back to scroll on a touch screen, which has
  -- no pointer to leave with). `section` waits for the named section of a
  -- page to scroll into view; the names are a fixed list in @beco/types,
  -- each one a `data-popup-section` mark on the storefront.
  trigger         popup_trigger not null default 'delay',
  trigger_value   int not null default 8,
  trigger_section text,
  -- Days before a visitor who closed it sees it again. 0 is once a visit.
  show_again_days int not null default 7,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  priority        int not null default 0,
  is_active       boolean not null default true,
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  constraint popups_dates check (ends_at > starts_at),
  constraint popups_cta_pair check ((cta_label is null) = (cta_url is null)),
  constraint popups_products_bounded check (cardinality(product_ids) <= 6),
  constraint popups_trigger_value check (
    case trigger
      when 'delay'  then trigger_value between 0 and 120
      when 'scroll' then trigger_value between 10 and 90
      else true
    end
  ),
  constraint popups_trigger_section check (
    (trigger = 'section') = (trigger_section is not null)
    and (trigger_section is null or trigger_section ~ '^[a-z0-9-]{1,40}$')
  ),
  constraint popups_show_again check (show_again_days between 0 and 90),
  constraint popups_priority check (priority between 0 and 100)
);

create index popups_live_idx on popups (priority desc, starts_at desc) where is_active;

alter table popups enable row level security;

create policy popups_read_live on popups for select
  using (is_active and now() between starts_at and ends_at);
create policy popups_read_staff on popups for select
  using (current_user_role() is not null);
create policy popups_write on popups for all
  using (is_admin()) with check (is_admin());

create trigger popups_audit after insert or update or delete on popups
  for each row execute function audit_trigger();
