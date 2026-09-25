-- Migration 26: the dashboard login lifecycle.
--
-- record_sign_in() and complete_first_login() are the only paths that may
-- move last_login_at and must_change_password. A signed-in user cannot move
-- either by hand, and anon cannot call the functions at all.
--
-- audit_log is admin-read only, so every assertion that counts audit rows
-- drops back to the postgres role (BYPASSRLS) to see them; the acting is done
-- as the authenticated user whose behaviour is under test.
begin;
select plan(18);

\set fresh '''f1000000-0000-4000-8000-000000000001'''
\set admin '''f1000000-0000-4000-8000-000000000002'''
\set gone  '''f1000000-0000-4000-8000-000000000003'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:fresh::uuid, 'fresh@beco.co.ke'),
  (:admin::uuid, 'adm@beco.co.ke'),
  (:gone::uuid,  'gone2@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active, must_change_password) values
  (:fresh::uuid, 'fresh@beco.co.ke', 'Fresh Start', 'beco_sales', true,  true),
  (:admin::uuid, 'adm@beco.co.ke',   'An Admin',    'beco_admin', true,  true),
  (:gone::uuid,  'gone2@beco.co.ke', 'Departed',    'beco_sales', false, true);

-- ---------- as the fresh sales user, mid forced-change ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  (select last_login_at from users where id = :fresh::uuid), null,
  'last_login_at starts null'
);

select record_sign_in();

select isnt(
  (select last_login_at from users where id = :fresh::uuid), null,
  'record_sign_in stamps last_login_at'
);

set local role postgres;
select is(
  (select count(*)::int from audit_log where entity_id = :fresh::uuid and action = 'login'),
  1,
  'record_sign_in writes exactly one login audit row'
);
set local role authenticated;

select record_sign_in();

set local role postgres;
select is(
  (select count(*)::int from audit_log where entity_id = :fresh::uuid and action = 'login'),
  2,
  'a later sign-in writes another login audit row, so every sign-in is recorded'
);

-- last_login_at is stamped with clock_timestamp(), so it advances between two
-- sign-ins even inside one transaction.
create temporary table _ll as
  select last_login_at as t from users where id = :fresh::uuid;
select pg_sleep(0.02);
select record_sign_in();
select ok(
  (select last_login_at from users where id = :fresh::uuid) > (select t from _ll),
  'last_login_at moves forward on the second sign-in'
);
drop table _ll;
set local role authenticated;

select is(
  (select must_change_password from users where id = :fresh::uuid), true,
  'still flagged before complete_first_login'
);

select complete_first_login();

select is(
  (select must_change_password from users where id = :fresh::uuid), false,
  'complete_first_login clears must_change_password'
);

select complete_first_login();  -- idempotent, must not re-audit

set local role postgres;
select is(
  (select count(*)::int from audit_log
     where entity_id = :fresh::uuid and action = 'update'
       and before->>'must_change_password' = 'true'
       and after->>'must_change_password'  = 'false'),
  1,
  'the forced-change transition is audited once, not on every call'
);
set local role authenticated;

-- direct self-tamper: the narrowed users_update_self_safe policy refuses each
select throws_ok(
  $$update users set must_change_password = true
     where id = 'f1000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a user cannot re-arm their own must_change_password by hand'
);

select throws_ok(
  $$update users set is_active = false
     where id = 'f1000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a user cannot change their own is_active by hand'
);

select throws_ok(
  $$update users set email = 'someone-else@beco.co.ke'
     where id = 'f1000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a user cannot change their own email by hand'
);

select throws_ok(
  $$update users set role = 'beco_admin'
     where id = 'f1000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'a user still cannot change their own role'
);

select lives_ok(
  $$update users set full_name = 'Fresh Restart'
     where id = 'f1000000-0000-4000-8000-000000000001'$$,
  'a user CAN still update their own full_name'
);

select is_empty(
  $$update users set must_change_password = false
     where id = 'f1000000-0000-4000-8000-000000000002' returning id$$,
  'a user cannot clear another user''s forced-change flag'
);

-- ---------- as the deactivated user ----------
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}';

select record_sign_in();
select complete_first_login();

select is(
  (select last_login_at from users where id = :gone::uuid), null,
  'record_sign_in is a no-op for a deactivated user'
);

set local role postgres;
select is(
  (select count(*)::int from audit_log where entity_id = :gone::uuid and action = 'login'),
  0,
  'no login audit row for a deactivated user'
);

-- ---------- as anon ----------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$select record_sign_in()$$,
  '42501', null,
  'anon cannot execute record_sign_in'
);

select throws_ok(
  $$select complete_first_login()$$,
  '42501', null,
  'anon cannot execute complete_first_login'
);

select * from finish();
rollback;
