-- Weekly activity and the pipeline: counted under the caller's own RLS. Migration 59.
begin;
select plan(8);

\set admin_id '''aaaaaaaa-0000-0000-0000-000000000031'''
\set sales_id '''aaaaaaaa-0000-0000-0000-000000000032'''
\set pm_id    '''aaaaaaaa-0000-0000-0000-000000000033'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, 'x', now(), now(), now()
from (values (:admin_id::uuid, 'admin35@beco.co.ke'), (:sales_id::uuid, 'sales35@beco.co.ke'), (:pm_id::uuid, 'pm35@beco.co.ke')) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'admin35@beco.co.ke', 'Admin 35', 'beco_admin', true),
  (:sales_id::uuid, 'sales35@beco.co.ke', 'Sales 35', 'beco_sales', true),
  (:pm_id::uuid, 'pm35@beco.co.ke', 'PM 35', 'beco_product_manager', true);

-- One quote raised this week and won this week by the salesperson, one won
-- quote owned by nobody the salesperson can see, both inside the window.
insert into quotes (reference_number, customer_name, customer_phone, source, status, created_by, assigned_to, total_amount, finalized_at)
values
  ('ZZ-Q-35-1', 'Week Customer', '0722000351', 'phone', 'won', :sales_id::uuid, :sales_id::uuid, 50000, now()),
  ('ZZ-Q-35-2', 'Other Customer', '0722000352', 'web',   'won', null, :admin_id::uuid, 70000, now()),
  ('ZZ-Q-35-3', 'Open Customer',  '0722000353', 'web',   'new', null, null, 0, null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000031","role":"authenticated"}';

select is(
  (select count(*) from activity_series(8)), 8::bigint,
  'eight weeks come back, one row each'
);

select is(
  (select won from activity_series(8) order by week_start desc limit 1), 2,
  'an admin counts every quote won this week'
);

select is(
  (select won_value from activity_series(8) order by week_start desc limit 1), 120000::numeric,
  'and their value'
);

select is(
  (select count(*) from activity_series(100)), 52::bigint,
  'the window is capped at a year'
);

select is(
  (quote_pipeline() ->> 'new')::int, 1,
  'the pipeline counts the open quote'
);

select is(
  (quote_pipeline() ->> 'won')::int, 2,
  'and this month''s wins'
);

-- The product manager cannot read quotes at all, so the series is zeros for
-- them: RLS answered, not the function.
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000033","role":"authenticated"}';

select is(
  (select won from activity_series(8) order by week_start desc limit 1), 0,
  'a role that cannot read quotes counts nothing, RLS decides'
);

set local role anon;
select throws_ok(
  $$select * from activity_series(8)$$,
  '42501',
  null,
  'anon cannot execute the series'
);

select * from finish();
rollback;
