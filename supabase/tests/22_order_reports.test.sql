-- Salesperson leaderboard and conversion report. Nairobi month boundaries.
-- SECURITY INVOKER: a role that cannot read analytics gets empty conversion
-- rows rather than someone else's funnel.
begin;
select plan(8);

\set admin_id   '''b5000000-0000-4000-8000-000000000001'''
\set sales_id   '''b5000000-0000-4000-8000-000000000002'''
\set pm_id      '''b5000000-0000-4000-8000-000000000003'''
\set product_id '''b5000000-0000-4000-8000-0000000000aa'''
\set cat_id     '''b5000000-0000-4000-8000-0000000000c1'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'rep-admin@beco.co.ke'),
  (:sales_id::uuid, 'rep-sales@beco.co.ke'),
  (:pm_id::uuid,    'rep-pm@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'rep-admin@beco.co.ke', 'Rep Admin', 'beco_admin', true),
  (:sales_id::uuid, 'rep-sales@beco.co.ke', 'Rep Sales', 'beco_sales', true),
  (:pm_id::uuid,    'rep-pm@beco.co.ke',    'Rep PM',    'beco_product_manager', true);

insert into categories (id, name, slug, is_published)
values (:cat_id::uuid, 'ZZ Report Stone', 'zz-report-stone', true);

insert into products (id, name, slug, price, price_display_mode, is_published, category_id)
values (:product_id::uuid, 'ZZ Report Slab', 'zz-report-slab', 50000, 'fixed', true, :cat_id::uuid);

insert into quotes (customer_name, customer_phone, source, status, total_amount,
                    created_by, assigned_to, created_at, finalized_at)
values
  ('Raised This Month', '0700000101', 'walk_in', 'won', 80000,
   :sales_id::uuid, :sales_id::uuid, now(), now()),
  ('Lost This Month', '0700000102', 'walk_in', 'lost', 20000,
   :sales_id::uuid, :sales_id::uuid, now(), now());

insert into analytics_events (event_type, metadata, created_at) values
  ('product_view',     jsonb_build_object('product_id', :product_id::text, 'category_id', :cat_id::text), now()),
  ('product_view',     jsonb_build_object('product_id', :product_id::text, 'category_id', :cat_id::text), now()),
  ('add_to_cart',      jsonb_build_object('product_id', :product_id::text, 'category_id', :cat_id::text), now()),
  ('quote_submitted',  jsonb_build_object('product_id', :product_id::text, 'category_id', :cat_id::text), now()),
  ('whatsapp_click',   jsonb_build_object('product_id', :product_id::text, 'category_id', :cat_id::text), now()),
  ('call_click',       jsonb_build_object('product_id', :product_id::text, 'category_id', :cat_id::text), now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"b5000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  (select (p->>'raised')::int
     from jsonb_array_elements(salesperson_leaderboard('this_month')->'people') p
    where p->>'id' = 'b5000000-0000-4000-8000-000000000002'),
  2,
  'quotes raised this month count created_by'
);

select is(
  (select (p->>'won')::int
     from jsonb_array_elements(salesperson_leaderboard('this_month')->'people') p
    where p->>'id' = 'b5000000-0000-4000-8000-000000000002'),
  1,
  'won count is the quotes this person closed this month'
);

select is(
  (select (p->>'conversion')::numeric
     from jsonb_array_elements(salesperson_leaderboard('this_month')->'people') p
    where p->>'id' = 'b5000000-0000-4000-8000-000000000002'),
  50.0,
  'conversion is won over won plus lost'
);

select is(
  (select (p->>'views')::int
     from jsonb_array_elements(conversion_report('this_month')->'products') p
    where p->>'id' = 'b5000000-0000-4000-8000-0000000000aa'),
  2,
  'product views this month are counted'
);

select is(
  (select (p->>'view_to_cart')::numeric
     from jsonb_array_elements(conversion_report('this_month')->'products') p
    where p->>'id' = 'b5000000-0000-4000-8000-0000000000aa'),
  50.0,
  'view to cart is add_to_cart over views'
);

select is(
  (select (p->>'whatsapp')::int
     from jsonb_array_elements(conversion_report('this_month')->'categories') p
    where p->>'id' = 'b5000000-0000-4000-8000-0000000000c1'),
  1,
  'WhatsApp clicks roll up per category'
);

-- Product manager can execute the invoker function but cannot read analytics,
-- so conversion products is empty rather than leaking the admin funnel.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b5000000-0000-4000-8000-000000000003","role":"authenticated"}';

select is(
  jsonb_array_length(conversion_report('this_month')->'products'),
  0,
  'a role that cannot read analytics_events sees no conversion rows'
);

select is(
  salesperson_leaderboard('this_month')->>'period',
  'This month',
  'the period label is the Nairobi month, not UTC'
);

select * from finish();
rollback;
