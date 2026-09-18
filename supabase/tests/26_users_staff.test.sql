-- Staff user admin: write gate, last-admin, self role, session revoke.
begin;
select plan(12);

\set admin_id      '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id      '''aaaaaaaa-0000-0000-0000-000000000002'''
\set pm_id         '''aaaaaaaa-0000-0000-0000-000000000004'''
\set editor_id     '''aaaaaaaa-0000-0000-0000-000000000005'''
\set brightex_id   '''aaaaaaaa-0000-0000-0000-000000000007'''
\set brightex_b_id '''aaaaaaaa-0000-0000-0000-000000000009'''
\set admin_b_id    '''aaaaaaaa-0000-0000-0000-00000000000a'''
\set created_id    '''aaaaaaaa-0000-0000-0000-00000000000b'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,      'admin@beco.co.ke'),
  (:sales_id::uuid,      'sales.a@beco.co.ke'),
  (:pm_id::uuid,         'pm@beco.co.ke'),
  (:editor_id::uuid,     'editor@beco.co.ke'),
  (:brightex_id::uuid,   'info.brightexsolutions@gmail.com'),
  (:brightex_b_id::uuid, 'second.brightex@gmail.com'),
  (:admin_b_id::uuid,    'admin.b@beco.co.ke'),
  (:created_id::uuid,    'new.sales@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active, must_change_password) values
  (:admin_id::uuid,      'admin@beco.co.ke',    'A Admin',    'beco_admin', true, false),
  (:sales_id::uuid,      'sales.a@beco.co.ke',  'Sales A',    'beco_sales', true, false),
  (:pm_id::uuid,         'pm@beco.co.ke',       'P Manager',  'beco_product_manager', true, false),
  (:editor_id::uuid,     'editor@beco.co.ke',   'E Editor',   'beco_editor', true, false),
  (:brightex_id::uuid,   'info.brightexsolutions@gmail.com', 'Brightex', 'brightex_admin', true, false),
  (:brightex_b_id::uuid, 'second.brightex@gmail.com', 'Brightex Two', 'brightex_admin', true, false),
  (:admin_b_id::uuid,    'admin.b@beco.co.ke',  'B Admin',    'beco_admin', true, false);

update settings set value = '["info.brightexsolutions@gmail.com"]'::jsonb
  where key = 'brightex_allowed_emails';

-- ---------- beco_sales cannot write users ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select throws_ok(
  $$update users set role = 'beco_admin'
     where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'beco_sales CANNOT change its own role'
);

select throws_ok(
  $$select end_user_sessions('aaaaaaaa-0000-0000-0000-000000000002')$$,
  '42501',
  'not allowed',
  'beco_sales cannot revoke sessions'
);

-- ---------- product manager cannot write users ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select is_empty(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning id$$,
  'beco_product_manager CANNOT deactivate anyone'
);

-- ---------- editor cannot write users ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000005","role":"authenticated"}';

select is_empty(
  $$update users set full_name = 'Hacked'
     where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning id$$,
  'beco_editor CANNOT update another user'
);

-- ---------- allowlisted brightex can write, but not self-role ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000007","role":"authenticated"}';

select lives_ok(
  $$update users set role = 'beco_sales'
     where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$,
  'brightex_admin ON the allowlist CAN change another user''s role'
);

select throws_ok(
  $$update users set role = 'beco_admin'
     where id = 'aaaaaaaa-0000-0000-0000-000000000007'$$,
  'P0001',
  'You cannot change your own role',
  'brightex_admin cannot change its own role even through users_write_brightex'
);

select throws_ok(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0000-0000-0000-000000000007'$$,
  'P0001',
  'You cannot deactivate your own account',
  'brightex_admin cannot deactivate itself'
);

-- Two brightex admins: deactivating the other is allowed.
select lives_ok(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0000-0000-0000-000000000009'$$,
  'deactivating a second brightex_admin is allowed'
);

select throws_ok(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0000-0000-0000-000000000007'$$,
  'P0001',
  'You cannot deactivate your own account',
  'self-deactivate is still refused when this row is the last active brightex_admin'
);

-- Reactivate the second so we can prove last-admin on the other role.
update users set is_active = true where id = 'aaaaaaaa-0000-0000-0000-000000000009';

-- Last beco_admin: every other Beco admin, including seed rows, must be
-- inactive so this fixture is actually last.
update users set is_active = false
 where role = 'beco_admin'
   and id <> 'aaaaaaaa-0000-0000-0000-000000000001';

select throws_ok(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'P0001',
  'Cannot deactivate or demote the last active admin of that role',
  'the last active beco_admin cannot be deactivated'
);

insert into users (id, email, full_name, role, is_active, must_change_password, created_by)
values (
  :created_id::uuid,
  'new.sales@beco.co.ke',
  'New Sales',
  'beco_sales',
  true,
  true,
  :brightex_id::uuid
);

select results_eq(
  $$select must_change_password from users where email = 'new.sales@beco.co.ke'$$,
  ARRAY[true],
  'a created user arrives with the forced-change flag'
);

-- ---------- anon cannot execute ----------
set local role anon;
set local request.jwt.claims = '{}';

select throws_ok(
  $$select end_user_sessions('aaaaaaaa-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'anon cannot execute end_user_sessions'
);

select * from finish();
rollback;
