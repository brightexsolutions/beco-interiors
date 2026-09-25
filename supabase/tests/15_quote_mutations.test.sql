-- Quote mutations: the counter RPC, line edits, status, approval, reissue,
-- and the lock. Prove the negative for anon and for a role that must never
-- touch quotes.
begin;
select plan(28);

\set admin_id    '''a3000000-0000-4000-8000-000000000001'''
\set sales_a_id  '''a3000000-0000-4000-8000-000000000002'''
\set sales_b_id  '''a3000000-0000-4000-8000-000000000003'''
\set pm_id       '''a3000000-0000-4000-8000-000000000004'''
\set product_id  '''a3000000-0000-4000-8000-0000000000aa'''
\set hidden_id   '''a3000000-0000-4000-8000-0000000000ab'''
\set q_owned     '''a3000000-0000-4000-8000-000000000010'''
\set q_other     '''a3000000-0000-4000-8000-000000000011'''
\set q_approve   '''a3000000-0000-4000-8000-000000000012'''
\set line_owned  '''a3000000-0000-4000-8000-000000000020'''
\set line_other  '''a3000000-0000-4000-8000-000000000021'''
\set line_disc   '''a3000000-0000-4000-8000-000000000022'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,   'mut-admin@beco.co.ke'),
  (:sales_a_id::uuid, 'mut-sales-a@beco.co.ke'),
  (:sales_b_id::uuid, 'mut-sales-b@beco.co.ke'),
  (:pm_id::uuid,      'mut-pm@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,   'mut-admin@beco.co.ke',   'Mut Admin', 'beco_admin', true),
  (:sales_a_id::uuid, 'mut-sales-a@beco.co.ke', 'Mut A',     'beco_sales', true),
  (:sales_b_id::uuid, 'mut-sales-b@beco.co.ke', 'Mut B',     'beco_sales', true),
  (:pm_id::uuid,      'mut-pm@beco.co.ke',      'Mut PM',    'beco_product_manager', true);

insert into products (id, name, slug, price, price_display_mode, is_published, unit)
values
  (:product_id::uuid, 'ZZ Mut Slab', 'zz-mut-slab', 65000, 'fixed', true, 'per slab'),
  (:hidden_id::uuid,  'ZZ Mut Hidden', 'zz-mut-hidden', 1000, 'fixed', false, 'each');

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, updated_at)
values
  (:q_owned::uuid,   'Owned',    '0700000010', 'walk_in', 'reviewing', :sales_a_id::uuid, :sales_a_id::uuid, '2026-09-01 09:00:00+00'),
  (:q_other::uuid,   'Other',    '0700000011', 'phone',   'reviewing', :sales_b_id::uuid, :sales_b_id::uuid, '2026-09-01 09:00:00+00'),
  (:q_approve::uuid, 'Discount', '0700000012', 'walk_in', 'reviewing', :sales_a_id::uuid, :sales_a_id::uuid, '2026-09-01 09:00:00+00');

insert into quote_items (id, quote_id, product_id, description, quantity, list_price, unit_price)
values
  (:line_owned::uuid, :q_owned::uuid,   :product_id::uuid, 'ZZ Mut Slab', 1, 65000, 65000),
  (:line_other::uuid, :q_other::uuid,   :product_id::uuid, 'ZZ Mut Slab', 1, 65000, 65000),
  (:line_disc::uuid,  :q_approve::uuid, :product_id::uuid, 'ZZ Mut Slab', 1, 65000, 55000);

-- ---------- as sales A ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3000000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select create_counter_quote(
      'Walk In Customer',
      '0722000010',
      'walk_in',
      '[{"product_id":"a3000000-0000-4000-8000-0000000000aa","quantity":1.5,"unit_price":60000}]'::jsonb
    )$$,
  'beco_sales CAN raise a counter quote'
);

select is(
  (select created_by = assigned_to and assigned_to = 'a3000000-0000-4000-8000-000000000002'::uuid
     from quotes where customer_name = 'Walk In Customer'),
  true,
  'a counter quote is owned by the salesperson who raised it, both sides'
);

select is(
  (select status from quotes where customer_name = 'Walk In Customer')::text,
  'reviewing',
  'a counter quote starts in reviewing, it already has an owner'
);

select is(
  (select list_price from quote_items qi
     join quotes q on q.id = qi.quote_id
    where q.customer_name = 'Walk In Customer'),
  65000::numeric,
  'list_price is taken from the product, not from the crafted unit_price'
);

select is(
  (select unit_price from quote_items qi
     join quotes q on q.id = qi.quote_id
    where q.customer_name = 'Walk In Customer'),
  60000::numeric,
  'the override itself is stored, so the discount is measurable'
);

select is(
  (select quantity from quote_items qi
     join quotes q on q.id = qi.quote_id
    where q.customer_name = 'Walk In Customer'),
  1.5::numeric,
  'a per slab line keeps a half quantity'
);

select lives_ok(
  $$select update_quote_line(
      'a3000000-0000-4000-8000-000000000010'::uuid,
      'a3000000-0000-4000-8000-000000000020'::uuid,
      2, 65000,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN edit a line on their own quote'
);

select is(
  (select quantity from quote_items where id = :line_owned::uuid),
  2::numeric,
  'the line quantity actually changed'
);

select throws_ok(
  $$select update_quote_line(
      'a3000000-0000-4000-8000-000000000010'::uuid,
      'a3000000-0000-4000-8000-000000000020'::uuid,
      3, 65000,
      '1999-01-01 00:00:00+00'::timestamptz)$$,
  '40001',
  'This quote changed while you were editing',
  'a stale lock token is refused rather than overwriting'
);

select throws_ok(
  $$select update_quote_line(
      'a3000000-0000-4000-8000-000000000011'::uuid,
      'a3000000-0000-4000-8000-000000000021'::uuid,
      2, 65000,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000011'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT edit a quote assigned to someone else'
);

select lives_ok(
  $$select add_custom_quote_line(
      'a3000000-0000-4000-8000-000000000010'::uuid,
      'Site sample pack',
      1, 0,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN add a custom line to their own quote'
);

select isnt_empty(
  $$select 1 from quote_items
     where quote_id = 'a3000000-0000-4000-8000-000000000010'
       and product_id is null
       and description = 'Site sample pack'$$,
  'the custom line landed with a null product_id'
);

select lives_ok(
  $$select add_catalogue_quote_line(
      'a3000000-0000-4000-8000-000000000010'::uuid,
      'a3000000-0000-4000-8000-0000000000aa'::uuid,
      0.5, 65000,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN add a catalogue product to their own quote later'
);

select is(
  (select count(*) from quote_items
     where quote_id = 'a3000000-0000-4000-8000-000000000010'
       and product_id = 'a3000000-0000-4000-8000-0000000000aa'),
  2::bigint,
  'the catalogue add is a new line, not an overwrite of the existing one'
);

select throws_ok(
  $$select add_catalogue_quote_line(
      'a3000000-0000-4000-8000-000000000011'::uuid,
      'a3000000-0000-4000-8000-0000000000aa'::uuid,
      1, 65000,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000011'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT add a catalogue product to someone else''s quote'
);

select throws_ok(
  $$select add_catalogue_quote_line(
      'a3000000-0000-4000-8000-000000000010'::uuid,
      'a3000000-0000-4000-8000-0000000000ab'::uuid,
      1, 1000,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000010'))$$,
  '22023',
  'That product is not available',
  'an unpublished product cannot be added to a quote'
);

select throws_ok(
  $$select set_quote_status(
      'a3000000-0000-4000-8000-000000000012'::uuid,
      'quoted',
      null,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000012'))$$,
  '23514',
  null,
  'an unapproved discount cannot be marked quoted, enforced at the database'
);

select throws_ok(
  $$select approve_quote(
      'a3000000-0000-4000-8000-000000000012'::uuid,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000012'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT approve their own quote'
);

select throws_ok(
  $$select set_quote_status(
      'a3000000-0000-4000-8000-000000000010'::uuid,
      'new',
      null,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000010'))$$,
  '22023',
  'A quote cannot move back to new',
  'status cannot reverse to new'
);

select throws_ok(
  $$select set_quote_status(
      'a3000000-0000-4000-8000-000000000010'::uuid,
      'lost',
      null,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000010'))$$,
  '22023',
  'Say why this quote was lost',
  'lost requires a reason'
);

-- ---------- as product manager ----------
set local request.jwt.claims = '{"sub":"a3000000-0000-4000-8000-000000000004","role":"authenticated"}';

select throws_ok(
  $$select create_counter_quote(
      'PM Quote', '0722000099', 'walk_in',
      '[{"product_id":"a3000000-0000-4000-8000-0000000000aa","quantity":1}]'::jsonb)$$,
  '42501',
  'Not allowed',
  'beco_product_manager CANNOT raise a counter quote'
);

-- ---------- as admin ----------
set local request.jwt.claims = '{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok(
  $$select approve_quote(
      'a3000000-0000-4000-8000-000000000012'::uuid,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000012'))$$,
  'beco_admin CAN approve a discounted quote'
);

select isnt_empty(
  $$select 1 from quotes
     where id = 'a3000000-0000-4000-8000-000000000012'
       and approved_by = 'a3000000-0000-4000-8000-000000000001'::uuid
       and approved_at is not null$$,
  'approval stamps the admin and a time'
);

select lives_ok(
  $$select set_quote_status(
      'a3000000-0000-4000-8000-000000000012'::uuid,
      'quoted',
      null,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000012'))$$,
  'once approved, quoted succeeds'
);

select lives_ok(
  $$select reissue_quote(
      'a3000000-0000-4000-8000-000000000012'::uuid,
      (select updated_at from quotes where id = 'a3000000-0000-4000-8000-000000000012'))$$,
  'admin CAN reissue a quoted quote'
);

select is(
  (select valid_until >= ((now() at time zone 'Africa/Nairobi')::date)
     from quotes where id = :q_approve::uuid),
  true,
  'reissue stamps a fresh valid_until from today in Nairobi'
);

select lives_ok(
  $$select create_counter_quote(
      'Phone Customer',
      '0722000011',
      'phone',
      '[{"description":"Cut to size upstand","quantity":1,"unit_price":0}]'::jsonb
    )$$,
  'a custom line with no product_id is a valid counter quote'
);

-- ---------- as anon ----------
set local role anon;
reset request.jwt.claims;

select throws_ok(
  $$select create_counter_quote(
      'Anon', '0722000000', 'walk_in',
      '[{"product_id":"a3000000-0000-4000-8000-0000000000aa","quantity":1}]'::jsonb)$$,
  '42501',
  null,
  'anon CANNOT execute create_counter_quote'
);

select * from finish();
rollback;
