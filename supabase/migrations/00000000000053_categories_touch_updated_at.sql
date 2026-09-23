-- categories.updated_at had a default but nothing ever bumped it on write,
-- unlike products (migration 39). The category admin (this session) needs
-- it for the same optimistic lock the products editor already uses: without
-- a real bump, two edits in flight would never detect each other.
drop trigger if exists categories_touch_updated_at on categories;
create trigger categories_touch_updated_at
  before update on categories
  for each row execute function touch_updated_at();
