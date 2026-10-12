-- Product sizes, D137: a size rides on the quote line with its own price,
-- a size the product does not come in is refused, and the column only takes
-- an array.
begin;
select plan(9);

\set sales_id  '''a4700000-0000-4000-8000-000000000002'''
\set handle_id '''a4700000-0000-4000-8000-0000000000aa'''
\set slab_id   '''a4700000-0000-4000-8000-0000000000ab'''
\set q_id      '''a4700000-0000-4000-8000-000000000010'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values (:sales_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'zz47-sales@beco.test', 'x', now(), now(), now());

insert into users (id, email, full_name, role, is_active) values
  (:sales_id::uuid, 'zz47-sales@beco.test', 'ZZ Sizes Sales', 'beco_sales', true);

insert into products (id, name, slug, price, price_display_mode, is_published, unit, sizes)
values
  (:handle_id::uuid, 'ZZ Size Handle', 'zz-size-handle', 850, 'fixed', true, 'per piece',
   '[{"label":"96mm","price":850,"sku":"ZZ-96"},{"label":"128mm","price":950,"sku":null},{"label":"160mm","price":null,"sku":null}]'::jsonb),
  (:slab_id::uuid, 'ZZ Size Slab', 'zz-size-slab', 65000, 'fixed', true, 'per slab', '[]'::jsonb);

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by)
values (:q_id::uuid, 'ZZ Sizes', '0700004700', 'walk_in', 'reviewing', :sales_id::uuid, :sales_id::uuid);

-- ---------- structure ----------
select has_column('products', 'sizes', 'products carries sizes');

select throws_ok(
  $$update products set sizes = '{"label":"96mm"}'::jsonb where id = 'a4700000-0000-4000-8000-0000000000aa'$$,
  '23514', null,
  'sizes must be an array'
);

select is(
  (select size_price from product_size_price((select p from products p where id = 'a4700000-0000-4000-8000-0000000000aa'), '128mm')),
  950::numeric,
  'product_size_price finds a priced size'
);

select is(
  (select size_found from product_size_price((select p from products p where id = 'a4700000-0000-4000-8000-0000000000aa'), '200mm')),
  false,
  'and reports a size the product does not come in'
);

-- ---------- as the salesperson ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a4700000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select add_catalogue_quote_lines(
      'a4700000-0000-4000-8000-000000000010'::uuid,
      '[
        {"product_id":"a4700000-0000-4000-8000-0000000000aa","quantity":4,"size":"128mm"},
        {"product_id":"a4700000-0000-4000-8000-0000000000aa","quantity":2,"size":"160mm"},
        {"product_id":"a4700000-0000-4000-8000-0000000000ab","quantity":0.5}
      ]'::jsonb,
      (select updated_at from quotes where id = 'a4700000-0000-4000-8000-000000000010'))$$,
  'a size per item is accepted beside an item without one'
);

select is(
  (select description from quote_items
    where quote_id = 'a4700000-0000-4000-8000-000000000010' and sort_order = 0),
  'ZZ Size Handle, 128mm',
  'the line names the size after the product'
);

select is(
  (select unit_price || '/' || list_price from quote_items
    where quote_id = 'a4700000-0000-4000-8000-000000000010' and sort_order = 0),
  '950.00/950.00',
  'a priced size sets both the unit and the list price'
);

select is(
  (select unit_price || '/' || list_price from quote_items
    where quote_id = 'a4700000-0000-4000-8000-000000000010' and sort_order = 1),
  '850.00/850.00',
  'an unpriced size falls back to the product price'
);

select throws_ok(
  $$select add_catalogue_quote_lines(
      'a4700000-0000-4000-8000-000000000010'::uuid,
      '[{"product_id":"a4700000-0000-4000-8000-0000000000aa","quantity":1,"size":"200mm"}]'::jsonb,
      (select updated_at from quotes where id = 'a4700000-0000-4000-8000-000000000010'))$$,
  '22023',
  'That size is not one this product comes in',
  'a size the product does not carry is refused'
);

select * from finish();
rollback;
