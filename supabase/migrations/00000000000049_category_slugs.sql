-- Category slug history, the same protection products got in migration 4.
--
-- The category admin (this session) lets a product manager rename a range's
-- URL, for example correcting "spc-flooring" to "spc-floors" once Beco
-- confirms the real trade name. Without a history table that rename 404s
-- every inbound link and loses whatever ranking the old URL had. Every
-- former slug 301s to the current one, exactly like `product_slugs`.

create table category_slugs (
  slug        text primary key,
  category_id uuid not null references categories(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create or replace function record_category_slug() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or old.slug is distinct from new.slug then
    insert into category_slugs (slug, category_id) values (new.slug, new.id)
    on conflict (slug) do nothing;
  end if;
  return new;
end;
$$;

create trigger categories_slug_history after insert or update of slug on categories
  for each row execute function record_category_slug();

alter table category_slugs enable row level security;

create policy category_slugs_read on category_slugs for select using (true);
create policy category_slugs_write on category_slugs for all
  using (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'))
  with check (current_user_role() in ('beco_product_manager','beco_admin','brightex_admin'));

-- Backfill: every category that exists today gets its current slug recorded,
-- so a rename made the day the editor ships still has a history row to
-- redirect from on the very next rename.
insert into category_slugs (slug, category_id)
  select slug, id from categories
  on conflict (slug) do nothing;
