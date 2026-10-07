-- Migration 68: quote lines are written only by the line functions. Direct
-- inserts, updates and deletes are refused for every role, even the owner
-- and an admin, while reading and the functions keep working.
begin;
select plan(9);

\set admin_id '''aaaaaaaa-0000-0000-0000-000000000681'''
\set sales_id '''aaaaaaaa-0000-0000-0000-000000000682'''
\set quote_id '''aaaaaaaa-0000-0000-0000-000000006801'''
\set line_id  '''aaaaaaaa-0000-0000-0000-000000006802'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values (:admin_id::uuid, 'admin68@beco.co.ke'), (:sales_id::uuid, 'sales68@beco.co.ke')) as t(id, email);
insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'admin68@beco.co.ke', 'A Admin', 'beco_admin', true),
  (:sales_id::uuid, 'sales68@beco.co.ke', 'Sales', 'beco_sales', true);

insert into quotes (id, customer_name, customer_phone, source, assigned_to, created_by)
values (:quote_id::uuid, 'ZZ Lines Only', '0700006801', 'walk_in', :sales_id::uuid, :sales_id::uuid);
insert into quote_items (id, quote_id, description, quantity, unit_price)
values (:line_id::uuid, :quote_id::uuid, 'ZZ Slab', 1, 1000);

select is_empty(
  $$select policyname from pg_policies where tablename = 'quote_items' and policyname = 'quote_items_write_owner'$$,
  'the direct write policy is gone'
);

-- ---------- the owner ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000682","role":"authenticated"}';
select throws_ok(
  $$insert into quote_items (quote_id, description, quantity, unit_price)
    values ('aaaaaaaa-0000-0000-0000-000000006801', 'ZZ Sneak', 1, 1)$$,
  '42501', null, 'the owner cannot insert a line directly');
select is_empty(
  $$update quote_items set unit_price = 1 where id = 'aaaaaaaa-0000-0000-0000-000000006802' returning id$$,
  'the owner cannot update a line directly');
select is_empty(
  $$delete from quote_items where id = 'aaaaaaaa-0000-0000-0000-000000006802' returning id$$,
  'the owner cannot delete a line directly');
select isnt_empty(
  $$select id from quote_items where quote_id = 'aaaaaaaa-0000-0000-0000-000000006801'$$,
  'the owner still reads the lines');

-- ---------- an admin ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000681","role":"authenticated"}';
select throws_ok(
  $$insert into quote_items (quote_id, description, quantity, unit_price)
    values ('aaaaaaaa-0000-0000-0000-000000006801', 'ZZ Sneak', 1, 1)$$,
  '42501', null, 'an admin cannot insert a line directly either');
select is_empty(
  $$delete from quote_items where id = 'aaaaaaaa-0000-0000-0000-000000006802' returning id$$,
  'an admin cannot delete a line directly');
reset role;

select is((select unit_price from quote_items where id = :line_id::uuid), 1000::numeric,
  'the line is untouched after every refused write');

-- The functions still write: the owner changes the quantity through update_quote_lines.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000682","role":"authenticated"}';
select lives_ok(
  format($$select update_quote_lines(%L::uuid, %L::jsonb, %L::timestamptz)$$,
    'aaaaaaaa-0000-0000-0000-000000006801',
    '[{"line_id":"aaaaaaaa-0000-0000-0000-000000006802","quantity":2,"unit_price":1000}]',
    (select updated_at from quotes where id = 'aaaaaaaa-0000-0000-0000-000000006801')),
  'the line functions still write for the owner');
reset role;

select * from finish();
rollback;
