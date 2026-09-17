-- Batch line save: one lock, every dirty line, nobody else's quote.
begin;
select plan(5);

\set sales_a_id  '''a3500000-0000-4000-8000-000000000002'''
\set sales_b_id  '''a3500000-0000-4000-8000-000000000003'''
\set product_id  '''a3500000-0000-4000-8000-0000000000aa'''
\set q_owned     '''a3500000-0000-4000-8000-000000000010'''
\set q_other     '''a3500000-0000-4000-8000-000000000011'''
\set line_a      '''a3500000-0000-4000-8000-000000000020'''
\set line_b      '''a3500000-0000-4000-8000-000000000021'''
\set line_other  '''a3500000-0000-4000-8000-000000000022'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:sales_a_id::uuid, 'batch-sales-a@beco.co.ke'),
  (:sales_b_id::uuid, 'batch-sales-b@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:sales_a_id::uuid, 'batch-sales-a@beco.co.ke', 'Batch A', 'beco_sales', true),
  (:sales_b_id::uuid, 'batch-sales-b@beco.co.ke', 'Batch B', 'beco_sales', true);

insert into products (id, name, slug, price, price_display_mode, is_published, unit)
values (:product_id::uuid, 'ZZ Batch Slab', 'zz-batch-slab', 65000, 'fixed', true, 'per slab');

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, updated_at)
values
  (:q_owned::uuid, 'Owned', '0700000010', 'walk_in', 'reviewing', :sales_a_id::uuid, :sales_a_id::uuid, '2026-09-01 09:00:00+00'),
  (:q_other::uuid, 'Other', '0700000011', 'phone',   'reviewing', :sales_b_id::uuid, :sales_b_id::uuid, '2026-09-01 09:00:00+00');

insert into quote_items (id, quote_id, product_id, description, quantity, list_price, unit_price)
values
  (:line_a::uuid,     :q_owned::uuid, :product_id::uuid, 'ZZ Batch Slab', 1, 65000, 65000),
  (:line_b::uuid,     :q_owned::uuid, :product_id::uuid, 'ZZ Batch Slab', 2, 65000, 65000),
  (:line_other::uuid, :q_other::uuid, :product_id::uuid, 'ZZ Batch Slab', 1, 65000, 65000);

set local role authenticated;
set local request.jwt.claims = '{"sub":"a3500000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select update_quote_lines(
      'a3500000-0000-4000-8000-000000000010'::uuid,
      '[{"line_id":"a3500000-0000-4000-8000-000000000020","quantity":3,"unit_price":85000},
        {"line_id":"a3500000-0000-4000-8000-000000000021","quantity":0.5,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a3500000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN save every dirty line in one lock'
);

select is(
  (select quantity from quote_items where id = :line_a::uuid),
  3::numeric,
  'the first line quantity actually changed'
);

select is(
  (select quantity from quote_items where id = :line_b::uuid),
  0.5::numeric,
  'the second line quantity actually changed'
);

select throws_ok(
  $$select update_quote_lines(
      'a3500000-0000-4000-8000-000000000011'::uuid,
      '[{"line_id":"a3500000-0000-4000-8000-000000000022","quantity":2,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a3500000-0000-4000-8000-000000000011'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT batch-save a quote assigned to someone else'
);

select throws_ok(
  $$select update_quote_lines(
      'a3500000-0000-4000-8000-000000000010'::uuid,
      '[{"line_id":"a3500000-0000-4000-8000-000000000020","quantity":1,"unit_price":65000}]'::jsonb,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  '40001',
  'This quote changed while you were editing',
  'a stale lock token is refused rather than overwriting'
);

select * from finish();
rollback;
