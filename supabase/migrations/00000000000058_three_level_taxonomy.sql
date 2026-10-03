-- The taxonomy browses three levels deep, and Handles is a major category.
--
-- Beco's Drive now carries HANDLES/BLACK HANDLES/<one photo per handle> and
-- 12MM SINTERED STONES/HEIXIN 12MM/<stone folders>. Under the two level cap
-- from migration 19 the importer skipped the Heixin stones as misnests and
-- collapsed every colour of handle into one product with thirty photographs.
-- Beco's own picture of the range, through Brown on 3 October 2026, is a
-- major category, the sub categories under it, and priced items under those.
-- See D104.
--
-- The cap moves from two levels to three. A CHECK cannot see another row, so
-- the trigger stays, now measuring the whole chain: the depth of the new
-- parent plus the height of the subtree being moved must fit in three.
--
-- Handles moves to the top level beside Sintered Stone, which is where Beco
-- place it. Hardware keeps hinges, door locks, furniture legs and drawer
-- rails. Two Drive folders that the live import created at the top level,
-- FLUTED WALL PANELS and Drawer rails, are filed under their groups where
-- they exist; on a database that has not imported them yet the updates do
-- nothing and the dashboard files them later.

create or replace function category_depth(p_id uuid) returns integer
language sql stable as $$
  with recursive up as (
    select id, parent_id, 1 as depth from categories where id = p_id
    union all
    select c.id, c.parent_id, up.depth + 1 from categories c join up on c.id = up.parent_id
    where up.depth < 10
  )
  select coalesce(max(depth), 0) from up;
$$;

create or replace function category_height(p_id uuid) returns integer
language sql stable as $$
  with recursive down as (
    select id, 0 as height from categories where id = p_id
    union all
    select c.id, down.height + 1 from categories c join down on c.parent_id = down.id
    where down.height < 10
  )
  select coalesce(max(height), 0) from down;
$$;

create or replace function enforce_category_depth() returns trigger
language plpgsql as $$
declare
  parent_depth integer;
  own_height integer;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'a category cannot be its own parent'
      using errcode = 'check_violation';
  end if;

  -- A descendant cannot become the parent, which would make a cycle.
  if exists (
    with recursive down as (
      select id from categories where parent_id = new.id
      union all
      select c.id from categories c join down on c.parent_id = down.id
    )
    select 1 from down where id = new.parent_id
  ) then
    raise exception 'category % cannot sit under one of its own sub categories', new.slug
      using errcode = 'check_violation';
  end if;

  parent_depth := category_depth(new.parent_id);
  own_height := case when tg_op = 'UPDATE' then category_height(new.id) else 0 end;

  if parent_depth + 1 + own_height > 3 then
    raise exception 'the category taxonomy is three levels deep, so % cannot sit under %',
      new.slug, (select slug from categories where id = new.parent_id)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- The trigger from migration 19 already fires this function on insert and on
-- update of parent_id. Nothing to recreate.

-- Handles is a major category.
update categories set parent_id = null where source_path = 'HANDLES';

-- Live Drive folders the importer created at the top level, filed where they belong.
update categories child
   set parent_id = parent.id
  from categories parent
 where child.parent_id is null
   and parent.slug = case upper(child.source_path)
         when 'FLUTED WALL PANELS' then 'wall-panels'
         when 'DRAWER RAILS'       then 'hardware'
       end;

-- Every category id under a given one, itself included. The storefront and
-- the dashboard both ask "what is in this range" of the whole subtree, and a
-- security invoker function keeps RLS deciding which rows the caller sees.
create or replace function category_subtree_ids(p_id uuid) returns setof uuid
language sql stable security invoker as $$
  with recursive down as (
    select id from categories where id = p_id
    union all
    select c.id from categories c join down on c.parent_id = down.id
  )
  select id from down;
$$;

grant execute on function category_subtree_ids(uuid) to anon, authenticated;
grant execute on function category_depth(uuid) to anon, authenticated;
grant execute on function category_height(uuid) to anon, authenticated;
