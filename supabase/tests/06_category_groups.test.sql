-- The two level taxonomy, proven rather than assumed.
--
-- The storefront's browse tree renders groups above categories and assumes
-- exactly two levels. That assumption is held up by a trigger, so this file
-- attacks the trigger from every direction the dashboard's category editor
-- could reach it.
begin;
select plan(9);

-- Fixtures are prefixed and the assertions are scoped to them, so seeding a
-- sixteenth real category never breaks this file.
insert into categories (id, name, slug, is_published, sort_order) values
  ('a0000000-0000-0000-0000-000000000001', 'ZZ Test Group',  'zz-test-group',  true, 900),
  ('a0000000-0000-0000-0000-000000000002', 'ZZ Test Child',  'zz-test-child',  true, 910),
  ('a0000000-0000-0000-0000-000000000003', 'ZZ Test Loose',  'zz-test-loose',  true, 920);

select lives_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000001'
     where slug = 'zz-test-child'$$,
  'a top level category accepts a child'
);

-- One level down is the whole taxonomy. A grandchild would render as a group
-- with neither products nor children, which reads as a broken page.
select throws_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000002'
     where slug = 'zz-test-loose'$$,
  '23514',
  null,
  'a category cannot sit under a category that already has a parent'
);

-- The same violation approached from the other end: giving a parent to a
-- category that already has children.
select throws_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000003'
     where slug = 'zz-test-group'$$,
  '23514',
  null,
  'a category with children cannot itself be given a parent'
);

select throws_ok(
  $$update categories set parent_id = id where slug = 'zz-test-loose'$$,
  '23514',
  null,
  'a category cannot be its own parent'
);

-- Inserting straight into an invalid position is blocked too, not only
-- updating into one. The importer inserts, so this path is real.
select throws_ok(
  $$insert into categories (name, slug, parent_id, is_published)
    values ('ZZ Test Deep', 'zz-test-deep', 'a0000000-0000-0000-0000-000000000002', true)$$,
  '23514',
  null,
  'a grandchild cannot be inserted directly either'
);

-- The seeded taxonomy itself. These assert SHAPE, not counts of everything:
-- every real group has at least one child, and no group has a parent.
select is_empty(
  $$select slug from categories
     where source_path is null and slug like '%-%' and parent_id is not null
       and slug not like 'zz-test-%'$$,
  'no seeded group sits under another category'
);

select isnt_empty(
  $$select 1 from categories c
     where c.slug = 'sintered-stone'
       and exists (select 1 from categories k where k.parent_id = c.id)$$,
  'Sintered Stone is a group with children'
);

-- Scoped to the 14 Drive folders migration 13 actually seeded a home for,
-- not every source_path that will ever exist. A live import against the
-- real Drive can and does create a fresh top level category for a folder
-- that predates neither this seed nor a group to file it under, for
-- example a folder Beco adds later, or one already flagged in "Waiting on
-- Beco" (FLUTED WALL PANELS) and a real "Lights" folder that does not
-- match the placeholder LIGHTING source_path migration 13 seeded for it
-- (D47). That is the importer working as designed, not a taxonomy defect,
-- so asserting it over the whole live table the way this used to would
-- fail the moment a real import added exactly the row it is supposed to.
select is_empty(
  $$select c.slug from categories c
     where c.source_path in (
       '12MM SINTERED STONES', '15MM SINTERED STONES', 'ACCOUSTIC WALL PANELS',
       'BAMBOO VENEER WALL PANELS', 'SPC WALL PANELS', 'WALL PANEL ACCESSORIES',
       'SPC FLOORING', 'HANDLES', 'HINGES', 'DOOR LOCKS', 'FURNITURE LEGS',
       'FLOATING SHELF ACCESSORIES', 'KITCHEN ACCESSORIES', 'OFFICE ACCESSORIES'
     )
       and c.parent_id is null$$,
  'every Drive folder category migration 13 seeded a home for is still filed under a group'
);

-- Anonymous has to be able to read a group, or the shop cannot draw the tree.
-- Groups carry no products, so the existing published policy is what allows
-- this and it is worth proving rather than assuming.
set local role anon;
select isnt_empty(
  $$select 1 from categories where slug = 'hardware'$$,
  'anon can read a group category, which the browse tree depends on'
);

select * from finish();
rollback;
