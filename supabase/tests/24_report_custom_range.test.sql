-- Custom report range: Nairobi calendar days, inclusive start, exclusive
-- midnight after the end date. Invalid custom falls back to this month.
begin;
select plan(5);

\set admin_id   '''b7000000-0000-4000-8000-000000000001'''
\set sales_id   '''b7000000-0000-4000-8000-000000000002'''
\set product_id '''b7000000-0000-4000-8000-0000000000aa'''
\set cat_id     '''b7000000-0000-4000-8000-0000000000c1'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'range-admin@beco.co.ke'),
  (:sales_id::uuid, 'range-sales@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'range-admin@beco.co.ke', 'Range Admin', 'beco_admin', true),
  (:sales_id::uuid, 'range-sales@beco.co.ke', 'Range Sales', 'beco_sales', true);

insert into categories (id, name, slug, is_published)
values (:cat_id::uuid, 'ZZ Range Stone', 'zz-range-stone', true);

insert into products (id, name, slug, price, price_display_mode, is_published, category_id)
values (:product_id::uuid, 'ZZ Range Slab', 'zz-range-slab', 50000, 'fixed', true, :cat_id::uuid);

insert into quotes (customer_name, customer_phone, source, status, total_amount,
                    created_by, assigned_to, created_at, finalized_at)
values
  ('Raised In August', '0700000301', 'walk_in', 'won', 80000,
   :sales_id::uuid, :sales_id::uuid,
   timestamptz '2026-08-15 12:00:00+03',
   timestamptz '2026-08-15 12:00:00+03');

insert into analytics_events (event_type, metadata, created_at) values
  ('product_view', jsonb_build_object('product_id', :product_id::text, 'category_id', :cat_id::text),
   timestamptz '2026-08-15 12:00:00+03');

set local role authenticated;
set local request.jwt.claims = '{"sub":"b7000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  (select (p->>'raised')::int
     from jsonb_array_elements(
       salesperson_leaderboard('custom', '2026-08-01', '2026-08-31')->'people'
     ) p
    where p->>'id' = 'b7000000-0000-4000-8000-000000000002'),
  1,
  'a custom range includes a quote raised on a day inside it'
);

select is(
  (select coalesce((
     select (p->>'raised')::int
       from jsonb_array_elements(
         salesperson_leaderboard('custom', '2026-09-01', '2026-09-18')->'people'
       ) p
      where p->>'id' = 'b7000000-0000-4000-8000-000000000002'
   ), 0)),
  0,
  'a custom range excludes a quote raised outside it'
);

select is(
  salesperson_leaderboard('custom', '2026-09-01', '2026-09-18')->>'period',
  '1 Sep 2026 to 18 Sep 2026',
  'the custom period label is the start and end dates'
);

select is(
  salesperson_leaderboard('custom', '2026-09-18', '2026-09-01')->>'period',
  salesperson_leaderboard('this_month')->>'period',
  'an inverted custom range falls back to this month'
);

select is(
  (select (p->>'views')::int
     from jsonb_array_elements(
       conversion_report('custom', '2026-08-01', '2026-08-31')->'products'
     ) p
    where p->>'id' = 'b7000000-0000-4000-8000-0000000000aa'),
  1,
  'conversion uses the same custom bounds'
);

select * from finish();
rollback;
