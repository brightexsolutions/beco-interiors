-- convert_quote_to_order, set_order_status, mark_order_paid.
-- Prove the line prices copy, a quote cannot convert twice, sales converts
-- own only, paid stamps paid_at, and stock is not touched.
begin;
select plan(24);

\set admin_id    '''b4000000-0000-4000-8000-000000000001'''
\set sales_a_id  '''b4000000-0000-4000-8000-000000000002'''
\set sales_b_id  '''b4000000-0000-4000-8000-000000000003'''
\set pm_id       '''b4000000-0000-4000-8000-000000000004'''
\set product_id  '''b4000000-0000-4000-8000-0000000000aa'''
\set q_owned     '''b4000000-0000-4000-8000-000000000010'''
\set q_other     '''b4000000-0000-4000-8000-000000000011'''
\set q_open      '''b4000000-0000-4000-8000-000000000012'''
\set line_owned  '''b4000000-0000-4000-8000-000000000020'''
\set line_disc   '''b4000000-0000-4000-8000-000000000021'''
\set line_other  '''b4000000-0000-4000-8000-000000000022'''
\set lock        '''2026-09-01 09:00:00+00'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,   'ord-admin@beco.co.ke'),
  (:sales_a_id::uuid, 'ord-sales-a@beco.co.ke'),
  (:sales_b_id::uuid, 'ord-sales-b@beco.co.ke'),
  (:pm_id::uuid,      'ord-pm@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,   'ord-admin@beco.co.ke',   'Ord Admin',  'beco_admin', true),
  (:sales_a_id::uuid, 'ord-sales-a@beco.co.ke', 'Ord A',      'beco_sales', true),
  (:sales_b_id::uuid, 'ord-sales-b@beco.co.ke', 'Ord B',      'beco_sales', true),
  (:pm_id::uuid,      'ord-pm@beco.co.ke',      'Ord PM',     'beco_product_manager', true);

insert into products (id, name, slug, price, price_display_mode, is_published, unit, stock_quantity)
values (:product_id::uuid, 'ZZ Ord Slab', 'zz-ord-slab', 65000, 'fixed', true, 'per slab', 10);

insert into quotes (
  id, customer_name, customer_phone, source, status,
  assigned_to, created_by, subtotal, vat_amount, total_amount
) values
  (:q_owned::uuid, 'Owned Won',  '0700000010', 'walk_in', 'reviewing',
   :sales_a_id::uuid, :sales_a_id::uuid, 120000, 0, 120000),
  (:q_other::uuid, 'Other Won',  '0700000011', 'phone',   'reviewing',
   :sales_b_id::uuid, :sales_b_id::uuid, 65000, 0, 65000),
  (:q_open::uuid,  'Still Open', '0700000012', 'walk_in', 'quoted',
   :sales_a_id::uuid, :sales_a_id::uuid, 65000, 0, 65000);

insert into quote_items (id, quote_id, product_id, description, quantity, list_price, unit_price, sort_order)
values
  (:line_owned::uuid, :q_owned::uuid, :product_id::uuid, 'ZZ Ord Slab', 1.5, 65000, 60000, 0),
  (:line_disc::uuid,  :q_owned::uuid, null,              'Custom edge', 1,   null,  30000, 1),
  (:line_other::uuid, :q_other::uuid, :product_id::uuid, 'ZZ Ord Slab', 1,   65000, 65000, 0);

update quotes
   set approved_by = :admin_id::uuid,
       approved_at = now(),
       status = 'won'
 where id in (:q_owned::uuid, :q_other::uuid);

-- ---------- as sales A ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"b4000000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select convert_quote_to_order(
      'b4000000-0000-4000-8000-000000000010'::uuid,
      (select updated_at from quotes where id = 'b4000000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN convert their own won quote'
);

select is(
  (select count(*) from order_items oi
     join orders o on o.id = oi.order_id
     join quotes q on q.converted_order_id = o.id
    where q.id = :q_owned::uuid),
  2::bigint,
  'every quote line becomes an order line'
);

select is(
  (select array_agg(oi.unit_price order by oi.sort_order)
     from order_items oi
     join quotes q on q.converted_order_id = oi.order_id
    where q.id = :q_owned::uuid),
  ARRAY[60000, 30000]::numeric[],
  'line prices copy unchanged, including the discounted override'
);

select is(
  (select salesperson_id from orders o
     join quotes q on q.converted_order_id = o.id
    where q.id = :q_owned::uuid),
  :sales_a_id::uuid,
  'salesperson_id is the quote owner'
);

select is(
  (select o.source from orders o
     join quotes q on q.converted_order_id = o.id
    where q.id = :q_owned::uuid)::text,
  'walk_in',
  'source is carried from the quote'
);

select is(
  (select stock_quantity from products where id = :product_id::uuid),
  10::numeric,
  'converting a quote does not decrement stock'
);

select throws_ok(
  $$select convert_quote_to_order(
      'b4000000-0000-4000-8000-000000000010'::uuid,
      (select updated_at from quotes where id = 'b4000000-0000-4000-8000-000000000010'))$$,
  'P0001',
  'This quote is already an order',
  'a quote cannot be converted twice'
);

select throws_ok(
  $$select convert_quote_to_order(
      'b4000000-0000-4000-8000-000000000011'::uuid,
      (select updated_at from quotes where id = 'b4000000-0000-4000-8000-000000000011'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT convert a quote owned by someone else'
);

select throws_ok(
  $$select convert_quote_to_order(
      'b4000000-0000-4000-8000-000000000012'::uuid,
      (select updated_at from quotes where id = 'b4000000-0000-4000-8000-000000000012'))$$,
  'P0001',
  'Only a won quote can become an order',
  'an open quote cannot convert'
);

select lives_ok(
  $$select set_order_status(
      (select converted_order_id from quotes where id = 'b4000000-0000-4000-8000-000000000010'),
      'confirmed',
      (select o.updated_at from orders o
         join quotes q on q.converted_order_id = o.id
        where q.id = 'b4000000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN confirm their own order'
);

select is(
  (select o.status from orders o
     join quotes q on q.converted_order_id = o.id
    where q.id = :q_owned::uuid)::text,
  'confirmed',
  'pending became confirmed'
);

select throws_ok(
  $$select set_order_status(
      (select converted_order_id from quotes where id = 'b4000000-0000-4000-8000-000000000010'),
      'pending',
      (select o.updated_at from orders o
         join quotes q on q.converted_order_id = o.id
        where q.id = 'b4000000-0000-4000-8000-000000000010'))$$,
  '22023',
  'An order cannot move back to pending',
  'status cannot go backwards to pending'
);

select throws_ok(
  $$select set_order_status(
      (select converted_order_id from quotes where id = 'b4000000-0000-4000-8000-000000000010'),
      'cancelled',
      (select o.updated_at from orders o
         join quotes q on q.converted_order_id = o.id
        where q.id = 'b4000000-0000-4000-8000-000000000010'))$$,
  '42501',
  'Only an admin can cancel an order',
  'beco_sales CANNOT cancel even their own order: an admin''s call, D110'
);

select lives_ok(
  $$select mark_order_paid(
      (select converted_order_id from quotes where id = 'b4000000-0000-4000-8000-000000000010'),
      (select o.updated_at from orders o
         join quotes q on q.converted_order_id = o.id
        where q.id = 'b4000000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN mark their own order paid'
);

select isnt(
  (select paid_at from orders o
     join quotes q on q.converted_order_id = o.id
    where q.id = :q_owned::uuid),
  null,
  'mark paid writes paid_at'
);

select is(
  (select payment_status from orders o
     join quotes q on q.converted_order_id = o.id
    where q.id = :q_owned::uuid)::text,
  'paid',
  'payment_status agrees with paid_at'
);

select is(
  (select stock_quantity from products where id = :product_id::uuid),
  10::numeric,
  'marking paid does not decrement stock'
);

-- ---------- as sales B: cannot mutate A's order ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"b4000000-0000-4000-8000-000000000003","role":"authenticated"}';

select throws_ok(
  $$select set_order_status(
      (select converted_order_id from quotes where id = 'b4000000-0000-4000-8000-000000000010'),
      'fulfilled',
      (select o.updated_at from orders o
         join quotes q on q.converted_order_id = o.id
        where q.id = 'b4000000-0000-4000-8000-000000000010'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT fulfil someone else''s order'
);

-- ---------- as admin: can convert B's quote ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"b4000000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok(
  $$select convert_quote_to_order(
      'b4000000-0000-4000-8000-000000000011'::uuid,
      (select updated_at from quotes where id = 'b4000000-0000-4000-8000-000000000011'))$$,
  'an admin CAN convert another salesperson''s won quote'
);

select is(
  (select salesperson_id from orders o
     join quotes q on q.converted_order_id = o.id
    where q.id = :q_other::uuid),
  :sales_b_id::uuid,
  'admin conversion still attributes the order to the quote owner'
);

-- ---------- as product manager: cannot execute ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"b4000000-0000-4000-8000-000000000004","role":"authenticated"}';

select throws_ok(
  $$select convert_quote_to_order(
      'b4000000-0000-4000-8000-000000000012'::uuid,
      (select updated_at from quotes where id = 'b4000000-0000-4000-8000-000000000012'))$$,
  '42501',
  'Not allowed',
  'beco_product_manager CANNOT convert a quote'
);

-- ---------- as anon ----------
set local role anon;
set local request.jwt.claims = '{}';

select throws_ok(
  $$select convert_quote_to_order(
      'b4000000-0000-4000-8000-000000000012'::uuid,
      '2026-09-01 09:00:00+00'::timestamptz)$$,
  '42501',
  'Not signed in',
  'anon CANNOT convert a quote'
);

select throws_ok(
  $$select mark_order_paid(
      'b4000000-0000-4000-8000-000000000099'::uuid,
      now())$$,
  '42501',
  'Not signed in',
  'anon CANNOT mark an order paid'
);

-- The paid-without-paid_at constraint is already in 01_constraints.test.sql.
-- Cancelled cannot be marked paid: convert is done, use a fresh order as postgres.
reset role;

insert into orders (
  id, customer_name, customer_phone, status, salesperson_id, created_by, updated_at
) values (
  'b4000000-0000-4000-8000-0000000000c1'::uuid,
  'Cancel Me', '0700000099', 'cancelled',
  :sales_a_id::uuid, :sales_a_id::uuid, :lock::timestamptz
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"b4000000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$select mark_order_paid(
      'b4000000-0000-4000-8000-0000000000c1'::uuid,
      '2026-09-01 09:00:00+00'::timestamptz)$$,
  'P0001',
  'A cancelled order cannot be marked paid',
  'a cancelled order cannot be marked paid'
);

select * from finish();
rollback;
