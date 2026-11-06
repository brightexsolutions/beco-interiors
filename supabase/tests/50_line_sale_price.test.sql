-- D163: a quote line keeps the product's struck through price, as a snapshot
-- only the catalogue can set.
begin;
select plan(10);

\set sales_id '''b9500000-0000-4000-8000-000000000002'''
\set quote_id '''b9500000-0000-4000-8000-000000000010'''
\set sale_id  '''b9500000-0000-4000-8000-000000000020'''
\set full_id  '''b9500000-0000-4000-8000-000000000021'''
\set poa_id   '''b9500000-0000-4000-8000-000000000022'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values (:sales_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'saleline-sales@beco.co.ke', 'x', now(), now(), now());
insert into users (id, email, full_name, role, is_active)
values (:sales_id::uuid, 'saleline-sales@beco.co.ke', 'Sale Line Sales', 'beco_sales', true);

insert into products (id, name, slug, price_display_mode, availability, price, compare_at_price) values
  (:sale_id::uuid, 'Sale stone', 'saleline-sale-stone', 'fixed', 'in_stock', 6000,  10000),
  (:full_id::uuid, 'Full stone', 'saleline-full-stone', 'fixed', 'in_stock', 10000, null),
  (:poa_id::uuid,  'POA stone',  'saleline-poa-stone',  'poa',   'poa',      null,  null);

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, total_amount)
values (:quote_id::uuid, 'Sale Buyer', '0700000601', 'walk_in', 'reviewing', :sales_id::uuid, :sales_id::uuid, 0);

insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price, sort_order) values
  (:quote_id::uuid, :sale_id::uuid, 'Sale stone',          1, 6000,  6000, 0),
  (:quote_id::uuid, :full_id::uuid, 'Full stone',          1, 10000, 10000, 1),
  (:quote_id::uuid, :poa_id::uuid,  'POA stone',           1, 6000,  6000, 2),
  (:quote_id::uuid, :sale_id::uuid, 'Sale stone, 1600mm',  1, 7500,  7500, 3),
  (:quote_id::uuid, null,           'Delivery, Karen',     1, 2500,  2500, 4);

select has_column('quote_items', 'compare_at_price', 'quote lines can keep a sale''s struck price');

select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 0),
  10000.00, 'a line written at the sale price keeps the struck through price');
select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 1),
  null, 'a product not on sale gives none');
select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 2),
  null, 'a product priced on application gives none');
select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 3),
  null, 'a line at a size''s own price gives none, the struck price is not its price');
select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 4),
  null, 'a free text line gives none');

insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price, compare_at_price, sort_order)
values (:quote_id::uuid, :full_id::uuid, 'Full stone, forged', 1, 10000, 10000, 99999, 5);
select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 5),
  null, 'a was price sent with the line is ignored; only the catalogue sets it');

update products set compare_at_price = null, price = 10000 where id = :sale_id::uuid;
select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 0),
  10000.00, 'ending the sale later does not change an issued line');

-- As the salesperson who owns the quote.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b9500000-0000-4000-8000-000000000002","role":"authenticated"}';

update quote_items set compare_at_price = 50000
 where quote_id = 'b9500000-0000-4000-8000-000000000010' and sort_order = 0;
update quote_items set compare_at_price = 50000
 where quote_id = 'b9500000-0000-4000-8000-000000000010' and sort_order = 1;
reset role;

select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 0),
  10000.00, 'a salesperson cannot raise the was price');
select is((select compare_at_price from quote_items where quote_id = :quote_id::uuid and sort_order = 1),
  null, 'nor invent one on a line that had none');

select * from finish();
rollback;
