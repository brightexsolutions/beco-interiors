-- Deleting a staff account, D158: Brightex only, never their own, soft, and
-- the address comes free. Every refusal is tried from the seat that must be
-- refused.
begin;
select plan(16);

\set bx_id      '''aaaaaaaa-0047-0000-0000-000000000001'''
\set holder_id  '''aaaaaaaa-0047-0000-0000-000000000002'''
\set sales_id   '''aaaaaaaa-0047-0000-0000-000000000003'''
\set offlist_id '''aaaaaaaa-0047-0000-0000-000000000004'''
\set again_id   '''aaaaaaaa-0047-0000-0000-000000000005'''
\set third_id   '''aaaaaaaa-0047-0000-0000-000000000006'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:bx_id::uuid,      'zz47-bx@brightex.test'),
  (:holder_id::uuid,  'zz47-holder@beco.test'),
  (:sales_id::uuid,   'zz47-sales@beco.test'),
  (:offlist_id::uuid, 'zz47-offlist@brightex.test'),
  (:again_id::uuid,   'zz47-again@beco.test'),
  (:third_id::uuid,   'zz47-third@beco.test')
) as t(id, email);

insert into users (id, email, full_name, role, is_active, can_manage_users) values
  (:bx_id::uuid,      'zz47-bx@brightex.test',      'ZZ Brightex', 'brightex_admin', true, false),
  (:holder_id::uuid,  'zz47-holder@beco.test',      'ZZ Holder',   'beco_admin',     true, true),
  (:sales_id::uuid,   'zz47-sales@beco.test',       'ZZ Sales',    'beco_sales',     true, false),
  (:offlist_id::uuid, 'zz47-offlist@brightex.test', 'ZZ Offlist',  'brightex_admin', true, false);

update settings
   set value = value || '["zz47-bx@brightex.test"]'::jsonb
 where key = 'brightex_allowed_emails';

-- A session for the account about to go, so its ending can be seen.
insert into auth.sessions (id, user_id, created_at, updated_at)
values ('bbbbbbbb-0047-0000-0000-000000000001', :sales_id::uuid, now(), now());

set local role authenticated;

-- ---------- who may not ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0047-0000-0000-000000000002","role":"authenticated"}';
select throws_ok(
  $$select delete_user('aaaaaaaa-0047-0000-0000-000000000003',
                       (select updated_at from users where id = 'aaaaaaaa-0047-0000-0000-000000000003'))$$,
  '42501', null,
  'a holder of the staff grant cannot delete an account'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0047-0000-0000-000000000004","role":"authenticated"}';
select throws_ok(
  $$select delete_user('aaaaaaaa-0047-0000-0000-000000000003',
                       (select updated_at from users where id = 'aaaaaaaa-0047-0000-0000-000000000003'))$$,
  '42501', null,
  'a Brightex role off the allowlist cannot delete an account'
);

set local role anon;
select throws_ok(
  $$select delete_user('aaaaaaaa-0047-0000-0000-000000000003', now())$$,
  '42501', null,
  'anon cannot call delete_user at all'
);
set local role authenticated;

-- ---------- Brightex, the refusals that stay ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0047-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select delete_user('aaaaaaaa-0047-0000-0000-000000000001',
                       (select updated_at from users where id = 'aaaaaaaa-0047-0000-0000-000000000001'))$$,
  'P0001', 'You cannot delete your own account',
  'Brightex cannot delete their own account'
);

select throws_ok(
  $$select delete_user('aaaaaaaa-0047-0000-0000-000000000003',
                       (select updated_at from users where id = 'aaaaaaaa-0047-0000-0000-000000000003') - interval '1 second')$$,
  'P0001', 'This account changed while you were editing',
  'a stale lock token is refused'
);

-- ---------- Brightex deletes ----------
select lives_ok(
  $$select delete_user('aaaaaaaa-0047-0000-0000-000000000003',
                       (select updated_at from users where id = 'aaaaaaaa-0047-0000-0000-000000000003'))$$,
  'an allowlisted Brightex admin deletes a Beco account'
);

select ok(
  (select deleted_at is not null
      and deleted_by = 'aaaaaaaa-0047-0000-0000-000000000001'
      and not is_active
      and not is_public
      and not can_manage_users
      and module_grants = '{}'
     from users where id = 'aaaaaaaa-0047-0000-0000-000000000003'),
  'the row stays, flagged deleted, inactive and stripped of every grant'
);

-- auth.sessions and audit_log are read here as postgres: the test is
-- checking what the function did, not what the caller may see.
reset role;
select is_empty(
  $$select 1 from auth.sessions where user_id = 'aaaaaaaa-0047-0000-0000-000000000003'$$,
  'and its sessions are gone'
);

select isnt_empty(
  $$select 1 from audit_log
     where entity_type = 'users'
       and entity_id::text = 'aaaaaaaa-0047-0000-0000-000000000003'
       and action = 'delete'$$,
  'the audit log records a delete, not an update'
);
set local role authenticated;

select throws_ok(
  $$select delete_user('aaaaaaaa-0047-0000-0000-000000000003',
                       (select updated_at from users where id = 'aaaaaaaa-0047-0000-0000-000000000003'))$$,
  'P0001', 'That account is gone',
  'a deleted account cannot be deleted twice'
);

-- ---------- the address comes free ----------
select lives_ok(
  $$insert into users (id, email, full_name, role)
    values ('aaaaaaaa-0047-0000-0000-000000000005', 'zz47-sales@beco.test', 'ZZ Sales Again', 'beco_sales')$$,
  'a new account may take a deleted account''s email'
);

select throws_ok(
  $$insert into users (id, email, full_name, role)
    values ('aaaaaaaa-0047-0000-0000-000000000006', 'zz47-sales@beco.test', 'ZZ Sales Third', 'beco_sales')$$,
  '23505', null,
  'but two live accounts still cannot share one'
);

-- ---------- a deleted row is out of everyone else''s reach ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0047-0000-0000-000000000002","role":"authenticated"}';
select throws_ok(
  $$update users set deleted_at = null where id = 'aaaaaaaa-0047-0000-0000-000000000003'$$,
  'P0001', null,
  'a holder cannot bring a deleted account back'
);

select throws_ok(
  $$update users set full_name = 'ZZ Renamed' where id = 'aaaaaaaa-0047-0000-0000-000000000003'$$,
  'P0001', 'That account is gone',
  'nor edit it'
);

-- ---------- the deleted account itself holds nothing ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0047-0000-0000-000000000003","role":"authenticated"}';
select ok(current_user_role() is null, 'a deleted account has no role');
select ok(not has_staff_manage(), 'and no grant');

select * from finish();
rollback;
