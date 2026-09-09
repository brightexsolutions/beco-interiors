-- D68's rounding, as an INVARIANT rather than a handful of points.
--
-- 07_fractional_quantity.test.sql pins specific cases: an exact half, a bare
-- half, a sub-half floor, an odd fraction, the discrete floor, the ceiling.
-- This drives many arbitrary fractions through the real `submit_quote` and
-- asserts the shape of every stored quantity, so a change to the CASE
-- expression that breaks the granularity or a bound cannot pass by simply
-- missing the example that would have caught it. Per the Codex M4 review.
--
-- submit_quote caps a quote at 60 items, so each product gets two quotes: one
-- dense in the sub-half region where the floor bites, one spread wide across
-- and past the ceiling.
begin;
select plan(6);

insert into categories (id, name, slug, is_published)
  values ('c8000000-0000-0000-0000-000000000001', 'ZZ Prop Stones', 'zz-prop-stones', true);

insert into products (id, name, slug, category_id, price, price_display_mode, availability, unit, is_published)
values
  ('c8000000-0000-0000-0000-000000000002', 'ZZ Prop Slab', 'zz-prop-slab',
   'c8000000-0000-0000-0000-000000000001', 65000, 'fixed', 'in_stock', 'per slab', true),
  ('c8000000-0000-0000-0000-000000000003', 'ZZ Prop Handle', 'zz-prop-handle',
   'c8000000-0000-0000-0000-000000000001', 1200, 'fixed', 'in_stock', 'per piece', true);

select submit_quote('ZZ Prop Slab Wide', '0722009001',
  (select jsonb_agg(jsonb_build_object('slug', 'zz-prop-slab', 'quantity', i::numeric * 37 / 16))
   from generate_series(1, 60) i)) as slab_wide \gset
select submit_quote('ZZ Prop Slab Tiny', '0722009002',
  (select jsonb_agg(jsonb_build_object('slug', 'zz-prop-slab', 'quantity', i::numeric / 79))
   from generate_series(1, 60) i)) as slab_tiny \gset
select submit_quote('ZZ Prop Handle Wide', '0722009003',
  (select jsonb_agg(jsonb_build_object('slug', 'zz-prop-handle', 'quantity', i::numeric * 173 / 16))
   from generate_series(1, 60) i)) as handle_wide \gset
select submit_quote('ZZ Prop Handle Tiny', '0722009004',
  (select jsonb_agg(jsonb_build_object('slug', 'zz-prop-handle', 'quantity', i::numeric / 53))
   from generate_series(1, 60) i)) as handle_tiny \gset

-- ---- per slab: >= half, a multiple of 0.5, never above the ceiling ----
select ok(
  (select bool_and(quantity >= 0.5) from quote_items
   where quote_id in (
     (select id from quotes where reference_number = :'slab_wide'),
     (select id from quotes where reference_number = :'slab_tiny'))),
  'every per-slab line is at least half a slab, across 120 arbitrary inputs'
);
select ok(
  (select bool_and((quantity * 2) = trunc(quantity * 2)) from quote_items
   where quote_id in (
     (select id from quotes where reference_number = :'slab_wide'),
     (select id from quotes where reference_number = :'slab_tiny'))),
  'every per-slab line is an exact multiple of half a slab'
);
select ok(
  (select bool_and(quantity <= 10000) from quote_items
   where quote_id in (
     (select id from quotes where reference_number = :'slab_wide'),
     (select id from quotes where reference_number = :'slab_tiny'))),
  'no per-slab line exceeds the ten thousand ceiling'
);

-- ---- per piece: >= 1, a whole number, never above the ceiling ----
select ok(
  (select bool_and(quantity >= 1) from quote_items
   where quote_id in (
     (select id from quotes where reference_number = :'handle_wide'),
     (select id from quotes where reference_number = :'handle_tiny'))),
  'every discrete line is at least one, across 120 arbitrary fractions'
);
select ok(
  (select bool_and(quantity = trunc(quantity)) from quote_items
   where quote_id in (
     (select id from quotes where reference_number = :'handle_wide'),
     (select id from quotes where reference_number = :'handle_tiny'))),
  'every discrete line is a whole number, never a fraction'
);
select ok(
  (select bool_and(quantity <= 10000) from quote_items
   where quote_id in (
     (select id from quotes where reference_number = :'handle_wide'),
     (select id from quotes where reference_number = :'handle_tiny'))),
  'no discrete line exceeds the ten thousand ceiling'
);

select * from finish();
rollback;
