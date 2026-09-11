-- Migration 28: quotes and orders are readable only by the roles the
-- role matrix actually names, beco_sales, beco_admin and brightex_admin.
-- beco_product_manager and beco_editor could read both before this,
-- because `current_user_role() is not null` is true for every active role.
begin;
select plan(12);

\set sales_id  '''f2000000-0000-4000-8000-000000000001'''
\set admin_id  '''f2000000-0000-4000-8000-000000000002'''
\set pm_id     '''f2000000-0000-4000-8000-000000000003'''
\set editor_id '''f2000000-0000-4000-8000-000000000004'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:sales_id::uuid,  'gap-sales@beco.co.ke'),
  (:admin_id::uuid,  'gap-admin@beco.co.ke'),
  (:pm_id::uuid,     'gap-pm@beco.co.ke'),
  (:editor_id::uuid, 'gap-editor@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:sales_id::uuid,  'gap-sales@beco.co.ke',  'Gap Sales',  'beco_sales', true),
  (:admin_id::uuid,  'gap-admin@beco.co.ke',  'Gap Admin',  'beco_admin', true),
  (:pm_id::uuid,     'gap-pm@beco.co.ke',     'Gap PM',     'beco_product_manager', true),
  (:editor_id::uuid, 'gap-editor@beco.co.ke', 'Gap Editor', 'beco_editor', true);

insert into quotes (id, customer_name, customer_phone, assigned_to, created_by)
values ('f2000000-0000-4000-8000-0000000000a1'::uuid, 'Wanjiku', '0722333444', :sales_id::uuid, :sales_id::uuid);
insert into quote_items (quote_id, description, quantity, unit_price)
values ('f2000000-0000-4000-8000-0000000000a1'::uuid, 'ZZ gap test line', 1, 1000);

insert into orders (id, customer_name, customer_phone, salesperson_id, created_by)
values ('f2000000-0000-4000-8000-0000000000b1'::uuid, 'Wanjiku', '0722333444', :sales_id::uuid, :sales_id::uuid);
insert into order_items (order_id, description, quantity, unit_price)
values ('f2000000-0000-4000-8000-0000000000b1'::uuid, 'ZZ gap test line', 1, 1000);

-- ---------- beco_product_manager: denied both tables ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000003","role":"authenticated"}';

select is_empty($$select * from quotes$$,       'beco_product_manager cannot read quotes');
select is_empty($$select * from quote_items$$,  'beco_product_manager cannot read quote_items');
select is_empty($$select * from orders$$,       'beco_product_manager cannot read orders');
select is_empty($$select * from order_items$$,  'beco_product_manager cannot read order_items');

-- ---------- beco_editor: denied both tables ----------
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000004","role":"authenticated"}';

select is_empty($$select * from quotes$$,       'beco_editor cannot read quotes');
select is_empty($$select * from quote_items$$,  'beco_editor cannot read quote_items');
select is_empty($$select * from orders$$,       'beco_editor cannot read orders');
select is_empty($$select * from order_items$$,  'beco_editor cannot read order_items');

-- ---------- regression: the roles that SHOULD read them still can ----------
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select isnt_empty($$select * from quotes$$, 'beco_sales still reads quotes');
select isnt_empty($$select * from orders$$, 'beco_sales still reads orders');

set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select isnt_empty($$select * from quotes$$, 'beco_admin still reads quotes');
select isnt_empty($$select * from orders$$, 'beco_admin still reads orders');

select * from finish();
rollback;
