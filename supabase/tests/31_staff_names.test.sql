-- staff_names: display names only, only to the roles that work with quotes.
begin;
select plan(6);

\set sales_a '''aaaaaaaa-0000-0000-0000-000000000002'''
\set sales_b '''aaaaaaaa-0000-0000-0000-000000000003'''
\set pm_id   '''aaaaaaaa-0000-0000-0000-000000000004'''
\set gone_id '''aaaaaaaa-0000-0000-0000-000000000009'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, 'x', now(), now(), now()
from (values
  (:sales_a::uuid, 'sales.a@beco.co.ke'),
  (:sales_b::uuid, 'sales.b@beco.co.ke'),
  (:pm_id::uuid,   'pm@beco.co.ke'),
  (:gone_id::uuid, 'gone@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:sales_a::uuid, 'sales.a@beco.co.ke', 'Sales A',   'beco_sales', true),
  (:sales_b::uuid, 'sales.b@beco.co.ke', 'Sales B',   'beco_sales', true),
  (:pm_id::uuid,   'pm@beco.co.ke',      'P Manager', 'beco_product_manager', true),
  (:gone_id::uuid, 'gone@beco.co.ke',    'Gone Now',  'beco_sales', false);

set local role authenticated;

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select full_name from staff_names(array['aaaaaaaa-0000-0000-0000-000000000003']::uuid[])),
  'Sales B',
  'a salesperson can read a colleague''s display name'
);

select is_empty(
  $$select id from users where id = 'aaaaaaaa-0000-0000-0000-000000000003'$$,
  'but still cannot read the colleague''s users row itself'
);

select is(
  (select count(*)::int from staff_names(array['aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000009']::uuid[])),
  2,
  'returns only the ids asked about, including a deactivated owner so history keeps its name'
);

select is(
  (select count(*)::int from staff_names(array[]::uuid[])),
  0,
  'an empty list returns nothing'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}';

select is_empty(
  $$select * from staff_names(array['aaaaaaaa-0000-0000-0000-000000000002']::uuid[])$$,
  'a product manager, who has no quotes, gets no names'
);

set local role anon;
set local request.jwt.claims = '{}';

select throws_ok(
  $$select * from staff_names(array['aaaaaaaa-0000-0000-0000-000000000002']::uuid[])$$,
  '42501',
  null,
  'anon cannot execute it'
);

select * from finish();
rollback;
