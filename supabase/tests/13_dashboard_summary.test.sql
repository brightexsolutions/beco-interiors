-- dashboard_summary(): the figures themselves, and the fact that RLS still
-- decides what goes into them. The function is security INVOKER, so the
-- interesting test is not "does it add up" but "does a role that cannot read
-- orders get someone else's sales figures". It must not.
begin;
select plan(16);

\set admin_id '''f3000000-0000-4000-8000-000000000001'''
\set sales_id '''f3000000-0000-4000-8000-000000000002'''
\set pm_id    '''f3000000-0000-4000-8000-000000000003'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'sum-admin@beco.co.ke'),
  (:sales_id::uuid, 'sum-sales@beco.co.ke'),
  (:pm_id::uuid,    'sum-pm@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'sum-admin@beco.co.ke', 'Sum Admin', 'beco_admin', true),
  (:sales_id::uuid, 'sum-sales@beco.co.ke', 'Sum Sales', 'beco_sales', true),
  (:pm_id::uuid,    'sum-pm@beco.co.ke',    'Sum PM',    'beco_product_manager', true);

-- Clear the seeded fixtures so the arithmetic below is about THESE rows.
delete from quote_items;
delete from quotes;
delete from orders;
delete from analytics_events;

-- Two quotes waiting, the older one well past any sane SLA.
insert into quotes (customer_name, customer_phone, source, status, created_at, assigned_to) values
  ('Waiting Old',   '0700000001', 'web',     'new',       now() - interval '9 hours', :sales_id::uuid),
  ('Waiting Fresh', '0700000002', 'walk_in', 'reviewing', now() - interval '20 minutes', :sales_id::uuid);

-- Decided this month: two won, one lost, so conversion is 67%.
insert into quotes (customer_name, customer_phone, source, status, total_amount,
                    finalized_at, created_at, assigned_to) values
  ('Won A',  '0700000003', 'walk_in', 'won',  100000, date_trunc('month', timezone('Africa/Nairobi', now())) at time zone 'Africa/Nairobi' + interval '2 days', now() - interval '10 days', :sales_id::uuid),
  ('Won B',  '0700000004', 'walk_in', 'won',   50000, date_trunc('month', timezone('Africa/Nairobi', now())) at time zone 'Africa/Nairobi' + interval '3 days', now() - interval '9 days',  :sales_id::uuid),
  ('Lost C', '0700000005', 'walk_in', 'lost',  30000, date_trunc('month', timezone('Africa/Nairobi', now())) at time zone 'Africa/Nairobi' + interval '4 days', now() - interval '8 days',  :sales_id::uuid);

-- Decided LAST month, which must land in the comparison and not in the total.
insert into quotes (customer_name, customer_phone, source, status, total_amount,
                    finalized_at, created_at, assigned_to) values
  ('Won Prev', '0700000006', 'walk_in', 'won', 70000,
   (date_trunc('month', timezone('Africa/Nairobi', now())) - interval '1 month') at time zone 'Africa/Nairobi' + interval '5 days',
   now() - interval '40 days', :sales_id::uuid);

-- One order billed this month, half of it collected.
insert into orders (customer_name, customer_phone, source, status, payment_status,
                    total_amount, paid_at, created_at) values
  ('Billed',    '0700000007', 'walk_in', 'confirmed', 'unpaid', 200000, null,   now()),
  ('Collected', '0700000008', 'walk_in', 'fulfilled', 'paid',   200000, now(),  now());

-- Two leads that left the site today, which only an admin may read back.
insert into analytics_events (event_type, created_at) values
  ('whatsapp_click', now()),
  ('call_click',     now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"f3000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  (dashboard_summary() -> 'awaiting' ->> 'count')::int, 2,
  'awaiting counts new and reviewing, and nothing else'
);

select is(
  (dashboard_summary() -> 'awaiting' ->> 'oldest_hours')::numeric > 8, true,
  'awaiting reports the age of the OLDEST, not the newest'
);

select is(
  (dashboard_summary() -> 'awaiting' ->> 'sla_hours')::numeric, 2::numeric,
  'the SLA comes from settings rather than being hardcoded in the card'
);

select is(
  (dashboard_summary() -> 'won' ->> 'count')::int, 2,
  'won counts this month by finalized_at'
);

select is(
  (dashboard_summary() -> 'won' ->> 'value')::numeric, 150000::numeric,
  'won value sums this month only'
);

select is(
  (dashboard_summary() -> 'won' ->> 'prev_count')::int, 1,
  'last month is carried separately for the comparison'
);

select is(
  (dashboard_summary() -> 'won' ->> 'prev_value')::numeric, 70000::numeric,
  'last month value does not leak into this month'
);

select is(
  (dashboard_summary() -> 'conversion' ->> 'rate')::numeric, 67::numeric,
  'conversion is won over decided, two of three'
);

select is(
  (dashboard_summary() -> 'conversion' ->> 'prev_rate')::numeric, 100::numeric,
  'last month converted every decided quote'
);

select is(
  (dashboard_summary() -> 'sales' ->> 'invoiced')::numeric, 400000::numeric,
  'invoiced is everything billed this month, paid or not'
);

select is(
  (dashboard_summary() -> 'sales' ->> 'collected')::numeric, 200000::numeric,
  'collected is only what was actually paid, kept separate per D8'
);

select is(
  (dashboard_summary() -> 'leads' ->> 'submissions')::int, 1,
  'leads counts the web quote raised today, not the walk ins'
);

select is(
  (dashboard_summary() -> 'leads' ->> 'total')::int, 3,
  'leads adds the web submission to the WhatsApp and call clicks'
);

-- ---------- the point of security invoker ----------
-- Nothing below re-checks a role inside the function. The figures differ
-- because the POLICIES differ, which is the whole reason this is invoker.
set local request.jwt.claims = '{"sub":"f3000000-0000-4000-8000-000000000002","role":"authenticated"}';

select is(
  (dashboard_summary() -> 'leads' ->> 'whatsapp')::int, 0,
  'beco_sales sees no lead events, because analytics_read_admin gives it none'
);

set local request.jwt.claims = '{"sub":"f3000000-0000-4000-8000-000000000003","role":"authenticated"}';

select is(
  (dashboard_summary() -> 'sales' ->> 'invoiced')::numeric, 0::numeric,
  'beco_product_manager sees no sales figures: it is not on orders_read_staff'
);

-- ---------- anon ----------
set local role anon;
reset request.jwt.claims;

select throws_ok(
  $$select dashboard_summary()$$,
  '42501',
  null,
  'anon CANNOT execute dashboard_summary'
);

select * from finish();
rollback;
