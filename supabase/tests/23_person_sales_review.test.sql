-- Per-person invoiced and collected on salesperson_leaderboard, used by
-- the individual sales review PDF.
begin;
select plan(3);

\set admin_id   '''b6000000-0000-4000-8000-000000000001'''
\set sales_id   '''b6000000-0000-4000-8000-000000000002'''
\set other_id   '''b6000000-0000-4000-8000-000000000003'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'person-rep-admin@beco.co.ke'),
  (:sales_id::uuid, 'person-rep-sales@beco.co.ke'),
  (:other_id::uuid, 'person-rep-other@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'person-rep-admin@beco.co.ke', 'Person Admin', 'beco_admin', true),
  (:sales_id::uuid, 'person-rep-sales@beco.co.ke', 'Person Sales', 'beco_sales', true),
  (:other_id::uuid, 'person-rep-other@beco.co.ke', 'Person Other', 'beco_sales', true);

insert into orders (
  customer_name, customer_phone, source, status, payment_status,
  total_amount, salesperson_id, created_by, confirmed_at, paid_at
) values
  ('Person Client', '0700000201', 'walk_in', 'confirmed', 'paid',
   75000, :sales_id::uuid, :sales_id::uuid,
   timestamptz '2025-06-15 12:00:00+03', timestamptz '2025-06-15 12:00:00+03'),
  ('Other Client', '0700000202', 'walk_in', 'confirmed', 'paid',
   25000, :other_id::uuid, :other_id::uuid,
   timestamptz '2025-06-15 12:00:00+03', timestamptz '2025-06-15 12:00:00+03');

set local role authenticated;
set local request.jwt.claims = '{"sub":"b6000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  (select (p->>'invoiced')::numeric
     from jsonb_array_elements(
       salesperson_leaderboard('custom', '2025-06-01', '2025-06-30')->'people'
     ) p
    where p->>'id' = 'b6000000-0000-4000-8000-000000000002'),
  75000::numeric,
  'a salesperson invoiced figure is their confirmed orders, not the team'
);

select is(
  (select (p->>'collected')::numeric
     from jsonb_array_elements(
       salesperson_leaderboard('custom', '2025-06-01', '2025-06-30')->'people'
     ) p
    where p->>'id' = 'b6000000-0000-4000-8000-000000000002'),
  75000::numeric,
  'a salesperson collected figure is their paid orders, not the team'
);

select is(
  (salesperson_leaderboard('custom', '2025-06-01', '2025-06-30')->>'invoiced')::numeric,
  100000::numeric,
  'the team invoiced figure still sums every confirmed order'
);

select * from finish();
rollback;
