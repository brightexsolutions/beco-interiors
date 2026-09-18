-- Announcements: live window for anon, writes for admins only, audit on write.
begin;
select plan(8);

\set admin_id    '''aaaaaaaa-0000-0000-0000-000000000001'''
\set sales_id    '''aaaaaaaa-0000-0000-0000-000000000002'''
\set pm_id       '''aaaaaaaa-0000-0000-0000-000000000004'''
\set live_id     '''cccccccc-0000-0000-0000-000000000001'''
\set tomorrow_id '''cccccccc-0000-0000-0000-000000000002'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'admin@beco.co.ke'),
  (:sales_id::uuid, 'sales.a@beco.co.ke'),
  (:pm_id::uuid,    'pm@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'admin@beco.co.ke',   'A Admin',   'beco_admin', true),
  (:sales_id::uuid, 'sales.a@beco.co.ke', 'Sales A',   'beco_sales', true),
  (:pm_id::uuid,    'pm@beco.co.ke',      'P Manager', 'beco_product_manager', true);

insert into announcements (id, title, body, type, starts_at, ends_at, priority, is_active, created_by)
values
  (
    :live_id::uuid,
    'Live now',
    'On the floor.',
    'notice',
    now() - interval '1 hour',
    now() + interval '1 day',
    1,
    true,
    :admin_id::uuid
  ),
  (
    :tomorrow_id::uuid,
    'Starts tomorrow',
    'Wait.',
    'sale',
    now() + interval '1 day',
    now() + interval '8 days',
    5,
    true,
    :admin_id::uuid
  );

-- ---------- anon sees only the live window ----------
set local role anon;
set local request.jwt.claims = '{}';

select results_eq(
  $$select title from announcements where id in (
      'cccccccc-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000002'
    ) order by title$$,
  ARRAY['Live now']::text[],
  'anon sees a live announcement and not one that starts tomorrow'
);

select throws_ok(
  $$insert into announcements (title, starts_at, ends_at)
    values ('Nope', now(), now() + interval '1 day')$$,
  '42501',
  null,
  'anon cannot write announcements'
);

-- A row whose window includes now() is the "present tomorrow" half: move
-- the scheduled row into the present and anon can read it.
reset role;
update announcements
   set starts_at = now() - interval '1 minute'
 where id = :tomorrow_id::uuid;

set local role anon;
set local request.jwt.claims = '{}';

select isnt_empty(
  $$select id from announcements where id = 'cccccccc-0000-0000-0000-000000000002'$$,
  'once the window includes now(), anon can read the scheduled announcement'
);

-- ---------- sales and product manager cannot write ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select is_empty(
  $$update announcements set title = 'Hacked'
     where id = 'cccccccc-0000-0000-0000-000000000001' returning id$$,
  'beco_sales cannot write announcements'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select is_empty(
  $$update announcements set is_active = false
     where id = 'cccccccc-0000-0000-0000-000000000001' returning id$$,
  'beco_product_manager cannot write announcements'
);

-- ---------- beco_admin can write, and the write is audited ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$update announcements set title = 'Showroom hours'
     where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  'beco_admin can edit an announcement'
);

reset role;
set local role postgres;
select isnt_empty(
  $$select id from audit_log
     where entity_type = 'announcements'
       and entity_id = 'cccccccc-0000-0000-0000-000000000001'
       and action = 'update'$$,
  'an announcement write is audited'
);
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$insert into announcements (title, type, starts_at, ends_at, created_by)
    values ('New notice', 'notice', now(), now() + interval '2 days', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'beco_admin can create an announcement'
);

select * from finish();
rollback;
