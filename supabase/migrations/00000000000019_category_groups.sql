-- Two level browsing: five groups above the fifteen Drive folders.
--
-- `categories.parent_id` has existed since migration 4 and has never been
-- used, so the shop offered fifteen flat facets in one row. That is not how a
-- specifier looks for material. They arrive wanting stone, or panels, or
-- hardware, and only then care whether the panel is bamboo or SPC.
--
-- The groups are an EDITORIAL layer, not a Drive layer. There is no folder
-- called "Hardware", so a group carries `source_path = null` and the importer
-- cannot collide with it: it upserts on source_path with ignoreDuplicates, and
-- null is not a folder it will ever plan. The unique constraint from migration
-- 11 permits many nulls, which is what makes this safe.
--
-- Group ordering reuses the sort_order of the first child in each group, so
-- the top level reads in the order the flat list already read, and the brand
-- strapline's pillars keep their sequence: Sintered Stone, Lighting, Panels,
-- Accessories, with Flooring and Hardware placed where their folders sat.
--
-- LIGHTING stays top level with no children. It is a pillar in the guideline
-- and one Drive folder, so wrapping it in a group of one would be structure
-- for its own sake. The UI renders a childless top level category as itself.

insert into categories (name, slug, source_path, is_published, sort_order, description) values
  ('Sintered Stone', 'sintered-stone', null, true, 10,
'Sintered stone is our largest range and the reason most people find us. It is made by compacting mineral particles under heat and pressure with no resin in the mix, which is what gives it a surface with nowhere for liquid to sit.

We stock it in two thicknesses. 12mm is the usual answer for worktops, islands, vanities and feature walls. 15mm is specified where a heavier edge profile is wanted or where the span asks for it.

Both are supplied as large format slabs, so a worktop run can often be cut from one piece. Tell us the project and we will send the colour sheets with a price.'),

  ('Wall Panels', 'wall-panels', null, true, 40,
'Wall panelling covers a large area quickly and changes how a room sounds as well as how it looks, which is why it turns up in offices and bedrooms more than anywhere else.

We carry three types and the trims that finish them. Acoustic panels back a slatted face with felt and take the edge off a hard room. Bamboo veneer gives a real timber face. SPC panels are the hard wearing choice for a wall that gets knocked.

Which one suits depends on the room and the budget. Bring the drawing or the dimensions and we will work out the panel count with you.'),

  ('Flooring', 'flooring', null, true, 80,
'Flooring has to survive the room it is in, so the specification matters more here than almost anywhere else in a fit out.

We stock SPC, a rigid core plank with a stone composite body. It does not swell the way a laminate does when water gets under it, it sits over most existing floors, and it clicks together without adhesive.

Wear layer, plank size and finish are confirmed per range. Tell us the area in square metres and we will price the floor, the underlay and the trims together.'),

  ('Hardware', 'hardware', null, true, 90,
'Hardware is the part of a fitted interior that gets touched every day, and it is usually the part decided last and regretted first.

We stock handles, hinges, door locks and furniture legs, in finishes chosen to sit with the surfaces we supply. That is the point of buying them in the same place: a brass pull can be held against the worktop it will live next to rather than guessed at from a screen.

Centre to centre measurements, finishes and availability are confirmed per item. Ask us and we will send what you need to place an order.'),

  ('Accessories', 'accessories', null, true, 130,
'The fittings that make a cabinet work once it is built, and the ones a joiner tends to source separately at the end of a job.

We hold floating shelf brackets and supports, kitchen organisers and inserts, and office fittings. Stocking them alongside the surfaces means one delivery and one invoice rather than three suppliers and a week of waiting on the smallest item.

Sizes and load ratings are confirmed per item. Tell us what the cabinet needs and we will put the list together.')
on conflict (slug) do update
  set name        = excluded.name,
      sort_order  = excluded.sort_order,
      description = excluded.description;

-- Hang the Drive folders off their groups. Keyed on source_path, which is the
-- category's identity per migration 11, so an edited slug cannot detach a
-- child from its group.
update categories child
   set parent_id = parent.id
  from categories parent
 where parent.slug = case child.source_path
         when '12MM SINTERED STONES'        then 'sintered-stone'
         when '15MM SINTERED STONES'        then 'sintered-stone'
         when 'ACCOUSTIC WALL PANELS'       then 'wall-panels'
         when 'BAMBOO VENEER WALL PANELS'   then 'wall-panels'
         when 'SPC WALL PANELS'             then 'wall-panels'
         when 'WALL PANEL ACCESSORIES'      then 'wall-panels'
         when 'SPC FLOORING'                then 'flooring'
         when 'HANDLES'                     then 'hardware'
         when 'HINGES'                      then 'hardware'
         when 'DOOR LOCKS'                  then 'hardware'
         when 'FURNITURE LEGS'              then 'hardware'
         when 'FLOATING SHELF ACCESSORIES'  then 'accessories'
         when 'KITCHEN ACCESSORIES'         then 'accessories'
         when 'OFFICE ACCESSORIES'          then 'accessories'
       end;

-- The taxonomy is exactly two levels deep, and the storefront's browse tree
-- assumes it. A third level would render as a group with no products and no
-- children, which looks like a broken page rather than a deep taxonomy.
--
-- A CHECK cannot see another row, so this is a trigger. It refuses both a
-- self reference and a grandchild, on insert and on update, which is the whole
-- space of ways the dashboard's category editor could break the shop.
create or replace function enforce_category_depth() returns trigger
language plpgsql as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'a category cannot be its own parent'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from categories where id = new.parent_id and parent_id is not null) then
    raise exception 'the category taxonomy is two levels deep, so % cannot sit under a child category', new.slug
      using errcode = 'check_violation';
  end if;

  -- And a category that already has children cannot itself be given a parent,
  -- which is the same violation approached from the other end.
  if exists (select 1 from categories where parent_id = new.id) then
    raise exception 'category % has children, so it cannot be given a parent', new.slug
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger categories_depth before insert or update of parent_id on categories
  for each row execute function enforce_category_depth();
