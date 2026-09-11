-- Staging and local seed. FICTIONAL customers only.
--
-- Staging is NEVER cloned from production. quotes and orders hold real
-- customer names, phone numbers and email addresses, and copying them into a
-- lower environment that more people can reach is a data protection problem
-- under Kenya's Data Protection Act 2019, and a needless one. See D44.
--
-- Real PRODUCTS are fine: they are not personal data, and the import pipeline
-- puts them here anyway. Seeding rather than cloning also makes staging
-- deterministic, so a failing test means a real regression rather than
-- someone having edited a row.

-- The second address is the fictional local/staging brightex_admin seeded at
-- the end of this file. The first is the canonical Brightex address the pgTAP
-- D42 tests use; keeping both means the seeded account clears the Studio gate
-- without colliding with the test fixtures in auth.users.
insert into settings (key, value) values
  ('brightex_allowed_emails', '["info.brightexsolutions@gmail.com", "beco.brightex.dev@gmail.com"]'::jsonb),
  ('whatsapp_number', '"254722333730"'::jsonb),
  ('business_phone', '"+254722333730"'::jsonb)
on conflict (key) do update set value = excluded.value;

-- The real category, named from the Drive folder so the taxonomy stays
-- traceable to its source.
--
-- Kept as a safety net rather than as the source of the id. Migration 13 seeds
-- the whole taxonomy and runs first, so this insert always loses the conflict
-- and the row that survives carries a GENERATED uuid. Referring to a hardcoded
-- id below therefore pointed at a row that never existed, and every product
-- insert failed the foreign key, which broke `supabase db reset` outright.
-- The id is resolved from source_path instead, which is the category's
-- identity per migration 11 and cannot drift.
insert into categories (name, slug, description, is_published, source_path)
values (
  -- Slug derived from the Drive folder, matching what the importer
  -- produces. A hand written slug here split this category in two.
  '12mm Sintered Stones', '12mm-sintered-stones',
  null,   -- real copy comes from Beco. A grid alone does not rank.
  true,
  '12MM SINTERED STONES'
) on conflict (source_path) do nothing;

-- The 24 real stones used to be inserted here, bare and POA.
--
-- They now live in migration 20, WITH their prices, descriptions and specs,
-- because migrations run before this file: migration 15 was updating rows that
-- did not exist yet, so a reset produced a catalogue with no prices at all.
-- Catalogue rows are not fixtures, and this file is for fixtures.
--
-- What stays here is what a seed is actually for: settings, a live
-- announcement, and fictional customers. Never anything cloned from
-- production, per rule 6.

-- One live announcement, so the bar is exercised rather than only built.
--
-- Deliberately a plain notice and a verifiable one: the stones really are on
-- the floor at Urban Square. No invented sale, no invented discount, and no
-- response time promise, because none of those have been confirmed. Beco
-- replaces this from /dashboard/announcements at M5, and it retires on its own
-- when ends_at passes even if nobody does.
insert into announcements (title, body, type, cta_label, cta_url, starts_at, ends_at, priority)
values (
  'Now on the floor',
  'The full 12mm sintered stone range is in the Urban Square showroom.',
  'notice',
  'Plan a visit',
  '/contact',
  now() - interval '1 day',
  now() + interval '180 days',
  10
) on conflict do nothing;

-- Six fictional staff accounts, for local and staging sign-in. NEVER real
-- people, per rule 6, and staging is seeded from this file rather than
-- cloned from production. The launch team per BUILD-PLAN A4: one beco_admin,
-- three beco_sales, one beco_product_manager, one brightex_admin.
--
-- Every account starts must_change_password = true, so the M5 forced-change
-- flow is exercised on first sign-in and no environment inherits a known
-- password without being made to replace it.
--
--   dev password, all six:  beco-dev-pass
--
-- This is fixtures, printed on purpose. The REAL staging and production
-- accounts are created out of band by Brightex and handed to Beco, per
-- docs/RUNBOOK.md. They are never written here.
--
-- The brightex_admin address matches the brightex_allowed_emails entry set
-- above, so that account also satisfies the D42 Studio gate.
--
-- Interdependent inserts across the users -> auth.users foreign key, so this
-- is three plain statements over a temp list rather than data-modifying CTEs,
-- which run on one snapshot and would not see each other's rows for the FK
-- check.
create temporary table _seed_staff (id uuid, email text, full_name text, role text);
insert into _seed_staff values
  ('d5c0ffee-0000-4000-8000-000000000001'::uuid, 'irene.kariuki@beco.co.ke',        'Irene Kariuki', 'beco_admin'),
  ('d5c0ffee-0000-4000-8000-000000000002'::uuid, 'sam.odhiambo@beco.co.ke',         'Sam Odhiambo',  'beco_sales'),
  ('d5c0ffee-0000-4000-8000-000000000003'::uuid, 'grace.wanjiru@beco.co.ke',        'Grace Wanjiru', 'beco_sales'),
  ('d5c0ffee-0000-4000-8000-000000000004'::uuid, 'ken.mutiso@beco.co.ke',           'Ken Mutiso',    'beco_sales'),
  ('d5c0ffee-0000-4000-8000-000000000005'::uuid, 'aisha.farah@beco.co.ke',          'Aisha Farah',   'beco_product_manager'),
  ('d5c0ffee-0000-4000-8000-000000000006'::uuid, 'beco.brightex.dev@gmail.com',     'Brightex Ops',  'brightex_admin');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  s.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  s.email, extensions.crypt('beco-dev-pass', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
from _seed_staff s
on conflict (id) do nothing;

-- auth.identities.email is a generated column (lower(identity_data->>'email')),
-- so it is not listed here: it follows from identity_data.
insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  s.id::text, s.id,
  jsonb_build_object(
    'sub', s.id::text, 'email', s.email,
    'email_verified', true, 'phone_verified', false
  ),
  'email', now(), now(), now()
from _seed_staff s
on conflict (provider_id, provider) do nothing;

insert into users (id, email, full_name, role, is_active, must_change_password, created_at, updated_at)
select s.id, s.email, s.full_name, s.role::user_role, true, true, now(), now()
from _seed_staff s
on conflict (id) do nothing;

drop table _seed_staff;

-- A handful of FICTIONAL quotes, one for each state the M5 dashboard list
-- needs to show: the unassigned web queue, a plain assignment, a catalogue
-- priced quote, a discounted one still awaiting approval, and an expired
-- one. Referenced by product SLUG, never a hardcoded id, so this survives a
-- catalogue re-import. Skipped quietly if the named products are not
-- published in this environment yet, rather than failing the whole seed.
do $$
declare
  v_sam     uuid := (select id from users where email = 'sam.odhiambo@beco.co.ke');
  v_grace   uuid := (select id from users where email = 'grace.wanjiru@beco.co.ke');
  v_ken     uuid := (select id from users where email = 'ken.mutiso@beco.co.ke');
  v_slab_a  uuid := (select id from products where slug = 'bvlgari' and is_published);
  v_slab_a_price numeric := (select price from products where slug = 'bvlgari');
  v_slab_b  uuid := (select id from products where slug = 'jatoba-brown' and is_published);
  v_slab_b_price numeric := (select price from products where slug = 'jatoba-brown');
  v_q1 uuid; v_q2 uuid; v_q3 uuid; v_q4 uuid; v_q5 uuid;
begin
  if v_sam is null or v_grace is null or v_ken is null or v_slab_a is null or v_slab_b is null then
    return;
  end if;

  -- 1. Unassigned, from the storefront, nothing priced yet: the queue.
  insert into quotes (customer_name, customer_phone, source, status, created_at)
  values ('Njeri Kamau', '0711222333', 'web', 'new', now() - interval '3 hours')
  returning id into v_q1;
  insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price)
  values (v_q1, v_slab_a, 'ZZ Seed Bvlgari', 2, v_slab_a_price, 0);

  -- 2. Assigned, being worked, priced at catalogue: no approval needed.
  insert into quotes (customer_name, customer_phone, company, source, status, assigned_to, created_by, created_at)
  values ('Otieno Omondi', '0722333444', 'Omondi Interiors', 'phone', 'reviewing', v_sam, v_sam, now() - interval '1 day')
  returning id into v_q2;
  insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price)
  values (v_q2, v_slab_b, 'ZZ Seed Jatoba Brown', 3, v_slab_b_price, v_slab_b_price);

  -- 3. Quoted at catalogue price, still valid.
  insert into quotes (customer_name, customer_phone, source, status, assigned_to, created_by,
                       valid_until, created_at)
  values ('Achieng Wanjala', '0733444555', 'walk_in', 'quoted', v_grace, v_grace,
          (current_date + 21), now() - interval '2 days')
  returning id into v_q3;
  insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price)
  values (v_q3, v_slab_a, 'ZZ Seed Bvlgari', 1, v_slab_a_price, v_slab_a_price);

  -- 4. Discounted, still awaiting the one approver (D86).
  insert into quotes (customer_name, customer_phone, source, status, assigned_to, created_by, created_at)
  values ('Mutua Peter', '0744555666', 'walk_in', 'reviewing', v_ken, v_ken, now() - interval '5 hours')
  returning id into v_q4;
  insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price)
  values (v_q4, v_slab_b, 'ZZ Seed Jatoba Brown', 4, v_slab_b_price, v_slab_b_price - 8000);

  -- 5. Quoted, catalogue price, but its validity window has passed (0.2).
  insert into quotes (customer_name, customer_phone, source, status, assigned_to, created_by,
                       valid_until, created_at)
  values ('Wafula Grace', '0755666777', 'walk_in', 'quoted', v_grace, v_grace,
          (current_date - 5), now() - interval '30 days')
  returning id into v_q5;
  insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price)
  values (v_q5, v_slab_a, 'ZZ Seed Bvlgari', 2, v_slab_a_price, v_slab_a_price);
end $$;
