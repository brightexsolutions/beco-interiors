-- Categories, products, and slug history.

create table categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  parent_id       uuid references categories(id) on delete set null,
  description     text,
  meta_title      text,
  meta_description text,
  hero_image      jsonb,
  sort_order      int not null default 0,
  is_published    boolean not null default false,
  source_path     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  sku                text,
  category_id        uuid references categories(id) on delete set null,
  description        text,
  short_description  text,
  price              numeric(12,2),
  compare_at_price   numeric(12,2),
  -- Deliberately separate from availability, so a card can say In Stock and
  -- POA at once without ambiguity. Ambiguity here costs sales.
  price_display_mode price_display_mode not null default 'poa',
  availability       availability not null default 'poa',
  -- Book match versus one face. A manufacturing property confirmed by Beco,
  -- not a photography gap, and a specification buyers ask about.
  face_type          face_type,
  unit               text,
  badge              product_badge,
  images             jsonb not null default '[]'::jsonb,
  specs              jsonb not null default '[]'::jsonb,
  meta_title         text,
  meta_description   text,
  is_published       boolean not null default false,
  sort_order         int not null default 0,
  source_path        text,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index products_category_idx  on products (category_id) where deleted_at is null;
create index products_published_idx on products (is_published) where deleted_at is null;

-- A POA product must not carry a price, and a fixed price product must.
-- Enforced here rather than trusted to the application.
alter table products add constraint products_price_matches_mode check (
  (price_display_mode = 'poa'   and price is null) or
  (price_display_mode = 'fixed' and price is not null)
);

-- Slug history, so renaming a Drive folder does not 404 a live URL and lose
-- its ranking. Every former slug 301s to the current one. See REVIEW 2.3.
create table product_slugs (
  slug       text primary key,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function record_product_slug() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or old.slug is distinct from new.slug then
    insert into product_slugs (slug, product_id) values (new.slug, new.id)
    on conflict (slug) do nothing;
  end if;
  return new;
end;
$$;

create trigger products_slug_history after insert or update of slug on products
  for each row execute function record_product_slug();

-- Counts drive automatic index gating: zero published products means the
-- category is noindex and out of the sitemap, flipping on first import. D27.
create view category_product_counts as
  select c.id as category_id,
         count(p.id) filter (where p.is_published and p.deleted_at is null) as published_product_count
  from categories c left join products p on p.category_id = c.id
  group by c.id;

alter table categories    enable row level security;
alter table products      enable row level security;
alter table product_slugs enable row level security;

create policy categories_read_published on categories for select using (is_published);
create policy categories_read_staff on categories for select
  using (current_user_role() is not null);
create policy categories_write on categories for all
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'))
  with check (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));

-- Anonymous sees published, non deleted products only.
create policy products_read_published on products for select
  using (is_published and deleted_at is null);
create policy products_read_staff on products for select
  using (current_user_role() is not null);
create policy products_write on products for all
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'))
  with check (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));

create policy product_slugs_read on product_slugs for select using (true);
create policy product_slugs_write on product_slugs for all
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'))
  with check (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));

create trigger categories_audit after insert or update or delete on categories
  for each row execute function audit_trigger();
create trigger products_audit after insert or update or delete on products
  for each row execute function audit_trigger();
