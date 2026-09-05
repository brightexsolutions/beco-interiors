-- Per role WRITE tests. This is the layer most projects skip.
--
-- auth.uid() reads request.jwt.claims ->> 'sub', so becoming a user means
-- setting that claim and switching to the `authenticated` role.
begin;
select plan(16);

-- Fixed ids so the assertions below are readable.
\set admin_id      '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_a_id    '''aaaaaaaa-0000-0000-0000-000000000002'''
\set sales_b_id    '''aaaaaaaa-0000-0000-0000-000000000003'''
\set pm_id         '''aaaaaaaa-0000-0000-0000-000000000004'''
\set editor_id     '''aaaaaaaa-0000-0000-0000-000000000005'''
\set inactive_id   '''aaaaaaaa-0000-0000-0000-000000000006'''
\set brightex_id   '''aaaaaaaa-0000-0000-0000-000000000007'''
\set impostor_id   '''aaaaaaaa-0000-0000-0000-000000000008'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,    'admin@beco.co.ke'),
  (:sales_a_id::uuid,  'sales.a@beco.co.ke'),
  (:sales_b_id::uuid,  'sales.b@beco.co.ke'),
  (:pm_id::uuid,       'pm@beco.co.ke'),
  (:editor_id::uuid,   'editor@beco.co.ke'),
  (:inactive_id::uuid, 'gone@beco.co.ke'),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com'),
  (:impostor_id::uuid, 'notonthelist@gmail.com')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,    'admin@beco.co.ke',    'A Admin',    'beco_admin', true),
  (:sales_a_id::uuid,  'sales.a@beco.co.ke',  'Sales A',    'beco_sales', true),
  (:sales_b_id::uuid,  'sales.b@beco.co.ke',  'Sales B',    'beco_sales', true),
  (:pm_id::uuid,       'pm@beco.co.ke',       'P Manager',  'beco_product_manager', true),
  (:editor_id::uuid,   'editor@beco.co.ke',   'E Editor',   'beco_editor', true),
  (:inactive_id::uuid, 'gone@beco.co.ke',     'Departed',   'beco_admin', false),
  (:brightex_id::uuid, 'info.brightexsolutions@gmail.com', 'Brightex', 'brightex_admin', true),
  -- Right role, WRONG email. This is the D42 test that matters.
  (:impostor_id::uuid, 'notonthelist@gmail.com', 'Impostor', 'brightex_admin', true);

update settings set value = '["info.brightexsolutions@gmail.com"]'::jsonb
  where key = 'brightex_allowed_emails';

-- Sales A owns a quote, Sales B does not.
insert into quotes (id, customer_name, customer_phone, assigned_to)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'Achieng', '0722111111', :sales_a_id::uuid);

-- ---------- beco_sales ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select is(current_user_role()::text, 'beco_sales', 'sales A is recognised as beco_sales');

select lives_ok(
  $$update quotes set status = 'reviewing'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'beco_sales CAN update a quote assigned to it'
);

-- Sales B tries to write Sales A's quote.
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}';

select is_empty(
  $$update quotes set status = 'won'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning id$$,
  'beco_sales CANNOT write another salesperson''s quote'
);

select isnt_empty(
  $$select * from quotes where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'but beco_sales can still READ it, which reassignment needs'
);

-- Privilege escalation: change my own role.
-- A failing WITH CHECK raises rather than filtering, so this throws.
select throws_ok(
  $$update users set role = 'beco_admin'
     where id = 'aaaaaaaa-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'beco_sales CANNOT change its own role'
);

select throws_ok(
  $$insert into products (name, slug, price_display_mode)
    values ('Sneaky', 'zz-test-sneaky', 'poa')$$,
  '42501',
  null,
  'beco_sales CANNOT create a product'
);

-- D80: the launch switch is a beco_admin or brightex_admin action, not a
-- salesperson one, even though sales can read settings.
select is_empty(
  $$update settings set value = 'true'::jsonb
     where key = 'site_launch_live' returning key$$,
  'beco_sales CANNOT throw the launch switch'
);

-- ---------- beco_product_manager ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select lives_ok(
  $$insert into products (name, slug, price_display_mode)
    values ('ZZ Test Stone', 'zz-test-pm-created', 'poa')$$,
  'beco_product_manager CAN create a product'
);

select is_empty(
  $$update quotes set status = 'won'
     where id = 'bbbbbbbb-0000-0000-0000-000000000001' returning id$$,
  'beco_product_manager CANNOT touch quotes'
);

select is_empty(
  $$update users set role = 'beco_admin'
     where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning id$$,
  'beco_product_manager CANNOT change anyone''s role'
);

-- ---------- beco_editor ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated"}';

select lives_ok(
  $$insert into blog_posts (title, slug, body, author)
    values ('ZZ Test Post', 'zz-test-post', 'Body.', 'E Editor')$$,
  'beco_editor CAN write a blog post'
);

select throws_ok(
  $$insert into products (name, slug, price_display_mode)
    values ('Editor product', 'zz-test-editor', 'poa')$$,
  '42501',
  null,
  'beco_editor CANNOT create a product'
);

-- ---------- inactive user ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000006","role":"authenticated"}';

select ok(
  current_user_role() is null,
  'an inactive user has NO role at all, so every policy denies it'
);

-- ---------- beco_admin ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select isnt_empty(
  $$update settings set value = 'true'::jsonb
     where key = 'site_launch_live' returning key$$,
  'beco_admin CAN throw the launch switch, from apps/dashboard'
);

-- ---------- D42: the Studio gate needs BOTH conditions ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000007","role":"authenticated"}';
select ok(is_brightex_user(), 'brightex_admin ON the allowlist passes the Studio gate');

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000008","role":"authenticated"}';
select ok(
  not is_brightex_user(),
  'brightex_admin NOT on the allowlist fails, which a domain check would have missed'
);

select * from finish();
rollback;
