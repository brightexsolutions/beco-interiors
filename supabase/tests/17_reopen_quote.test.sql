-- Reopen is lost to reviewing only. Won stays closed. Other people's quotes stay theirs.
begin;
select plan(9);

\set admin_id    '''a3600000-0000-4000-8000-000000000001'''
\set sales_a_id  '''a3600000-0000-4000-8000-000000000002'''
\set sales_b_id  '''a3600000-0000-4000-8000-000000000003'''
\set q_own_lost  '''a3600000-0000-4000-8000-000000000010'''
\set q_other     '''a3600000-0000-4000-8000-000000000011'''
\set q_won       '''a3600000-0000-4000-8000-000000000012'''
\set q_reviewing '''a3600000-0000-4000-8000-000000000013'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,   'reopen-admin@beco.co.ke'),
  (:sales_a_id::uuid, 'reopen-sales-a@beco.co.ke'),
  (:sales_b_id::uuid, 'reopen-sales-b@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,   'reopen-admin@beco.co.ke',   'Reopen Admin', 'beco_admin', true),
  (:sales_a_id::uuid, 'reopen-sales-a@beco.co.ke', 'Reopen A',     'beco_sales', true),
  (:sales_b_id::uuid, 'reopen-sales-b@beco.co.ke', 'Reopen B',     'beco_sales', true);

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, lost_reason)
values
  (:q_own_lost::uuid,  'Came Back', '0700000010', 'phone',   'reviewing', :sales_a_id::uuid, :sales_a_id::uuid, null),
  (:q_other::uuid,     'Other Lost','0700000011', 'walk_in', 'reviewing', :sales_b_id::uuid, :sales_b_id::uuid, null),
  (:q_won::uuid,       'Won Deal',  '0700000012', 'phone',   'reviewing', :sales_a_id::uuid, :sales_a_id::uuid, null),
  (:q_reviewing::uuid, 'Still Open','0700000013', 'walk_in', 'reviewing', :sales_a_id::uuid, :sales_a_id::uuid, null);

update quotes set status = 'lost', lost_reason = 'Went with another supplier'
 where id in (:q_own_lost::uuid, :q_other::uuid);
update quotes set status = 'won' where id = :q_won::uuid;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a3600000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$select set_quote_status(
      'a3600000-0000-4000-8000-000000000010'::uuid,
      'reviewing',
      null,
      (select updated_at from quotes where id = 'a3600000-0000-4000-8000-000000000010'))$$,
  'P0001',
  'Reopen this quote instead of changing its status',
  'set_quote_status cannot quietly un-lose a quote'
);

select lives_ok(
  $$select reopen_quote(
      'a3600000-0000-4000-8000-000000000010'::uuid,
      (select updated_at from quotes where id = 'a3600000-0000-4000-8000-000000000010'))$$,
  'beco_sales CAN reopen their own lost quote'
);

select is(
  (select status from quotes where id = :q_own_lost::uuid),
  'reviewing'::quote_status,
  'reopen puts the quote back to reviewing'
);

select is(
  (select finalized_at from quotes where id = :q_own_lost::uuid),
  null,
  'reopen clears the decision date'
);

select is(
  (select lost_reason from quotes where id = :q_own_lost::uuid),
  null,
  'reopen clears the lost reason'
);

select throws_ok(
  $$select reopen_quote(
      'a3600000-0000-4000-8000-000000000011'::uuid,
      (select updated_at from quotes where id = 'a3600000-0000-4000-8000-000000000011'))$$,
  '42501',
  'Not allowed',
  'beco_sales CANNOT reopen a quote assigned to someone else'
);

select throws_ok(
  $$select reopen_quote(
      'a3600000-0000-4000-8000-000000000012'::uuid,
      (select updated_at from quotes where id = 'a3600000-0000-4000-8000-000000000012'))$$,
  'P0001',
  'A won quote cannot be reopened',
  'a won quote stays closed'
);

select throws_ok(
  $$select reopen_quote(
      'a3600000-0000-4000-8000-000000000013'::uuid,
      (select updated_at from quotes where id = 'a3600000-0000-4000-8000-000000000013'))$$,
  'P0001',
  'Only a lost quote can be reopened',
  'an open quote cannot be reopened'
);

set local role anon;
reset request.jwt.claims;

select throws_ok(
  $$select reopen_quote(
      'a3600000-0000-4000-8000-000000000010'::uuid,
      now())$$,
  '42501',
  null,
  'anon CANNOT execute reopen_quote'
);

select * from finish();
rollback;
