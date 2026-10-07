-- D132, migration 67: no line changes on a closed quote. Every function that
-- changes a quote's lines refuses a won quote, a lost one and one that became
-- an order, for the owner and for an admin, through one shared rule,
-- assert_quote_lines_open(). The checks before it keep their order: the
-- permission and the stale lock still answer first. An open or quoted quote
-- still takes every change.
--
-- Generated with every function against every closed state, so a function
-- added to the list cannot be tested against only some of them.
begin;
select plan(92);

-- The money assertions below are written for 16 percent.
update settings set value = '0.16'::jsonb where key = 'vat_rate';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  ('a6700000-0000-4000-8000-000000000001'::uuid, 'cl-admin@beco.co.ke'),
  ('a6700000-0000-4000-8000-000000000002'::uuid, 'cl-bx@beco.co.ke'),
  ('a6700000-0000-4000-8000-000000000003'::uuid, 'cl-sales-a@beco.co.ke'),
  ('a6700000-0000-4000-8000-000000000004'::uuid, 'cl-sales-b@beco.co.ke'),
  ('a6700000-0000-4000-8000-000000000005'::uuid, 'cl-pm@beco.co.ke'),
  ('a6700000-0000-4000-8000-000000000006'::uuid, 'cl-editor@beco.co.ke'),
  ('a6700000-0000-4000-8000-000000000007'::uuid, 'cl-off@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  ('a6700000-0000-4000-8000-000000000001'::uuid, 'cl-admin@beco.co.ke', 'Cl Admin', 'beco_admin', true),
  ('a6700000-0000-4000-8000-000000000002'::uuid, 'cl-bx@beco.co.ke', 'Cl Brightex', 'brightex_admin', true),
  ('a6700000-0000-4000-8000-000000000003'::uuid, 'cl-sales-a@beco.co.ke', 'Cl Sales A', 'beco_sales', true),
  ('a6700000-0000-4000-8000-000000000004'::uuid, 'cl-sales-b@beco.co.ke', 'Cl Sales B', 'beco_sales', true),
  ('a6700000-0000-4000-8000-000000000005'::uuid, 'cl-pm@beco.co.ke', 'Cl PM', 'beco_product_manager', true),
  ('a6700000-0000-4000-8000-000000000006'::uuid, 'cl-editor@beco.co.ke', 'Cl Editor', 'beco_editor', true),
  ('a6700000-0000-4000-8000-000000000007'::uuid, 'cl-off@beco.co.ke', 'Cl Off', 'beco_sales', true);

insert into products (id, name, slug, sku, price, price_display_mode, is_published, unit) values
  ('a6700000-0000-4000-8000-000000000100'::uuid,   'ZZ Cl Slab',   'zz-cl-slab',   'ZZ-CL1', 65000, 'fixed', true, 'per slab'),
  ('a6700000-0000-4000-8000-000000000101'::uuid, 'ZZ Cl Handle', 'zz-cl-handle', 'ZZ-CL2', 850,   'fixed', true, 'per piece');

insert into orders (id, customer_name, customer_phone, source)
values ('a6700000-0000-4000-8000-000000000300'::uuid, 'ZZ Cl Conv', '0799670005', 'walk_in');

-- Every quote belongs to Sales A, priced at catalogue so D86 never gates.
insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by)
values
  ('a6700000-0000-4000-8000-000000000200'::uuid, 'ZZ Cl Open', '0799670000', 'walk_in', 'reviewing', 'a6700000-0000-4000-8000-000000000003'::uuid, 'a6700000-0000-4000-8000-000000000003'::uuid),
  ('a6700000-0000-4000-8000-000000000201'::uuid, 'ZZ Cl Quoted', '0799670001', 'walk_in', 'reviewing', 'a6700000-0000-4000-8000-000000000003'::uuid, 'a6700000-0000-4000-8000-000000000003'::uuid),
  ('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Won', '0799670002', 'walk_in', 'reviewing', 'a6700000-0000-4000-8000-000000000003'::uuid, 'a6700000-0000-4000-8000-000000000003'::uuid),
  ('a6700000-0000-4000-8000-000000000203'::uuid, 'ZZ Cl Lost', '0799670003', 'walk_in', 'reviewing', 'a6700000-0000-4000-8000-000000000003'::uuid, 'a6700000-0000-4000-8000-000000000003'::uuid),
  ('a6700000-0000-4000-8000-000000000204'::uuid, 'ZZ Cl Conv', '0799670004', 'walk_in', 'reviewing', 'a6700000-0000-4000-8000-000000000003'::uuid, 'a6700000-0000-4000-8000-000000000003'::uuid);

insert into quote_items (id, quote_id, product_id, description, quantity, list_price, unit_price, sort_order) values
  ('a6700000-0000-4000-8000-000000000400', 'a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000100'::uuid,   'ZZ Cl Slab',   1, 65000, 65000, 0),
  ('a6700000-0000-4000-8000-000000000401', 'a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 'ZZ Cl Handle', 4, 850,   850,   1),
  ('a6700000-0000-4000-8000-000000000410', 'a6700000-0000-4000-8000-000000000201'::uuid, 'a6700000-0000-4000-8000-000000000100'::uuid,   'ZZ Cl Slab',   1, 65000, 65000, 0),
  ('a6700000-0000-4000-8000-000000000411', 'a6700000-0000-4000-8000-000000000201'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 'ZZ Cl Handle', 4, 850,   850,   1),
  ('a6700000-0000-4000-8000-000000000420', 'a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000100'::uuid,   'ZZ Cl Slab',   1, 65000, 65000, 0),
  ('a6700000-0000-4000-8000-000000000421', 'a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 'ZZ Cl Handle', 4, 850,   850,   1),
  ('a6700000-0000-4000-8000-000000000430', 'a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000100'::uuid,   'ZZ Cl Slab',   1, 65000, 65000, 0),
  ('a6700000-0000-4000-8000-000000000431', 'a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 'ZZ Cl Handle', 4, 850,   850,   1),
  ('a6700000-0000-4000-8000-000000000440', 'a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000100'::uuid,   'ZZ Cl Slab',   1, 65000, 65000, 0),
  ('a6700000-0000-4000-8000-000000000441', 'a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 'ZZ Cl Handle', 4, 850,   850,   1);

-- Each fixture into its state the way the dashboard would leave it.
update quotes set status = 'quoted'
 where id in ('a6700000-0000-4000-8000-000000000201', 'a6700000-0000-4000-8000-000000000202', 'a6700000-0000-4000-8000-000000000203', 'a6700000-0000-4000-8000-000000000204');
update quotes set status = 'won' where id in ('a6700000-0000-4000-8000-000000000202', 'a6700000-0000-4000-8000-000000000204');
update quotes set status = 'lost', lost_reason = 'Went elsewhere' where id = 'a6700000-0000-4000-8000-000000000203';
update quotes set converted_order_id = 'a6700000-0000-4000-8000-000000000300'::uuid where id = 'a6700000-0000-4000-8000-000000000204';
update users set is_active = false where id = 'a6700000-0000-4000-8000-000000000007';

-- What the closed quotes hold before anyone tries, to compare at the end.
create temp table closed_before as
select qi.id, qi.quantity, qi.unit_price, q.total_amount, q.updated_at
  from quote_items qi join quotes q on q.id = qi.quote_id
 where q.id in ('a6700000-0000-4000-8000-000000000202', 'a6700000-0000-4000-8000-000000000203', 'a6700000-0000-4000-8000-000000000204');

-- ---------------------------------------------------------------- the rule
select has_function('assert_quote_lines_open', array['quote_status', 'uuid'],
  'the closed quote rule lives in one function');
select ok(not has_function_privilege('authenticated', 'assert_quote_lines_open(quote_status, uuid)', 'execute'),
  'a signed in user cannot call the internal rule directly');
select ok(not has_function_privilege('anon', 'assert_quote_lines_open(quote_status, uuid)', 'execute'),
  'anon cannot call the internal rule directly');

-- ---------------------------------------------------------------- anon
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000200'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000400","quantity":2,"unit_price":65000}]'::jsonb,
      now())$$,
  '42501', null,
  'anon cannot execute update_quote_lines');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000400'::uuid, 2, 65000,
      now())$$,
  '42501', null,
  'anon cannot execute update_quote_line');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      now())$$,
  '42501', null,
  'anon cannot execute add_catalogue_quote_line');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000200'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      now())$$,
  '42501', null,
  'anon cannot execute add_catalogue_quote_lines');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'ZZ Cl Delivery', 1, 5000,
      now())$$,
  '42501', null,
  'anon cannot execute add_custom_quote_line');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000401'::uuid,
      now())$$,
  '42501', null,
  'anon cannot execute remove_quote_line');
reset role;

-- ---------------------------------------------------------------- refused before the status is read
set local role authenticated;

set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the product manager is refused update_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000420'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the product manager is refused update_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the product manager is refused add_catalogue_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the product manager is refused add_catalogue_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the product manager is refused add_custom_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000421'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the product manager is refused remove_quote_line on a won quote as not allowed, before its status');
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000006","role":"authenticated"}';
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the editor is refused update_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000420'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the editor is refused update_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the editor is refused add_catalogue_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the editor is refused add_catalogue_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the editor is refused add_custom_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000421'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'the editor is refused remove_quote_line on a won quote as not allowed, before its status');
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000007","role":"authenticated"}';
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a deactivated salesperson is refused update_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000420'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a deactivated salesperson is refused update_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a deactivated salesperson is refused add_catalogue_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a deactivated salesperson is refused add_catalogue_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a deactivated salesperson is refused add_custom_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000421'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a deactivated salesperson is refused remove_quote_line on a won quote as not allowed, before its status');
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a salesperson on a colleague''s quote is refused update_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000420'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a salesperson on a colleague''s quote is refused update_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a salesperson on a colleague''s quote is refused add_catalogue_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a salesperson on a colleague''s quote is refused add_catalogue_quote_lines on a won quote as not allowed, before its status');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a salesperson on a colleague''s quote is refused add_custom_quote_line on a won quote as not allowed, before its status');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000421'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  '42501', 'Not allowed',
  'a salesperson on a colleague''s quote is refused remove_quote_line on a won quote as not allowed, before its status');
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000003","role":"authenticated"}';

-- The stale lock answers before the status, as in remove_quote_line.
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409', 'This quote changed while you were editing',
  'update_quote_lines on a won quote with a stale lock is PT409');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000420'::uuid, 2, 65000,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409', 'This quote changed while you were editing',
  'update_quote_line on a won quote with a stale lock is PT409');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409', 'This quote changed while you were editing',
  'add_catalogue_quote_line on a won quote with a stale lock is PT409');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409', 'This quote changed while you were editing',
  'add_catalogue_quote_lines on a won quote with a stale lock is PT409');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Delivery', 1, 5000,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409', 'This quote changed while you were editing',
  'add_custom_quote_line on a won quote with a stale lock is PT409');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000421'::uuid,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409', 'This quote changed while you were editing',
  'remove_quote_line on a won quote with a stale lock is PT409');

-- ---------------------------------------------------------------- the owner, closed
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'the owner is refused update_quote_lines on a won quote');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000420'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'the owner is refused update_quote_line on a won quote');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'the owner is refused add_catalogue_quote_line on a won quote');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'the owner is refused add_catalogue_quote_lines on a won quote');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'the owner is refused add_custom_quote_line on a won quote');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000421'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'the owner is refused remove_quote_line on a won quote');
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000203'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000430","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'the owner is refused update_quote_lines on a lost quote');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000430'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'the owner is refused update_quote_line on a lost quote');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'the owner is refused add_catalogue_quote_line on a lost quote');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000203'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'the owner is refused add_catalogue_quote_lines on a lost quote');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'the owner is refused add_custom_quote_line on a lost quote');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000431'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'the owner is refused remove_quote_line on a lost quote');
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000204'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000440","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'the owner is refused update_quote_lines on a quote that became an order');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000440'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'the owner is refused update_quote_line on a quote that became an order');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'the owner is refused add_catalogue_quote_line on a quote that became an order');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000204'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'the owner is refused add_catalogue_quote_lines on a quote that became an order');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'the owner is refused add_custom_quote_line on a quote that became an order');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000441'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'the owner is refused remove_quote_line on a quote that became an order');

-- ---------------------------------------------------------------- admins, closed
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'an admin is refused update_quote_lines on a won quote');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000420'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'an admin is refused update_quote_line on a won quote');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'an admin is refused add_catalogue_quote_line on a won quote');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'an admin is refused add_catalogue_quote_lines on a won quote');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'an admin is refused add_custom_quote_line on a won quote');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000202'::uuid, 'a6700000-0000-4000-8000-000000000421'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'an admin is refused remove_quote_line on a won quote');
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000203'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000430","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'an admin is refused update_quote_lines on a lost quote');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000430'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'an admin is refused update_quote_line on a lost quote');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'an admin is refused add_catalogue_quote_line on a lost quote');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000203'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'an admin is refused add_catalogue_quote_lines on a lost quote');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'an admin is refused add_custom_quote_line on a lost quote');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000203'::uuid, 'a6700000-0000-4000-8000-000000000431'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'an admin is refused remove_quote_line on a lost quote');
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000204'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000440","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'an admin is refused update_quote_lines on a quote that became an order');
select throws_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000440'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'an admin is refused update_quote_line on a quote that became an order');
select throws_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'an admin is refused add_catalogue_quote_line on a quote that became an order');
select throws_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000204'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'an admin is refused add_catalogue_quote_lines on a quote that became an order');
select throws_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'an admin is refused add_custom_quote_line on a quote that became an order');
select throws_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000204'::uuid, 'a6700000-0000-4000-8000-000000000441'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'an admin is refused remove_quote_line on a quote that became an order');
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000202'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000420","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed',
  'a Brightex admin is refused update_quote_lines on a won quote');
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000203'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000430","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items',
  'a Brightex admin is refused update_quote_lines on a lost quote');
select throws_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000204'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000440","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'a Brightex admin is refused update_quote_lines on a quote that became an order');

-- ---------------------------------------------------------------- open quotes still change
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000200'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000400","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000200'))$$,
  'the owner can still update_quote_lines on an open quote');
select lives_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000400'::uuid, 2, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000200'))$$,
  'the owner can still update_quote_line on an open quote');
select lives_ok(
  $$select add_catalogue_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000101'::uuid, 1, null,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000200'))$$,
  'the owner can still add_catalogue_quote_line on an open quote');
select lives_ok(
  $$select add_catalogue_quote_lines('a6700000-0000-4000-8000-000000000200'::uuid,
      '[{"product_id":"a6700000-0000-4000-8000-000000000101","quantity":2}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000200'))$$,
  'the owner can still add_catalogue_quote_lines on an open quote');
select lives_ok(
  $$select add_custom_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'ZZ Cl Delivery', 1, 5000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000200'))$$,
  'the owner can still add_custom_quote_line on an open quote');
select lives_ok(
  $$select remove_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000401'::uuid,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000200'))$$,
  'the owner can still remove_quote_line on an open quote');
select lives_ok(
  $$select update_quote_lines('a6700000-0000-4000-8000-000000000201'::uuid,
      '[{"line_id":"a6700000-0000-4000-8000-000000000410","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000201'))$$,
  'a quoted quote, not yet won or lost, still takes a quantity change');
set local request.jwt.claims = '{"sub":"a6700000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok(
  $$select update_quote_line('a6700000-0000-4000-8000-000000000200'::uuid, 'a6700000-0000-4000-8000-000000000400'::uuid, 3, 65000,
      (select updated_at from quotes where id = 'a6700000-0000-4000-8000-000000000200'))$$,
  'an admin can still change a line on an open quote');

reset role;

-- ---------------------------------------------------------------- nothing moved
select is(
  (select count(*)::int from quote_items
    where quote_id in ('a6700000-0000-4000-8000-000000000202', 'a6700000-0000-4000-8000-000000000203', 'a6700000-0000-4000-8000-000000000204')),
  6, 'every refused add or removal left the closed quotes with their two lines each');
select is_empty(
  $$select qi.id from quote_items qi join closed_before b on b.id = qi.id
     where qi.quantity <> b.quantity or qi.unit_price <> b.unit_price$$,
  'no quantity or price moved on a closed quote');
select is_empty(
  $$select q.id from quotes q join closed_before b on true
     join quote_items qi on qi.id = b.id and qi.quote_id = q.id
     where q.total_amount <> b.total_amount or q.updated_at <> b.updated_at$$,
  'no closed quote''s total or lock moved');
select is(
  (select count(*)::int from quote_items where quote_id = 'a6700000-0000-4000-8000-000000000200'),
  4, 'the open quote took every add and the removal');
select is(
  (select total_amount from quotes where id = 'a6700000-0000-4000-8000-000000000200'),
  202550.00::numeric(12,2), 'the open quote''s total is worked out again: 195,000 + 850 + 1,700 + 5,000');
select is(
  (select total_amount from quotes where id = 'a6700000-0000-4000-8000-000000000201'),
  133400.00::numeric(12,2), 'the quoted quote''s total follows its new quantity: 2 x 65,000 + 4 x 850');

select * from finish();
rollback;
