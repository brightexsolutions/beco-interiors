-- Studio blog writes are Brightex only. can_write_blog no longer opens
-- blog_posts. Audit grants are unchanged.

create or replace function has_blog_write() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_brightex_user();
$$;
