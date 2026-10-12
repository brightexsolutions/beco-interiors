-- Module access grants, D136: a grant opens a section's reads and nothing
-- else. Brightex grants anything; a staff manager hands on only what they
-- hold, on a Beco account, never on themselves. Every refusal is tried from
-- the seat that would benefit.
begin;
select plan(31);

\set bx_id      '''aaaaaaaa-0046-0000-0000-000000000001'''
\set pm_id      '''aaaaaaaa-0046-0000-0000-000000000002'''
\set sales_id   '''aaaaaaaa-0046-0000-0000-000000000003'''
\set holder_id  '''aaaaaaaa-0046-0000-0000-000000000004'''
\set editor_id  '''aaaaaaaa-0046-0000-0000-000000000005'''
\set lapsed_id  '''aaaaaaaa-0046-0000-0000-000000000006'''
\set bx2_id     '''aaaaaaaa-0046-0000-0000-000000000007'''
\set quote_id   '''aaaaaaaa-0046-0000-0000-000000000100'''
\set order_id   '''aaaaaaaa-0046-0000-0000-000000000101'''
\set cust_id    '''aaaaaaaa-0046-0000-0000-000000000102'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:bx_id::uuid,     'zz46-bx@brightex.test'),
  (:pm_id::uuid,     'zz46-pm@beco.test'),
  (:sales_id::uuid,  'zz46-sales@beco.test'),
  (:holder_id::uuid, 'zz46-holder@beco.test'),
  (:editor_id::uuid, 'zz46-editor@beco.test'),
  (:lapsed_id::uuid, 'zz46-lapsed@beco.test'),
  (:bx2_id::uuid,    'zz46-bx2@brightex.test'),
  ('aaaaaaaa-0046-0000-0000-000000000008'::uuid, 'zz46-launch@beco.test')
) as t(id, email);

-- The product manager holds quotes by grant, the editor reports, a lapsed
-- account everything, the holder is a sales person with staff manage.
insert into users (id, email, full_name, role, is_active, can_manage_users, module_grants) values
  (:bx_id::uuid,     'zz46-bx@brightex.test',  'ZZ Brightex',  'brightex_admin',       true,  false, '{}'),
  (:pm_id::uuid,     'zz46-pm@beco.test',      'ZZ PM',        'beco_product_manager', true,  false, '{quotes}'),
  (:sales_id::uuid,  'zz46-sales@beco.test',   'ZZ Sales',     'beco_sales',           true,  false, '{}'),
  (:holder_id::uuid, 'zz46-holder@beco.test',  'ZZ Holder',    'beco_sales',           true,  true,  '{}'),
  (:editor_id::uuid, 'zz46-editor@beco.test',  'ZZ Editor',    'beco_editor',          true,  false, '{reports}'),
  (:lapsed_id::uuid, 'zz46-lapsed@beco.test',  'ZZ Lapsed',    'beco_editor',          false, false, '{quotes,orders,reports,users,audit}'),
  (:bx2_id::uuid,    'zz46-bx2@brightex.test', 'ZZ Brightex 2','brightex_admin',       true,  false, '{}');

update settings
   set value = value || '["zz46-bx@brightex.test"]'::jsonb
 where key = 'brightex_allowed_emails';

insert into customers (id, name, phone, created_by) values
  (:cust_id::uuid, 'ZZ Mod Customer', '0799460001', :sales_id::uuid);

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, customer_id)
values (:quote_id::uuid, 'ZZ Mod Customer', '0799460001', 'walk_in', 'reviewing', :sales_id::uuid, :sales_id::uuid, :cust_id::uuid);

insert into quote_items (quote_id, description, quantity, list_price, unit_price, sort_order)
values (:quote_id::uuid, 'ZZ Mod Slab', 1, 65000, 65000, 0);

insert into orders (id, customer_name, customer_phone, salesperson_id)
values (:order_id::uuid, 'ZZ Mod Customer', '0799460001', :sales_id::uuid);

-- ---------- structure ----------
select has_column('users', 'module_grants', 'users carries module_grants');

-- On an insert, where the users guard trigger stands aside, so the refusal
-- can only be the constraint's. An update meets the trigger first.
select throws_ok(
  $$insert into users (id, email, full_name, role, is_active, module_grants)
    values ('aaaaaaaa-0046-0000-0000-000000000008', 'zz46-launch@beco.test', 'ZZ Launch', 'beco_sales', true, '{launch}')$$,
  '23514', null,
  'a module outside the known list is refused by the check constraint'
);

select is(
  module_keys(),
  array['quotes', 'orders', 'customers', 'products', 'announcements', 'reports', 'users', 'settings', 'audit'],
  'module_keys lists exactly the dashboard sections a grant can open'
);

set local role authenticated;

-- ---------- a product manager with the quotes module ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000002","role":"authenticated"}';

select ok(has_module('quotes'), 'the product manager holds quotes by grant');
select ok(not has_module('orders'), 'and not orders');

select isnt_empty(
  $$select id from quotes where id = 'aaaaaaaa-0046-0000-0000-000000000100'$$,
  'the quotes grant reads a quote the role could not'
);
select isnt_empty(
  $$select id from quote_items where quote_id = 'aaaaaaaa-0046-0000-0000-000000000100'$$,
  'and its lines'
);
select isnt_empty(
  $$select id from customers where id = 'aaaaaaaa-0046-0000-0000-000000000102'$$,
  'and the customer the quote names (the role already reads customers)'
);
select is_empty(
  $$select id from orders where id = 'aaaaaaaa-0046-0000-0000-000000000101'$$,
  'the quotes grant does not open orders'
);

select is_empty(
  $$update quotes set status = 'quoted' where id = 'aaaaaaaa-0046-0000-0000-000000000100' returning id$$,
  'a module grant never writes: the quote update matches no row'
);

select throws_ok(
  $$insert into quote_items (quote_id, description, quantity, list_price, unit_price, sort_order)
    values ('aaaaaaaa-0046-0000-0000-000000000100', 'ZZ Sneak', 1, 1, 1, 9)$$,
  '42501', null,
  'nor inserts a line'
);

-- ---------- an editor with the reports module ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000005","role":"authenticated"}';

select isnt_empty(
  $$select id from quotes where id = 'aaaaaaaa-0046-0000-0000-000000000100'$$,
  'the reports grant reads quotes, which the figures are built from'
);
select isnt_empty(
  $$select id from orders where id = 'aaaaaaaa-0046-0000-0000-000000000101'$$,
  'and orders'
);
select is_empty(
  $$select id from customers where id = 'aaaaaaaa-0046-0000-0000-000000000102'$$,
  'but not the customer list, which reports do not need'
);
select is_empty(
  $$select id from users where id = 'aaaaaaaa-0046-0000-0000-000000000003'$$,
  'and not other accounts'
);

-- ---------- a deactivated account holds nothing ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000006","role":"authenticated"}';

select ok(not has_module('quotes'), 'a deactivated account loses every module with its access');
select ok(not has_audit_read(), 'including audit');
select is_empty(
  $$select id from quotes where id = 'aaaaaaaa-0046-0000-0000-000000000100'$$,
  'and reads nothing'
);

-- ---------- a plain salesperson cannot grant ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000003","role":"authenticated"}';

select is_empty(
  $$update users set module_grants = '{quotes}' where id = 'aaaaaaaa-0046-0000-0000-000000000002' returning id$$,
  'a salesperson without staff manage cannot reach another row'
);

-- The guard trigger runs before the self pin's WITH CHECK, so its sentence
-- is the one the salesperson meets.
select throws_ok(
  $$update users set module_grants = '{reports}' where id = 'aaaaaaaa-0046-0000-0000-000000000003'$$,
  'P0001', 'Only Brightex can assign those permissions',
  'and cannot widen their own access'
);

-- ---------- a staff manager hands on only what they hold ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000004","role":"authenticated"}';

select ok(can_grant_module('quotes'), 'a sales holder may grant quotes, which their role carries');
select ok(can_grant_module('users'), 'and users, which the staff grant carries');
select ok(not can_grant_module('reports'), 'but not reports, which they do not hold');

select isnt_empty(
  $$update users set module_grants = '{quotes,orders}'
     where id = 'aaaaaaaa-0046-0000-0000-000000000002' returning id$$,
  'the holder grants quotes and orders to the product manager'
);

select throws_ok(
  $$update users set module_grants = '{quotes,orders,reports}'
     where id = 'aaaaaaaa-0046-0000-0000-000000000002'$$,
  'P0001', 'You can only grant access you hold yourself: reports',
  'and is refused a module they do not hold'
);

select throws_ok(
  $$update users set module_grants = '{quotes}'
     where id = 'aaaaaaaa-0046-0000-0000-000000000004'$$,
  'P0001', 'You cannot change your own access',
  'and cannot grant themselves anything'
);

select is_empty(
  $$update users set module_grants = '{quotes}'
     where id = 'aaaaaaaa-0046-0000-0000-000000000007' returning id$$,
  'a Brightex account stays out of reach'
);

select throws_ok(
  $$insert into users (id, email, full_name, role, module_grants)
    values ('aaaaaaaa-0046-0000-0000-000000000008', 'zz46-new@beco.test', 'ZZ New', 'beco_sales', '{reports}')$$,
  '42501', null,
  'a new account cannot arrive with grants'
);

-- ---------- Brightex grants anything, and revokes ----------
set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000001","role":"authenticated"}';

select isnt_empty(
  $$update users set module_grants = '{reports,audit}'
     where id = 'aaaaaaaa-0046-0000-0000-000000000003' returning id$$,
  'an allowlisted Brightex admin grants reports and audit to a salesperson'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000003","role":"authenticated"}';
select ok(has_audit_read(), 'the audit module opens the audit log like the audit flag does');

set local request.jwt.claims = '{"sub":"aaaaaaaa-0046-0000-0000-000000000001","role":"authenticated"}';
select isnt_empty(
  $$update users set module_grants = '{}'
     where id = 'aaaaaaaa-0046-0000-0000-000000000003' returning id$$,
  'and takes them back'
);

select * from finish();
rollback;
