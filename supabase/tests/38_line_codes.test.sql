-- D124: a quote line carries the product's code, as a snapshot.
begin;
select plan(12);

\set admin_id '''b9000000-0000-4000-8000-000000000001'''
\set sales_id '''b9000000-0000-4000-8000-000000000002'''
\set quote_id '''b9000000-0000-4000-8000-000000000010'''
\set coded_id '''b9000000-0000-4000-8000-000000000020'''
\set bare_id  '''b9000000-0000-4000-8000-000000000021'''
\set blank_id '''b9000000-0000-4000-8000-000000000022'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'codes-admin@beco.co.ke'),
  (:sales_id::uuid, 'codes-sales@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'codes-admin@beco.co.ke', 'Codes Admin', 'beco_admin', true),
  (:sales_id::uuid, 'codes-sales@beco.co.ke', 'Codes Sales', 'beco_sales', true);

insert into products (id, name, slug, sku, price_display_mode, availability) values
  (:coded_id::uuid, 'Soft close hinge', 'codes-soft-close-hinge', 'H-301', 'poa', 'poa'),
  (:bare_id::uuid,  'Hinge 1193',       'codes-hinge-1193',       null,    'poa', 'poa'),
  (:blank_id::uuid, 'Hinge 1194',       'codes-hinge-1194',       '   ',   'poa', 'poa');

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, total_amount)
values (:quote_id::uuid, 'Code Buyer', '0700000501', 'walk_in', 'reviewing', :sales_id::uuid, :sales_id::uuid, 0);

insert into quote_items (quote_id, product_id, description, quantity, unit_price, sort_order) values
  (:quote_id::uuid, :coded_id::uuid, 'Soft close hinge', 10, 450, 0),
  (:quote_id::uuid, :bare_id::uuid,  'Hinge 1193',        2, 300, 1),
  (:quote_id::uuid, :blank_id::uuid, 'Hinge 1194',        1, 300, 2),
  (:quote_id::uuid, null,            'Delivery, Karen',   1, 2500, 3);

select has_column('quote_items', 'code', 'quote lines have a code');
select has_column('order_items', 'code', 'order lines have a code');

select is((select code from quote_items where quote_id = :quote_id::uuid and sort_order = 0),
  'H-301', 'a line for a coded product takes the product code');
select is((select code from quote_items where quote_id = :quote_id::uuid and sort_order = 1),
  null, 'a product with no code leaves the line without one');
select is((select code from quote_items where quote_id = :quote_id::uuid and sort_order = 2),
  null, 'a blank code is no code');
select is((select code from quote_items where quote_id = :quote_id::uuid and sort_order = 3),
  null, 'a free text line has no product and no code');

insert into quote_items (quote_id, product_id, description, code, quantity, unit_price, sort_order)
values (:quote_id::uuid, :coded_id::uuid, 'Soft close hinge, old stock', 'H-301-OLD', 1, 400, 4);
select is((select code from quote_items where quote_id = :quote_id::uuid and sort_order = 4),
  'H-301-OLD', 'a code written with the line is kept, not overwritten');

update products set sku = 'H-302' where id = :coded_id::uuid;
select is((select code from quote_items where quote_id = :quote_id::uuid and sort_order = 0),
  'H-301', 'editing the product code later does not change an issued line');

select throws_ok(
  $$insert into quote_items (quote_id, description, code, quantity, unit_price, sort_order)
    values ('b9000000-0000-4000-8000-000000000010', 'Too long', repeat('X', 81), 1, 1, 9)$$,
  '23514', null, 'a code over 80 characters is refused');

update quotes set status = 'won', approved_by = :admin_id::uuid, approved_at = now()
 where id = :quote_id::uuid;

set local role authenticated;
set local request.jwt.claims = '{"sub":"b9000000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select convert_quote_to_order(
      'b9000000-0000-4000-8000-000000000010'::uuid,
      (select updated_at from quotes where id = 'b9000000-0000-4000-8000-000000000010'))$$,
  'the quote converts to an order');

reset role;

select is(
  (select oi.code from order_items oi
     join quotes q on q.converted_order_id = oi.order_id
    where q.id = :quote_id::uuid and oi.sort_order = 0),
  'H-301', 'the order carries the code that was quoted, not the product code edited since');

select is(
  (select count(*)::int from order_items oi
     join quotes q on q.converted_order_id = oi.order_id
    where q.id = :quote_id::uuid and oi.code is null),
  3, 'lines quoted without a code stay without one on the order');

select * from finish();
rollback;
