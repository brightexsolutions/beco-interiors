-- Stock columns on products. Writes stay on the existing products_write
-- policy: product manager and admins, never sales, never anon. Quantity
-- cannot go negative, and the D68 half-unit split holds for slabs.

begin;
select plan(16);

\set admin_id      '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id      '''aaaaaaaa-0000-0000-0000-000000000002'''
\set pm_id         '''aaaaaaaa-0000-0000-0000-000000000004'''
\set editor_id     '''aaaaaaaa-0000-0000-0000-000000000005'''
\set slab_id       '''c3900000-0000-4000-8000-000000000001'''
\set handle_id     '''c3900000-0000-4000-8000-000000000002'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,  'zz-stock-admin@beco.co.ke'),
  (:sales_id::uuid,  'zz-stock-sales@beco.co.ke'),
  (:pm_id::uuid,     'zz-stock-pm@beco.co.ke'),
  (:editor_id::uuid, 'zz-stock-editor@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,  'zz-stock-admin@beco.co.ke',  'ZZ Stock Admin',  'beco_admin', true),
  (:sales_id::uuid,  'zz-stock-sales@beco.co.ke',  'ZZ Stock Sales',  'beco_sales', true),
  (:pm_id::uuid,     'zz-stock-pm@beco.co.ke',     'ZZ Stock PM',     'beco_product_manager', true),
  (:editor_id::uuid, 'zz-stock-editor@beco.co.ke', 'ZZ Stock Editor', 'beco_editor', true);

insert into products (id, name, slug, price, price_display_mode, availability, unit, is_published)
values
  (:slab_id::uuid,   'ZZ Stock Slab',   'zz-stock-slab',   65000, 'fixed', 'in_stock', 'per slab',  true),
  (:handle_id::uuid, 'ZZ Stock Handle', 'zz-stock-handle', 1200,  'fixed', 'in_stock', 'per piece', true);

-- ---------- constraints, as postgres so the check fires regardless of RLS ----------
reset role;
set local role postgres;

select throws_ok(
  $$update products set stock_quantity = -1 where slug = 'zz-stock-slab'$$,
  '23514',
  null,
  'stock_quantity cannot go negative'
);

select throws_ok(
  $$update products set low_stock_threshold = -0.5 where slug = 'zz-stock-slab'$$,
  '23514',
  null,
  'low_stock_threshold cannot go negative'
);

select throws_ok(
  $$update products set stock_quantity = 1.3 where slug = 'zz-stock-slab'$$,
  '23514',
  null,
  'a slab cannot be stocked in a quantity that is not a half unit'
);

select lives_ok(
  $$update products set stock_quantity = 1.5, low_stock_threshold = 2 where slug = 'zz-stock-slab'$$,
  'a slab can be stocked at a half unit'
);

select throws_ok(
  $$update products set stock_quantity = 0.5 where slug = 'zz-stock-handle'$$,
  '23514',
  null,
  'a non-slab product cannot be stocked in half units'
);

select lives_ok(
  $$update products set stock_quantity = 4, low_stock_threshold = 1 where slug = 'zz-stock-handle'$$,
  'a non-slab product stocks in whole units'
);

select lives_ok(
  $$update products set stock_quantity = 0 where slug = 'zz-stock-handle'$$,
  'zero is a valid count, and is how a product reads as out of stock'
);

select lives_ok(
  $$update products set stock_quantity = null where slug = 'zz-stock-handle'$$,
  'NULL stock is uncounted, not a constraint violation'
);

-- Auditing already fires on products. A stock write must leave a row.
select isnt_empty(
  $$select 1 from audit_log
     where entity_type = 'products'
       and entity_id = 'c3900000-0000-4000-8000-000000000001'
       and action = 'update'$$,
  'a stock write is audited on products'
);

-- ---------- beco_product_manager can write ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select lives_ok(
  $$update products set stock_quantity = 8, low_stock_threshold = 2
     where slug = 'zz-stock-slab'$$,
  'beco_product_manager CAN write stock'
);

select isnt_empty(
  $$select 1 from products where slug = 'zz-stock-slab' and stock_quantity = 8$$,
  'the product manager write actually landed'
);

-- ---------- beco_admin can write ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$update products set stock_quantity = 6 where slug = 'zz-stock-handle'$$,
  'beco_admin CAN write stock'
);

-- ---------- beco_sales cannot ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select is_empty(
  $$update products set stock_quantity = 99 where slug = 'zz-stock-slab' returning id$$,
  'beco_sales CANNOT write stock'
);

-- ---------- beco_editor cannot ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated"}';

select is_empty(
  $$update products set stock_quantity = 99 where slug = 'zz-stock-slab' returning id$$,
  'beco_editor CANNOT write stock'
);

-- ---------- anon cannot ----------
set local role anon;
reset request.jwt.claims;

select is_empty(
  $$update products set stock_quantity = 99 where slug = 'zz-stock-slab' returning id$$,
  'anon CANNOT write stock'
);

select is(
  (select stock_quantity from products where slug = 'zz-stock-slab'),
  8::numeric,
  'anon and sales writes did not land: the manager''s 8 is still there'
);

select * from finish();
rollback;
