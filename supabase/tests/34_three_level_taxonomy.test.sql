-- The three level taxonomy, attacked from every direction. Migration 58.
begin;
select plan(11);

insert into categories (id, name, slug, is_published, sort_order) values
  ('a0000000-0000-0000-0000-000000000011', 'ZZ Major',   'zz-major',   true, 900),
  ('a0000000-0000-0000-0000-000000000012', 'ZZ Sub',     'zz-sub',     true, 910),
  ('a0000000-0000-0000-0000-000000000013', 'ZZ Leaf',    'zz-leaf',    true, 920),
  ('a0000000-0000-0000-0000-000000000014', 'ZZ Fourth',  'zz-fourth',  true, 930),
  ('a0000000-0000-0000-0000-000000000015', 'ZZ Other',   'zz-other',   true, 940);

select lives_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000011' where slug = 'zz-sub'$$,
  'a major category accepts a sub category'
);

select lives_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000012' where slug = 'zz-leaf'$$,
  'a sub category accepts a third level, which is where Heixin stones and handle colours live'
);

select throws_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000013' where slug = 'zz-fourth'$$,
  '23514',
  null,
  'a fourth level is refused'
);

select throws_ok(
  $$insert into categories (name, slug, parent_id, is_published)
    values ('ZZ Deep', 'zz-deep', 'a0000000-0000-0000-0000-000000000013', true)$$,
  '23514',
  null,
  'a fourth level cannot be inserted directly either'
);

-- Moving a category that already has two levels under it beneath another
-- would make four levels, measured from the other end.
select throws_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000015' where slug = 'zz-major'$$,
  '23514',
  null,
  'a category with two levels under it cannot be given a parent'
);

select throws_ok(
  $$update categories set parent_id = 'a0000000-0000-0000-0000-000000000013' where slug = 'zz-major'$$,
  '23514',
  null,
  'a category cannot sit under its own sub category'
);

select throws_ok(
  $$update categories set parent_id = id where slug = 'zz-other'$$,
  '23514',
  null,
  'a category cannot be its own parent'
);

select is(
  (select array_agg(slug order by slug) from categories
     where id in (select category_subtree_ids('a0000000-0000-0000-0000-000000000011'))),
  array['zz-leaf', 'zz-major', 'zz-sub'],
  'category_subtree_ids returns the category and everything under it'
);

select is(
  category_depth('a0000000-0000-0000-0000-000000000013'), 3,
  'category_depth counts the chain from the top'
);

-- The live taxonomy after the migration.
select is(
  (select parent_id from categories where source_path = 'HANDLES'),
  null,
  'Handles is a major category, beside Sintered Stone'
);

set local role anon;
select is(
  (select count(*) from category_subtree_ids((select id from categories where slug = 'sintered-stone'))),
  3::bigint,
  'anon can walk a subtree, which the shop depends on'
);

select * from finish();
rollback;
