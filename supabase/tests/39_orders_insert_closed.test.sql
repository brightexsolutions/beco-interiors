-- Migration 63: nobody but an admin, and the conversion function, may write an
-- order or an order line. The open anonymous insert from migration 6 is gone.
begin;
select plan(8);

\set admin_id '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id '''aaaaaaaa-0000-0000-0000-000000000002'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'admin63@beco.co.ke'),
  (:sales_id::uuid, 'sales63@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'admin63@beco.co.ke', 'A Admin', 'beco_admin', true),
  (:sales_id::uuid, 'sales63@beco.co.ke', 'Sales', 'beco_sales', true);

select is_empty(
  $$select policyname from pg_policies
    where tablename in ('orders', 'order_items')
      and policyname in ('orders_insert_anon', 'order_items_insert_anon')$$,
  'the open insert policies are gone'
);

-- ---------- anonymous ----------
set local role anon;
select throws_ok(
  $$insert into orders (customer_name, customer_phone) values ('ZZ Anon', '0700000063')$$,
  '42501', null,
  'anon cannot insert an order directly'
);
select throws_ok(
  $$insert into order_items (order_id, description, quantity, unit_price)
    values ('00000000-0000-0000-0000-000000000000', 'x', 1, 1)$$,
  '42501', null,
  'anon cannot insert an order line directly'
);
reset role;

-- ---------- beco_sales ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok(
  $$insert into orders (customer_name, customer_phone, salesperson_id)
    values ('ZZ Sales', '0700000064', 'aaaaaaaa-0000-0000-0000-000000000002')$$,
  '42501', null,
  'a salesperson cannot insert an order directly; orders come from converting a quote'
);
select throws_ok(
  $$insert into order_items (order_id, description, quantity, unit_price)
    values ('00000000-0000-0000-0000-000000000000', 'x', 1, 1)$$,
  '42501', null,
  'a salesperson cannot insert an order line directly'
);

-- ---------- beco_admin ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$insert into orders (customer_name, customer_phone) values ('ZZ Admin Order', '0700000065')$$,
  'an admin still writes orders through orders_write_admin'
);
select isnt_empty(
  $$select id from orders where customer_name = 'ZZ Admin Order'$$,
  'and the admin''s order is there'
);
reset role;

select ok(
  (select prosecdef from pg_proc where proname = 'convert_quote_to_order' limit 1),
  'convert_quote_to_order stays security definer, the path every real order takes'
);

select * from finish();
rollback;
