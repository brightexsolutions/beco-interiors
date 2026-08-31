-- Constraints, proven rather than assumed.
begin;
select plan(7);

-- A POA product must not carry a price, and a fixed price product must.
-- Enforced in the database rather than trusted to the application.
select throws_ok(
  $$insert into products (name, slug, price_display_mode, price)
    values ('Bad POA', 'zz-test-bad-poa', 'poa', 25000)$$,
  '23514',
  null,
  'a POA product cannot carry a price'
);

select throws_ok(
  $$insert into products (name, slug, price_display_mode, price)
    values ('Bad fixed', 'zz-test-bad-fixed', 'fixed', null)$$,
  '23514',
  null,
  'a fixed price product must have a price'
);

select lives_ok(
  $$insert into products (name, slug, price_display_mode, availability)
    values ('ZZ Test Stone', 'zz-test-valid-poa', 'poa', 'poa')$$,
  'a POA product with no price is valid, which is how everything launches'
);

-- Renaming a product records the old slug, so the old URL can still 301.
-- Without this, a Drive folder rename silently 404s a ranking page.
update products set slug = 'zz-test-valid-poa-renamed' where slug = 'zz-test-valid-poa';
select results_eq(
  $$select count(*)::int from product_slugs where product_id =
      (select id from products where slug = 'zz-test-valid-poa-renamed')$$,
  ARRAY[2],
  'renaming a product keeps its old slug for a 301'
);

-- payment_status and paid_at cannot disagree.
select throws_ok(
  $$insert into orders (customer_name, customer_phone, payment_status)
    values ('Test', '0722000000', 'paid')$$,
  '23514',
  null,
  'an order cannot be paid with no paid_at'
);

-- A published post cannot lack alt text on its cover image.
select throws_ok(
  $$insert into blog_posts (title, slug, body, author, status, published_at)
    values ('T', 't', 'b', 'A Person', 'published', now())$$,
  '23514',
  null,
  'a published post must have cover_image_alt'
);

-- line_total is generated, so it cannot disagree with its inputs.
insert into quotes (id, customer_name, customer_phone)
  values ('cccccccc-0000-0000-0000-000000000001', 'ZZ Test Buyer', '0722000000');
insert into quote_items (quote_id, description, quantity, unit_price)
  values ('cccccccc-0000-0000-0000-000000000001', 'Limestone Ivory slab', 3, 25000);
select results_eq(
  $$select line_total from quote_items
     where quote_id = 'cccccccc-0000-0000-0000-000000000001'$$,
  $$select 75000::numeric(12,2)$$,
  'line_total is generated from quantity times unit price'
);

select * from finish();
rollback;
