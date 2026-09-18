-- Header money follows priced lines, so a converted sale shows on reports.
begin;
select plan(6);

\set admin_id   '''b8000000-0000-4000-8000-000000000001'''
\set sales_id   '''b8000000-0000-4000-8000-000000000002'''
\set quote_id   '''b8000000-0000-4000-8000-000000000010'''
\set mixed_id   '''b8000000-0000-4000-8000-000000000011'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'money-admin@beco.co.ke'),
  (:sales_id::uuid, 'money-sales@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'money-admin@beco.co.ke', 'Money Admin', 'beco_admin', true),
  (:sales_id::uuid, 'money-sales@beco.co.ke', 'Money Sales', 'beco_sales', true);

insert into quotes (
  id, customer_name, customer_phone, source, status,
  assigned_to, created_by, total_amount
) values
  (:quote_id::uuid, 'Header Zero', '0700000401', 'walk_in', 'reviewing',
   :sales_id::uuid, :sales_id::uuid, 0),
  (:mixed_id::uuid, 'Mixed Lines', '0700000402', 'walk_in', 'reviewing',
   :sales_id::uuid, :sales_id::uuid, 0);

insert into quote_items (quote_id, description, quantity, unit_price, sort_order)
values (:quote_id::uuid, 'Priced slab', 4, 77000, 0);

select is(
  (select total_amount from quotes where id = :quote_id::uuid),
  308000::numeric,
  'inserting a priced line writes the quote header from the lines'
);

insert into quote_items (quote_id, description, quantity, unit_price, sort_order)
values
  (:mixed_id::uuid, 'Priced slab', 1, 50000, 0),
  (:mixed_id::uuid, 'POA delivery', 1, 0, 1);

select is(
  (select total_amount from quotes where id = :mixed_id::uuid),
  50000::numeric,
  'an unpriced line does not zero the priced lines on the header'
);

update quotes
   set status = 'won',
       approved_by = :admin_id::uuid,
       approved_at = now()
 where id = :quote_id::uuid;

set local role authenticated;
set local request.jwt.claims = '{"sub":"b8000000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select convert_quote_to_order(
      'b8000000-0000-4000-8000-000000000010'::uuid,
      (select updated_at from quotes where id = 'b8000000-0000-4000-8000-000000000010'))$$,
  'convert still works after the header refresh'
);

select is(
  (select o.total_amount
     from orders o
     join quotes q on q.converted_order_id = o.id
    where q.id = :quote_id::uuid),
  308000::numeric,
  'the order header is the priced lines, not the stale quote total of 0'
);

select lives_ok(
  $$select set_order_status(
      (select converted_order_id from quotes where id = 'b8000000-0000-4000-8000-000000000010'),
      'confirmed',
      (select o.updated_at from orders o
         join quotes q on q.converted_order_id = o.id
        where q.id = 'b8000000-0000-4000-8000-000000000010'))$$,
  'confirm the converted order so reports can invoice it'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"b8000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  (select (p->>'invoiced')::numeric
     from jsonb_array_elements(salesperson_leaderboard('this_month')->'people') p
    where p->>'id' = 'b8000000-0000-4000-8000-000000000002'),
  308000::numeric,
  'reports invoiced is the converted order, not 0'
);

select * from finish();
rollback;
