-- The staff manage grant, D135: a granted Beco person manages Beco accounts
-- and nothing else. Every refusal is tried from the holder's own seat.
begin;
select plan(26);

\set bx_id      '''aaaaaaaa-0045-0000-0000-000000000001'''
\set holder_id  '''aaaaaaaa-0045-0000-0000-000000000002'''
\set admin_id   '''aaaaaaaa-0045-0000-0000-000000000003'''
\set sales_id   '''aaaaaaaa-0045-0000-0000-000000000004'''
\set new_id     '''aaaaaaaa-0045-0000-0000-000000000005'''
\set lapsed_id  '''aaaaaaaa-0045-0000-0000-000000000006'''
\set offlist_id '''aaaaaaaa-0045-0000-0000-000000000007'''
\set bx2_id     '''aaaaaaaa-0045-0000-0000-000000000008'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:bx_id::uuid,      'zz45-bx@brightex.test'),
  (:holder_id::uuid,  'zz45-holder@beco.test'),
  (:admin_id::uuid,   'zz45-admin@beco.test'),
  (:sales_id::uuid,   'zz45-sales@beco.test'),
  (:new_id::uuid,     'zz45-new@beco.test'),
  (:lapsed_id::uuid,  'zz45-lapsed@beco.test'),
  (:offlist_id::uuid, 'zz45-offlist@brightex.test'),
  (:bx2_id::uuid,     'zz45-bx2@brightex.test')
) as t(id, email);

insert into users (id, email, full_name, role, is_active, can_manage_users) values
  (:bx_id::uuid,      'zz45-bx@brightex.test',      'ZZ Brightex',  'brightex_admin', true,  false),
  (:holder_id::uuid,  'zz45-holder@beco.test',      'ZZ Holder',    'beco_admin',     true,  true),
  (:admin_id::uuid,   'zz45-admin@beco.test',       'ZZ Admin',     'beco_admin',     true,  false),
  (:sales_id::uuid,   'zz45-sales@beco.test',       'ZZ Sales',     'beco_sales',     true,  false),
  (:lapsed_id::uuid,  'zz45-lapsed@beco.test',      'ZZ Lapsed',    'beco_admin',     false, true),
  (:offlist_id::uuid, 'zz45-offlist@brightex.test', 'ZZ Offlist',   'brightex_admin', true,  true),
  (:bx2_id::uuid,     'zz45-bx2@brightex.test',     'ZZ Brightex 2','brightex_admin', true,  false);

update settings
   set value = value || '["zz45-bx@brightex.test", "zz45-bx2@brightex.test"]'::jsonb
 where key = 'brightex_allowed_emails';

set local role authenticated;

-- ---------- who holds it ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000002","role":"authenticated"}';
select ok(has_staff_manage(), 'a granted active Beco admin holds staff manage');

set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000003","role":"authenticated"}';
select ok(not has_staff_manage(), 'an ungranted Beco admin does not');

set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000006","role":"authenticated"}';
select ok(not has_staff_manage(), 'a deactivated account loses the grant with its access');

set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000007","role":"authenticated"}';
select ok(not has_staff_manage(), 'a Brightex role off the allowlist gains nothing from the flag');

set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000001","role":"authenticated"}';
select ok(has_staff_manage(), 'an allowlisted Brightex admin holds it by role');

-- ---------- an ungranted Beco admin is where it always was ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000003","role":"authenticated"}';

select throws_ok(
  $$insert into users (id, email, full_name, role)
    values ('aaaaaaaa-0045-0000-0000-000000000005', 'zz45-new@beco.test', 'ZZ New', 'beco_sales')$$,
  '42501', null,
  'an ungranted Beco admin cannot add a user'
);

select is_empty(
  $$update users set role = 'beco_product_manager'
     where id = 'aaaaaaaa-0045-0000-0000-000000000004' returning id$$,
  'an ungranted Beco admin cannot change a role'
);

select throws_ok(
  $$select end_user_sessions('aaaaaaaa-0045-0000-0000-000000000004')$$,
  '42501', null,
  'an ungranted Beco admin cannot end anyone''s sessions'
);

-- ---------- the holder: Beco accounts, yes ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000002","role":"authenticated"}';

select isnt_empty(
  $$select id from users where id = 'aaaaaaaa-0045-0000-0000-000000000001'$$,
  'the holder sees Brightex rows, so the list is whole'
);

select lives_ok(
  $$insert into users (id, email, full_name, role, must_change_password)
    values ('aaaaaaaa-0045-0000-0000-000000000005', 'zz45-new@beco.test', 'ZZ New', 'beco_sales', true)$$,
  'the holder adds a Beco salesperson'
);

select isnt_empty(
  $$update users set role = 'beco_product_manager'
     where id = 'aaaaaaaa-0045-0000-0000-000000000004' returning id$$,
  'the holder changes a Beco role'
);

select isnt_empty(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0045-0000-0000-000000000004' returning id$$,
  'the holder deactivates a Beco account'
);

select lives_ok(
  $$select end_user_sessions('aaaaaaaa-0045-0000-0000-000000000004')$$,
  'the holder ends a Beco account''s sessions'
);

-- ---------- the holder: Brightex accounts and grants, never ----------
select throws_ok(
  $$insert into users (id, email, full_name, role)
    values ('aaaaaaaa-0045-0000-0000-000000000009', 'zz45-sneak@brightex.test', 'ZZ Sneak', 'brightex_admin')$$,
  '42501', null,
  'the holder cannot create a Brightex admin'
);

select throws_ok(
  $$insert into users (id, email, full_name, role, can_read_audit)
    values ('aaaaaaaa-0045-0000-0000-000000000009', 'zz45-sneak@beco.test', 'ZZ Sneak', 'beco_sales', true)$$,
  '42501', null,
  'the holder cannot create an account that already carries a grant'
);

select throws_ok(
  $$insert into users (id, email, full_name, role, can_manage_users)
    values ('aaaaaaaa-0045-0000-0000-000000000009', 'zz45-sneak@beco.test', 'ZZ Sneak', 'beco_admin', true)$$,
  '42501', null,
  'the holder cannot create a second holder'
);

select throws_ok(
  $$update users set role = 'brightex_admin'
     where id = 'aaaaaaaa-0045-0000-0000-000000000005'$$,
  '42501', null,
  'the holder cannot promote a Beco account into Brightex'
);

select is_empty(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0045-0000-0000-000000000001' returning id$$,
  'the holder cannot deactivate a Brightex admin'
);

select is_empty(
  $$update users set full_name = 'Renamed'
     where id = 'aaaaaaaa-0045-0000-0000-000000000001' returning id$$,
  'the holder cannot edit a Brightex row at all'
);

select throws_ok(
  $$select end_user_sessions('aaaaaaaa-0045-0000-0000-000000000001')$$,
  '42501', null,
  'the holder cannot end a Brightex admin''s sessions'
);

select throws_ok(
  $$update users set can_read_audit = true
     where id = 'aaaaaaaa-0045-0000-0000-000000000003'$$,
  'P0001', 'Only Brightex can assign those permissions',
  'the holder cannot pass on audit read'
);

select throws_ok(
  $$update users set can_manage_users = true
     where id = 'aaaaaaaa-0045-0000-0000-000000000003'$$,
  'P0001', 'Only Brightex can assign those permissions',
  'the holder cannot pass on staff manage'
);

select throws_ok(
  $$update users set role = 'beco_sales'
     where id = 'aaaaaaaa-0045-0000-0000-000000000002'$$,
  'P0001', 'You cannot change your own role',
  'the holder cannot change their own role through the manager policy'
);

select throws_ok(
  $$update users set is_active = false
     where id = 'aaaaaaaa-0045-0000-0000-000000000002'$$,
  'P0001', 'You cannot deactivate your own account',
  'the holder cannot deactivate themselves'
);

select is_empty(
  $$delete from users where id = 'aaaaaaaa-0045-0000-0000-000000000003' returning id$$,
  'the holder cannot delete an account, only deactivate it'
);

-- ---------- only Brightex assigns it ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0045-0000-0000-000000000001","role":"authenticated"}';

select isnt_empty(
  $$update users set can_manage_users = true
     where id = 'aaaaaaaa-0045-0000-0000-000000000003' returning id$$,
  'an allowlisted Brightex admin assigns staff manage'
);

select * from finish();
rollback;
