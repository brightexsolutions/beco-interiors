-- Claim and assign RPCs, plus the stale-lock refusal. Prove the negative
-- for anon and for a role that must never touch quotes.
begin;
select plan(14);

\set admin_id   '''f2000000-0000-4000-8000-000000000001'''
\set sales_a_id '''f2000000-0000-4000-8000-000000000002'''
\set sales_b_id '''f2000000-0000-4000-8000-000000000003'''
\set pm_id      '''f2000000-0000-4000-8000-000000000004'''
\set bx_id      '''f2000000-0000-4000-8000-000000000005'''
\set q_open     '''f2000000-0000-4000-8000-000000000010'''
\set q_owned    '''f2000000-0000-4000-8000-000000000011'''
\set q_stale    '''f2000000-0000-4000-8000-000000000012'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,   'claim-admin@beco.co.ke'),
  (:sales_a_id::uuid, 'claim-sales-a@beco.co.ke'),
  (:sales_b_id::uuid, 'claim-sales-b@beco.co.ke'),
  (:pm_id::uuid,      'claim-pm@beco.co.ke'),
  (:bx_id::uuid,      'claim-brightex@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,   'claim-admin@beco.co.ke',   'Claim Admin', 'beco_admin', true),
  (:sales_a_id::uuid, 'claim-sales-a@beco.co.ke', 'Claim A',     'beco_sales', true),
  (:sales_b_id::uuid, 'claim-sales-b@beco.co.ke', 'Claim B',     'beco_sales', true),
  (:pm_id::uuid,      'claim-pm@beco.co.ke',      'Claim PM',    'beco_product_manager', true),
  (:bx_id::uuid,      'claim-brightex@beco.co.ke','Claim Bx',    'brightex_admin', true);

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_at, updated_at)
values
  (:q_open::uuid,  'Open Queue', '0700000010', 'web', 'new', null, now(), '2026-09-01 09:00:00+00'),
  (:q_owned::uuid, 'Already Out', '0700000011', 'phone', 'reviewing', :sales_b_id::uuid, now(), '2026-09-01 09:00:00+00'),
  (:q_stale::uuid, 'Stale Lock', '0700000012', 'web', 'new', null, now(), '2026-09-01 09:00:00+00');

-- ---------- as sales A ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select claim_quote('f2000000-0000-4000-8000-000000000010'::uuid, '2026-09-01 09:00:00+00'::timestamptz)$$,
  'beco_sales CAN claim an unassigned quote'
);

select is(
  (select assigned_to from quotes where id = :q_open::uuid),
  :sales_a_id::uuid,
  'claim stamps assigned_to to the caller'
);

select is(
  (select status from quotes where id = :q_open::uuid)::text,
  'reviewing',
  'claiming a new quote moves it to reviewing'
);

-- The row IS written (proved from the admin section below), but the person
-- who caused it cannot read it back: audit_read_admin gates the trail on
-- is_admin(). Asserting the empty result here is the point, because a trail a
-- salesperson can read is a trail a salesperson can be tempted to audit.
select is_empty(
  $$select 1 from audit_log
     where entity_id = 'f2000000-0000-4000-8000-000000000010'::uuid
       and action = 'assign'$$,
  'beco_sales CANNOT read the audit row its own claim wrote'
);

select throws_ok(
  $$select claim_quote('f2000000-0000-4000-8000-000000000011'::uuid, '2026-09-01 09:00:00+00'::timestamptz)$$,
  'P0001',
  'This quote is already assigned',
  'beco_sales CANNOT claim a quote someone else already owns'
);

select throws_ok(
  $$select claim_quote('f2000000-0000-4000-8000-000000000012'::uuid, '1999-01-01 00:00:00+00'::timestamptz)$$,
  '40001',
  'This quote changed while you were editing',
  'a stale lock token is refused rather than overwriting'
);

select throws_ok(
  $$select assign_quote(
      'f2000000-0000-4000-8000-000000000012'::uuid,
      'f2000000-0000-4000-8000-000000000003'::uuid,
      '2026-09-01 09:00:00+00'::timestamptz)$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT reassign a quote'
);

-- ---------- as product manager ----------
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000004","role":"authenticated"}';

select throws_ok(
  $$select claim_quote('f2000000-0000-4000-8000-000000000012'::uuid, '2026-09-01 09:00:00+00'::timestamptz)$$,
  '42501',
  'Not allowed',
  'beco_product_manager CANNOT claim a quote'
);

-- ---------- as admin ----------
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- The other half of the assertion above: the claim DID write its audit row,
-- and an admin is who gets to see it.
select isnt_empty(
  $$select 1 from audit_log
     where entity_id = 'f2000000-0000-4000-8000-000000000010'::uuid
       and action = 'assign'$$,
  'claim writes an assign audit row, readable by an admin'
);

select lives_ok(
  $$select assign_quote(
      'f2000000-0000-4000-8000-000000000012'::uuid,
      'f2000000-0000-4000-8000-000000000003'::uuid,
      '2026-09-01 09:00:00+00'::timestamptz)$$,
  'beco_admin CAN assign an unassigned quote to a salesperson'
);

select is(
  (select assigned_to from quotes where id = :q_stale::uuid),
  :sales_b_id::uuid,
  'assign stamps the named assignee, not the admin'
);

select throws_ok(
  $$select assign_quote(
      'f2000000-0000-4000-8000-000000000012'::uuid,
      'f2000000-0000-4000-8000-000000000004'::uuid,
      now())$$,
  '22023',
  'That account cannot own a quote',
  'a product manager cannot be made the owner of a quote'
);

select throws_ok(
  $$select assign_quote(
      'f2000000-0000-4000-8000-000000000012'::uuid,
      'f2000000-0000-4000-8000-000000000005'::uuid,
      (select updated_at from quotes where id = 'f2000000-0000-4000-8000-000000000012'))$$,
  '22023',
  'That account cannot own a quote',
  'a brightex_admin cannot be made the owner of a quote'
);

-- ---------- as anon ----------
set local role anon;
reset request.jwt.claims;

select throws_ok(
  $$select claim_quote('f2000000-0000-4000-8000-000000000010'::uuid, now())$$,
  '42501',
  null,
  'anon CANNOT execute claim_quote'
);

select * from finish();
rollback;
