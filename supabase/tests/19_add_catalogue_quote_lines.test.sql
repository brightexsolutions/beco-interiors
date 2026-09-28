-- Batch catalogue add: one lock, several published products.
begin;
select plan(9);

\set sales_a_id  '''a3800000-0000-4000-8000-000000000002'''
\set sales_b_id  '''a3800000-0000-4000-8000-000000000003'''
\set pm_id       '''a3800000-0000-4000-8000-000000000004'''
\set product_a   '''a3800000-0000-4000-8000-0000000000aa'''
\set product_b   '''a3800000-0000-4000-8000-0000000000ab'''
\set hidden_id   '''a3800000-0000-4000-8000-0000000000ac'''
\set q_owned     '''a3800000-0000-4000-8000-000000000010'''
\set q_other     '''a3800000-0000-4000-8000-000000000011'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:sales_a_id::uuid, 'batch-cat-a@beco.co.ke'),
  (:sales_b_id::uuid, 'batch-cat-b@beco.co.ke'),
  (:pm_id::uuid,      'batch-cat-pm@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:sales_a_id::uuid, 'batch-cat-a@beco.co.ke',  'Batch A',  'beco_sales', true),
  (:sales_b_id::uuid, 'batch-cat-b@beco.co.ke',  'Batch B',  'beco_sales', true),
  (:pm_id::uuid,      'batch-cat-pm@beco.co.ke', 'Batch PM', 'beco_product_manager', true);

insert into products (id, name, slug, price, price_display_mode, is_published, unit)
values
  (:product_a::uuid, 'ZZ Batch Amber', 'zz-batch-amber', 65000, 'fixed', true, 'per slab'),
  (:product_b::uuid, 'ZZ Batch Calacatta', 'zz-batch-calacatta', 89000, 'fixed', true, 'per slab'),
  (:hidden_id::uuid, 'ZZ Batch Hidden', 'zz-batch-hidden', 1000, 'fixed', false, 'each');

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by)
values
  (:q_owned::uuid, 'Owned', '0700000010', 'walk_in', 'reviewing', :sales_a_id::uuid, :sales_a_id::uuid),
  (:q_other::uuid, 'Other', '0700000011', 'phone',   'reviewing', :sales_b_id::uuid, :sales_b_id::uuid);

-- ---------- as sales A ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3800000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select add_catalogue_quote_lines(
      'a3800000-0000-4000-8000-000000000010'::uuid,
      '[
        {"product_id":"a3800000-0000-4000-8000-0000000000aa","quantity":0.5,"unit_price":65000},
        {"product_id":"a3800000-0000-4000-8000-0000000000ab","quantity":0.5,"unit_price":89000}
      ]'::jsonb,
      (select updated_at from quotes where id = 'a3800000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN add two catalogue products under one lock'
);

select is(
  (select count(*) from quote_items where quote_id = 'a3800000-0000-4000-8000-000000000010'),
  2::bigint,
  'both selected products landed as new lines'
);

select throws_ok(
  $$select add_catalogue_quote_lines(
      'a3800000-0000-4000-8000-000000000011'::uuid,
      '[{"product_id":"a3800000-0000-4000-8000-0000000000aa","quantity":1,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a3800000-0000-4000-8000-000000000011'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT add catalogue products to someone else''s quote'
);

select throws_ok(
  $$select add_catalogue_quote_lines(
      'a3800000-0000-4000-8000-000000000010'::uuid,
      '[
        {"product_id":"a3800000-0000-4000-8000-0000000000aa","quantity":1,"unit_price":65000},
        {"product_id":"a3800000-0000-4000-8000-0000000000ac","quantity":1,"unit_price":1000}
      ]'::jsonb,
      (select updated_at from quotes where id = 'a3800000-0000-4000-8000-000000000010'))$$,
  '22023',
  'That product is not available',
  'an unpublished product cannot ride along in a batch add'
);

select is(
  (select count(*) from quote_items where quote_id = 'a3800000-0000-4000-8000-000000000010'),
  2::bigint,
  'a refused batch does not leave the valid products behind'
);

select throws_ok(
  $$select add_catalogue_quote_lines(
      'a3800000-0000-4000-8000-000000000010'::uuid,
      '[{"product_id":"a3800000-0000-4000-8000-0000000000aa","quantity":1,"unit_price":65000}]'::jsonb,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409',
  'This quote changed while you were editing',
  'a stale lock token is refused rather than overwriting'
);

select throws_ok(
  $$select add_catalogue_quote_lines(
      'a3800000-0000-4000-8000-000000000010'::uuid,
      '[]'::jsonb,
      (select updated_at from quotes where id = 'a3800000-0000-4000-8000-000000000010'))$$,
  '22023',
  'Pick at least one product',
  'an empty selection is refused before touching lines'
);

-- ---------- as product manager ----------
set local request.jwt.claims = '{"sub":"a3800000-0000-4000-8000-000000000004","role":"authenticated"}';

select throws_ok(
  $$select add_catalogue_quote_lines(
      'a3800000-0000-4000-8000-000000000010'::uuid,
      '[{"product_id":"a3800000-0000-4000-8000-0000000000aa","quantity":1,"unit_price":65000}]'::jsonb,
      (select updated_at from quotes where id = 'a3800000-0000-4000-8000-000000000010'))$$,
  '42501',
  'Not allowed',
  'beco_product_manager CANNOT add catalogue products to a quote'
);

-- ---------- as anon ----------
set local role anon;
reset request.jwt.claims;

select throws_ok(
  $$select add_catalogue_quote_lines(
      'a3800000-0000-4000-8000-000000000010'::uuid,
      '[{"product_id":"a3800000-0000-4000-8000-0000000000aa","quantity":1,"unit_price":65000}]'::jsonb,
      now())$$,
  '42501',
  null,
  'anon CANNOT execute add_catalogue_quote_lines'
);

select * from finish();
rollback;
