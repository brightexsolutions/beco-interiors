-- Migration 66: a deactivated account is refused by the quote functions,
-- because is_admin() is false rather than null for it.
begin;
select plan(7);

\set admin_id '''a6600000-0000-4000-8000-000000000001'''
\set off_id   '''a6600000-0000-4000-8000-000000000002'''
\set sales_id '''a6600000-0000-4000-8000-000000000003'''
\set quote_id '''a6600000-0000-4000-8000-000000000010'''
\set line_a   '''a6600000-0000-4000-8000-000000000020'''
\set line_b   '''a6600000-0000-4000-8000-000000000021'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'never-null-admin@beco.co.ke'),
  (:off_id::uuid,   'never-null-off@beco.co.ke'),
  (:sales_id::uuid, 'never-null-sales@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'never-null-admin@beco.co.ke', 'NN Admin', 'beco_admin', true),
  (:off_id::uuid,   'never-null-off@beco.co.ke',   'NN Off',   'beco_sales', true),
  (:sales_id::uuid, 'never-null-sales@beco.co.ke', 'NN Sales', 'beco_sales', true);

-- The deactivated salesperson OWNS this quote: only the role check stands
-- between them and it.
insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by)
values (:quote_id::uuid, 'ZZ NN Owned', '0799660001', 'walk_in', 'reviewing', :off_id::uuid, :off_id::uuid);
insert into quote_items (id, quote_id, description, quantity, unit_price) values
  (:line_a::uuid, :quote_id::uuid, 'ZZ NN One', 1, 1000),
  (:line_b::uuid, :quote_id::uuid, 'ZZ NN Two', 1, 2000);
update users set is_active = false where id = :off_id::uuid;

set local role authenticated;

set local request.jwt.claims = '{"sub":"a6600000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(is_admin(), false, 'is_admin() is false, not null, for a deactivated account');
select throws_ok(
  $$select update_quote_lines('a6600000-0000-4000-8000-000000000010'::uuid,
      '[{"line_id":"a6600000-0000-4000-8000-000000000020","quantity":5,"unit_price":1000}]'::jsonb,
      (select updated_at from quotes where id = 'a6600000-0000-4000-8000-000000000010'))$$,
  '42501', 'Not allowed', 'a deactivated salesperson cannot edit lines on their own quote');
select throws_ok(
  $$select remove_quote_line('a6600000-0000-4000-8000-000000000010'::uuid,
      'a6600000-0000-4000-8000-000000000021'::uuid,
      (select updated_at from quotes where id = 'a6600000-0000-4000-8000-000000000010'))$$,
  '42501', 'Not allowed', 'a deactivated salesperson cannot remove a line from their own quote');

set local request.jwt.claims = '{"sub":"a6600000-0000-4000-8000-000000000003","role":"authenticated"}';
select is(is_admin(), false, 'is_admin() is false for an active salesperson');

set local request.jwt.claims = '{"sub":"a6600000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(is_admin(), true, 'is_admin() is true for an active admin');

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(is_admin(), false, 'is_admin() is false for anon');

reset role;
select is(
  (select count(*)::int from quote_items where quote_id = :quote_id::uuid and quantity = 1),
  2, 'the deactivated account changed nothing');

select * from finish();
rollback;
