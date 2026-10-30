-- Pop ups, D159: live window for anon, staff read, admin write, audit, and
-- the shape constraints the dashboard form relies on.
begin;
select plan(20);

\set admin_id    '''aaaaaaaa-0048-0000-0000-000000000001'''
\set sales_id    '''aaaaaaaa-0048-0000-0000-000000000002'''
\set pm_id       '''aaaaaaaa-0048-0000-0000-000000000003'''
\set editor_id   '''aaaaaaaa-0048-0000-0000-000000000004'''
\set brightex_id '''aaaaaaaa-0048-0000-0000-000000000005'''
\set live_id     '''cccccccc-0048-0000-0000-000000000001'''
\set later_id    '''cccccccc-0048-0000-0000-000000000002'''
\set off_id      '''cccccccc-0048-0000-0000-000000000003'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,    'popups.admin@beco.co.ke'),
  (:sales_id::uuid,    'popups.sales@beco.co.ke'),
  (:pm_id::uuid,       'popups.pm@beco.co.ke'),
  (:editor_id::uuid,   'popups.editor@beco.co.ke'),
  (:brightex_id::uuid, 'popups.brightex@brightex.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,    'popups.admin@beco.co.ke',        'Popups Admin',    'beco_admin', true),
  (:sales_id::uuid,    'popups.sales@beco.co.ke',        'Popups Sales',    'beco_sales', true),
  (:pm_id::uuid,       'popups.pm@beco.co.ke',           'Popups PM',       'beco_product_manager', true),
  (:editor_id::uuid,   'popups.editor@beco.co.ke',       'Popups Editor',   'beco_editor', true),
  (:brightex_id::uuid, 'popups.brightex@brightex.co.ke', 'Popups Brightex', 'brightex_admin', true);

insert into popups (id, variant, title, starts_at, ends_at, is_active, created_by) values
  (:live_id::uuid,  'offer', 'Live offer',      now() - interval '1 hour', now() + interval '1 day',  true,  :admin_id::uuid),
  (:later_id::uuid, 'split', 'Starts tomorrow', now() + interval '1 day',  now() + interval '8 days', true,  :admin_id::uuid),
  (:off_id::uuid,   'split', 'Switched off',    now() - interval '1 hour', now() + interval '1 day',  false, :admin_id::uuid);

-- ---------- anon ----------
set local role anon;
set local request.jwt.claims = '{}';

select results_eq(
  $$select title from popups where id::text like 'cccccccc-0048-%' order by title$$,
  ARRAY['Live offer']::text[],
  'anon sees the live pop up, not a scheduled or switched off one'
);

select throws_ok(
  $$insert into popups (title, starts_at, ends_at) values ('Nope', now(), now() + interval '1 day')$$,
  '42501',
  null,
  'anon cannot create a pop up'
);

select is_empty(
  $$update popups set title = 'Hacked' where id = 'cccccccc-0048-0000-0000-000000000001' returning id$$,
  'anon cannot edit a pop up'
);

-- ---------- staff read everything, only admins write ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0048-0000-0000-000000000002","role":"authenticated"}';

select results_eq(
  $$select count(*)::int from popups where id::text like 'cccccccc-0048-%'$$,
  ARRAY[3],
  'staff read every pop up, scheduled and switched off included'
);

select is_empty(
  $$update popups set title = 'Hacked' where id = 'cccccccc-0048-0000-0000-000000000001' returning id$$,
  'beco_sales cannot edit a pop up'
);

select throws_ok(
  $$insert into popups (title, starts_at, ends_at) values ('Nope', now(), now() + interval '1 day')$$,
  '42501',
  null,
  'beco_sales cannot create a pop up'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0048-0000-0000-000000000003","role":"authenticated"}';

select is_empty(
  $$update popups set is_active = false where id = 'cccccccc-0048-0000-0000-000000000001' returning id$$,
  'beco_product_manager cannot edit a pop up'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0048-0000-0000-000000000004","role":"authenticated"}';

select is_empty(
  $$update popups set is_active = false where id = 'cccccccc-0048-0000-0000-000000000001' returning id$$,
  'beco_editor cannot edit a pop up'
);

-- ---------- beco_admin writes, and the write is audited ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0048-0000-0000-000000000001","role":"authenticated"}';

select isnt_empty(
  $$update popups set title = '40% off selected stone'
     where id = 'cccccccc-0048-0000-0000-000000000001' returning id$$,
  'beco_admin can edit a pop up'
);

select lives_ok(
  $$insert into popups (title, variant, trigger, trigger_value, starts_at, ends_at, created_by)
    values ('Scroll offer', 'split', 'scroll', 50, now(), now() + interval '2 days',
            'aaaaaaaa-0048-0000-0000-000000000001')$$,
  'beco_admin can create a pop up'
);

-- ---------- the shape the form relies on ----------
select throws_ok(
  $$insert into popups (title, starts_at, ends_at) values ('Backwards', now(), now() - interval '1 day')$$,
  '23514',
  null,
  'the end has to be after the start'
);

select throws_ok(
  $$insert into popups (title, cta_label, starts_at, ends_at)
    values ('Half a button', 'Explore', now(), now() + interval '1 day')$$,
  '23514',
  null,
  'a button label needs a link'
);

select throws_ok(
  $$insert into popups (title, trigger, trigger_value, starts_at, ends_at)
    values ('Too far', 'scroll', 95, now(), now() + interval '1 day')$$,
  '23514',
  null,
  'a scroll trigger is held to 10 to 90 percent'
);

select throws_ok(
  $$insert into popups (title, product_ids, starts_at, ends_at)
    values ('Seven', array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                           gen_random_uuid(), gen_random_uuid(), gen_random_uuid()],
            now(), now() + interval '1 day')$$,
  '23514',
  null,
  'a pop up shows six stones at most'
);

select throws_ok(
  $$insert into popups (title, trigger, starts_at, ends_at)
    values ('Which section', 'section', now(), now() + interval '1 day')$$,
  '23514',
  null,
  'a section trigger has to name its section'
);

select throws_ok(
  $$insert into popups (title, trigger, trigger_section, starts_at, ends_at)
    values ('Stray section', 'delay', 'home-showroom', now(), now() + interval '1 day')$$,
  '23514',
  null,
  'only a section trigger carries a section'
);

select lives_ok(
  $$insert into popups (title, trigger, trigger_section, starts_at, ends_at)
    values ('At the showroom', 'section', 'home-showroom', now(), now() + interval '1 day')$$,
  'a section trigger with its section is accepted'
);

-- ---------- brightex_admin writes too ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0048-0000-0000-000000000005","role":"authenticated"}';

select isnt_empty(
  $$update popups set priority = 5 where id = 'cccccccc-0048-0000-0000-000000000002' returning id$$,
  'brightex_admin can edit a pop up'
);

reset role;

select isnt_empty(
  $$select id from audit_log
     where entity_type = 'popups'
       and entity_id = 'cccccccc-0048-0000-0000-000000000001'
       and action = 'update'$$,
  'a pop up edit is audited'
);

-- Once its window includes now(), the scheduled row is anon's to read.
update popups set starts_at = now() - interval '1 minute' where id = :later_id::uuid;
set local role anon;
set local request.jwt.claims = '{}';

select isnt_empty(
  $$select id from popups where id = 'cccccccc-0048-0000-0000-000000000002'$$,
  'once the window includes now(), anon can read the scheduled pop up'
);

select * from finish();
rollback;
