-- A slab can be cut in half. A handle cannot.
--
-- submit_quote is VOLATILE and mints a new quote on every call, so it cannot
-- be nested inside a WHERE clause the way an earlier version of this file
-- tried: nothing here guarantees a function call embedded in a filter runs
-- exactly once relative to the surrounding query. Captured with \gset
-- instead, so the reference is a value, not a call that might run again.
begin;
select plan(7);

insert into categories (id, name, slug, is_published)
  values ('b0000000-0000-0000-0000-000000000001', 'ZZ Test Stones', 'zz-test-stones', true);

insert into products (id, name, slug, category_id, price, price_display_mode, availability, unit, is_published)
values
  ('b0000000-0000-0000-0000-000000000002', 'ZZ Test Slab', 'zz-test-slab',
   'b0000000-0000-0000-0000-000000000001', 65000, 'fixed', 'in_stock', 'per slab', true),
  ('b0000000-0000-0000-0000-000000000003', 'ZZ Test Handle', 'zz-test-handle',
   'b0000000-0000-0000-0000-000000000001', 1200, 'fixed', 'in_stock', 'per piece', true);

-- A half slab is accepted exactly.
select submit_quote('ZZ Half Slab', '0722000001',
  '[{"slug": "zz-test-slab", "quantity": 1.5}]'::jsonb) as ref \gset
select results_eq(
  format($$select quantity from quote_items where quote_id =
      (select id from quotes where reference_number = %L)$$, :'ref'),
  ARRAY[1.5]::numeric[],
  'a per-slab line accepts a half slab quantity exactly'
);

-- A bare half slab, no whole slab alongside it, is not bumped up to one.
select submit_quote('ZZ Bare Half', '0722000002',
  '[{"slug": "zz-test-slab", "quantity": 0.5}]'::jsonb) as ref \gset
select results_eq(
  format($$select quantity from quote_items where quote_id =
      (select id from quotes where reference_number = %L)$$, :'ref'),
  ARRAY[0.5]::numeric[],
  'a bare half slab order is not silently rounded up to a whole one'
);

-- Something crafted below half a slab floors to the smallest real unit, not
-- to zero and not to a whole slab either.
select submit_quote('ZZ Tiny Slab', '0722000003',
  '[{"slug": "zz-test-slab", "quantity": 0.1}]'::jsonb) as ref \gset
select results_eq(
  format($$select quantity from quote_items where quote_id =
      (select id from quotes where reference_number = %L)$$, :'ref'),
  ARRAY[0.5]::numeric[],
  'a slab quantity under half a slab floors to half, the smallest real cut'
);

-- An odd fraction snaps to the nearest half rather than being stored as
-- sent, because Beco does not cut slabs to arbitrary fractions.
select submit_quote('ZZ Odd Fraction', '0722000004',
  '[{"slug": "zz-test-slab", "quantity": 2.3}]'::jsonb) as ref \gset
select results_eq(
  format($$select quantity from quote_items where quote_id =
      (select id from quotes where reference_number = %L)$$, :'ref'),
  ARRAY[2.5]::numeric[],
  'a slab quantity between two half steps rounds to the nearer one'
);

-- A discrete item keeps the old behaviour: whole numbers, floored at one.
select submit_quote('ZZ Handle Buyer', '0722000005',
  '[{"slug": "zz-test-handle", "quantity": 0.5}]'::jsonb) as ref \gset
select results_eq(
  format($$select quantity from quote_items where quote_id =
      (select id from quotes where reference_number = %L)$$, :'ref'),
  ARRAY[1]::numeric[],
  'a discrete item cannot be ordered in half units, and floors to one'
);

select submit_quote('ZZ Handle Fraction', '0722000006',
  '[{"slug": "zz-test-handle", "quantity": 2.7}]'::jsonb) as ref \gset
select results_eq(
  format($$select quantity from quote_items where quote_id =
      (select id from quotes where reference_number = %L)$$, :'ref'),
  ARRAY[3]::numeric[],
  'a discrete item rounds to the nearest whole number rather than truncating'
);

-- The ceiling still applies to a slab line, exactly as it always did for
-- everything else.
select submit_quote('ZZ Huge Slab', '0722000007',
  '[{"slug": "zz-test-slab", "quantity": 99999}]'::jsonb) as ref \gset
select results_eq(
  format($$select quantity from quote_items where quote_id =
      (select id from quotes where reference_number = %L)$$, :'ref'),
  ARRAY[10000]::numeric[],
  'a slab quantity is still capped at ten thousand'
);

select * from finish();
rollback;
