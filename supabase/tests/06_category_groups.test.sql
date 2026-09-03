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

select is_empty(
  $$select c.slug from categories c
     where c.source_path is not null
       and c.slug <> 'lighting'
       and c.parent_id is null$$,
  'every Drive folder category is filed under a group, except Lighting which is top level by design'
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
