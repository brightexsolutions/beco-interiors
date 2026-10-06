-- D130: the customers table, its RLS for anon and every role, the phone key,
-- the KRA PIN shape, the backfill, and how the two quote paths link to it.
begin;
select plan(85);

\set admin_id    '''c3000000-0000-4000-8000-000000000001'''
\set bx_id       '''c3000000-0000-4000-8000-000000000002'''
\set sales_id    '''c3000000-0000-4000-8000-000000000003'''
\set sales2_id   '''c3000000-0000-4000-8000-000000000004'''
\set pm_id       '''c3000000-0000-4000-8000-000000000005'''
\set editor_id   '''c3000000-0000-4000-8000-000000000006'''
\set off_id      '''c3000000-0000-4000-8000-000000000007'''
\set alpha_id    '''c3000000-0000-4000-8000-000000000100'''
\set gone_id     '''c3000000-0000-4000-8000-000000000101'''
\set product_id  '''c3000000-0000-4000-8000-000000000200'''
\set quote_a     '''c3000000-0000-4000-8000-000000000300'''
\set quote_b     '''c3000000-0000-4000-8000-000000000301'''
\set quote_won   '''c3000000-0000-4000-8000-000000000302'''
\set order_ok    '''c3000000-0000-4000-8000-000000000400'''
\set order_void  '''c3000000-0000-4000-8000-000000000401'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid,  'cust-admin@beco.co.ke'),
  (:bx_id::uuid,     'cust-bx@beco.co.ke'),
  (:sales_id::uuid,  'cust-sales@beco.co.ke'),
  (:sales2_id::uuid, 'cust-sales2@beco.co.ke'),
  (:pm_id::uuid,     'cust-pm@beco.co.ke'),
  (:editor_id::uuid, 'cust-editor@beco.co.ke'),
  (:off_id::uuid,    'cust-off@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid,  'cust-admin@beco.co.ke',  'Cust Admin',    'beco_admin',           true),
  (:bx_id::uuid,     'cust-bx@beco.co.ke',     'Cust Brightex', 'brightex_admin',       true),
  (:sales_id::uuid,  'cust-sales@beco.co.ke',  'Cust Sales',    'beco_sales',           true),
  (:sales2_id::uuid, 'cust-sales2@beco.co.ke', 'Cust Sales Two','beco_sales',           true),
  (:pm_id::uuid,     'cust-pm@beco.co.ke',     'Cust PM',       'beco_product_manager', true),
  (:editor_id::uuid, 'cust-editor@beco.co.ke', 'Cust Editor',   'beco_editor',          true),
  (:off_id::uuid,    'cust-off@beco.co.ke',    'Cust Off',      'beco_sales',           false);

insert into customers (id, name, phone, email, kra_pin, created_by) values
  (:alpha_id::uuid, 'ZZ Cust Alpha', '0799100001', 'alpha@example.com', 'A123456789Z', :sales_id::uuid);
insert into customers (id, name, phone, created_by, deleted_at) values
  (:gone_id::uuid, 'ZZ Cust Gone', '0799100009', :sales_id::uuid, now());

insert into products (id, name, slug, sku, price, price_display_mode, availability, is_published, unit)
values (:product_id::uuid, 'ZZ Cust Handle', 'zz-cust-handle', 'ZZ-H1', 1000, 'fixed', 'in_stock', true, 'per piece');

-- ---------------------------------------------------------------- structure
select has_table('customers', 'the customers table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.customers'::regclass), 'RLS is on');
select has_column('quotes', 'customer_id', 'a quote points at its customer');
select has_column('orders', 'customer_id', 'an order points at its customer');

-- ---------------------------------------------------------------- phone key
select is(customer_phone_key('0722 123 456'), '722123456', 'a leading 0 is dropped');
select is(customer_phone_key('+254722123456'), '722123456', 'a leading +254 is dropped');
select is(customer_phone_key('254-722-123-456'), '722123456', 'a leading 254 is dropped, separators ignored');
select is(customer_phone_key('722123456'), '722123456', 'a bare national number keys to itself');
select is(customer_phone_key(' n/a '), 'n/a', 'a number with no digits keys on its trimmed text');
select is((select phone_key from customers where id = :alpha_id::uuid), '799100001', 'phone_key is generated from phone');

-- ---------------------------------------------------------------- constraints
select throws_ok(
  $$insert into customers (name, phone) values ('ZZ Cust Twin', '+254 799 100 001')$$,
  '23505', null, 'a second live customer with the same number in another format is refused');
select lives_ok(
  $$insert into customers (name, phone) values ('ZZ Cust Again', '0799100009')$$,
  'a soft deleted customer releases its number');
select throws_ok(
  $$insert into customers (name, phone, kra_pin) values ('ZZ Cust Pin', '0799100010', 'A12345678Z')$$,
  '23514', null, 'a KRA PIN with eight digits is refused');
select throws_ok(
  $$insert into customers (name, phone, kra_pin) values ('ZZ Cust Pin', '0799100010', 'a123456789z')$$,
  '23514', null, 'a lower case KRA PIN is refused, the app uppercases before saving');
select lives_ok(
  $$insert into customers (name, phone, kra_pin) values ('ZZ Cust Pin', '0799100010', 'P051234567X')$$,
  'a KRA PIN of letter, nine digits, letter is accepted');
select throws_ok(
  $$insert into customers (name, phone) values ('   ', '0799100011')$$,
  '23514', null, 'a blank name is refused');
select throws_ok(
  $$insert into customers (name, phone, phone_key) values ('ZZ Cust Forge', '0799100012', '700000001')$$,
  '428C9', null, 'phone_key cannot be written, it is generated');

-- Quotes and orders for the overview, linked to Alpha.
insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, customer_id)
values
  (:quote_a::uuid, 'ZZ Cust Alpha', '0799100001', 'walk_in', 'reviewing', :sales_id::uuid, :sales_id::uuid, :alpha_id::uuid),
  (:quote_b::uuid, 'ZZ Cust Alpha', '0799100001', 'walk_in', 'reviewing', :sales_id::uuid, :sales_id::uuid, :alpha_id::uuid);
insert into orders (id, customer_name, customer_phone, source, status, total_amount, subtotal, vat_amount, created_by, salesperson_id, customer_id)
values
  (:order_ok::uuid,   'ZZ Cust Alpha', '0799100001', 'walk_in', 'confirmed', 1160, 1000, 160, :sales_id::uuid, :sales_id::uuid, :alpha_id::uuid),
  (:order_void::uuid, 'ZZ Cust Alpha', '0799100001', 'walk_in', 'cancelled', 580, 500, 80, :sales_id::uuid, :sales_id::uuid, :alpha_id::uuid);

-- ---------------------------------------------------------------- anon
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$select count(*) from customers$$, '42501', null, 'anon cannot read customers');
select throws_ok(
  $$insert into customers (name, phone) values ('ZZ Anon', '0799100020')$$,
  '42501', null, 'anon cannot insert a customer');
select throws_ok(
  $$update customers set name = 'ZZ Anon' where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '42501', null, 'anon cannot update a customer');
select throws_ok($$select count(*) from customer_overview$$, '42501', null, 'anon cannot read the overview');
select throws_ok($$select customer_for_phone('ZZ Anon', '0799100021')$$, '42501', null,
  'anon cannot call the link-or-create helper directly');
select throws_ok($$select backfill_customers()$$, '42501', null, 'anon cannot run the backfill');
select throws_ok(
  $$insert into orders (customer_name, customer_phone, source, customer_id)
    values ('ZZ Anon', '0799100022', 'web', 'c3000000-0000-4000-8000-000000000100')$$,
  '42501', null, 'anon cannot attach a direct order insert to a real customer');

-- submit_quote, a new number: creates the customer and links.
select lives_ok(
  $$select submit_quote('ZZ Cust Web New', '+254 799 100 030', '[{"slug":"zz-cust-handle","quantity":1}]'::jsonb,
                        'webnew@example.com', null, null, 'delivery', 'Karen, Nairobi')$$,
  'a web quote from a new number goes through');

-- submit_quote, a known number with a different name and email: links only.
select lives_ok(
  $$select submit_quote('ZZ Impostor', '0799100001', '[{"slug":"zz-cust-handle","quantity":1}]'::jsonb,
                        'impostor@example.com', 'Impostor Ltd')$$,
  'a web quote from a known number goes through');

reset role;

select is((select count(*)::int from customers where phone_key = '799100030' and deleted_at is null), 1,
  'the new number has one customer');
select is((select name || '|' || email || '|' || coalesce(location, '') || '|' || (created_by is null)::text
             from customers where phone_key = '799100030'),
  'ZZ Cust Web New|webnew@example.com|Karen, Nairobi|true',
  'the web customer carries what was submitted, the delivery address as location, and no creator');
select is((select customer_id from quotes where customer_name = 'ZZ Cust Web New'),
  (select id from customers where phone_key = '799100030'), 'the web quote links to the new customer');
select is((select customer_id from quotes where customer_name = 'ZZ Impostor'), :alpha_id::uuid,
  'a web quote from a known number links to that customer');
select is((select name || '|' || email || '|' || coalesce(company, '') from customers where id = :alpha_id::uuid),
  'ZZ Cust Alpha|alpha@example.com|',
  'an anonymous submission does not change an existing customer');
select is((select count(*)::int from customers where phone_key = '799100001' and deleted_at is null), 1,
  'a known number does not create a second customer');
select is((select customer_phone from quotes where customer_name = 'ZZ Impostor'), '0799100001',
  'the quote still snapshots what was submitted');

-- ---------------------------------------------------------------- beco_sales
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000003","role":"authenticated"}';

select is((select count(*)::int from customers where name like 'ZZ Cust%'), 4,
  'sales reads every live customer and not the soft deleted one');
select lives_ok(
  $$insert into customers (name, phone, created_by) values ('ZZ Cust Sales Made', '0799100040', 'c3000000-0000-4000-8000-000000000003')$$,
  'sales creates a customer as itself');
select throws_ok(
  $$insert into customers (name, phone, created_by) values ('ZZ Cust Forged', '0799100041', 'c3000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'sales cannot create a customer in another user''s name');
select throws_ok(
  $$insert into customers (name, phone, created_by, deleted_at) values ('ZZ Cust Dead', '0799100042', 'c3000000-0000-4000-8000-000000000003', now())$$,
  '42501', null, 'sales cannot create a customer already deleted');
update customers set company = 'Alpha Kitchens', client_type = 'contractor', location = 'Westlands', notes = 'Prefers WhatsApp'
 where id = :alpha_id::uuid;
select is((select company from customers where id = :alpha_id::uuid), 'Alpha Kitchens', 'sales edits a customer''s details');
select throws_ok(
  $$update customers set deleted_at = now() where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '42501', null, 'sales cannot soft delete a customer');
select throws_ok(
  $$update customers set created_by = 'c3000000-0000-4000-8000-000000000004' where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '42501', null, 'sales cannot move who created a customer');
select throws_ok(
  $$delete from customers where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '42501', null, 'sales cannot hard delete a customer');
select throws_ok(
  $$update customers set phone = '0799100040' where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '23505', null, 'an edit onto another customer''s number is refused');
select is((select quote_count || '|' || order_count || '|' || total_spent from customer_overview where id = :alpha_id::uuid),
  '3|2|1160.00', 'the overview counts quotes and orders, and spent leaves out the cancelled order');
select ok((select last_activity_at >= (select max(created_at) from quotes where customer_id = 'c3000000-0000-4000-8000-000000000100')
             from customer_overview where id = :alpha_id::uuid),
  'last activity is at least the newest quote');

-- create_counter_quote with a customer: the snapshot comes from the record.
select lives_ok(
  $$select create_counter_quote('typed name', '0700000000', 'walk_in',
      '[{"product_id":"c3000000-0000-4000-8000-000000000200","quantity":1}]'::jsonb, null,
      'c3000000-0000-4000-8000-000000000100')$$,
  'sales raises a counter quote for a picked customer');
select is((select customer_name || '|' || customer_phone || '|' || customer_email || '|' || company
             from quotes where customer_id = :alpha_id::uuid and source = 'walk_in' and created_by = :sales_id::uuid
             order by created_at desc, reference_number desc limit 1),
  'ZZ Cust Alpha|0799100001|alpha@example.com|Alpha Kitchens',
  'the counter quote snapshots the record, not the typed fields');
select lives_ok(
  $$select create_counter_quote('ZZ Cust Counter New', '0799 100 050', 'phone',
      '[{"description":"Cutting","quantity":1,"unit_price":500}]'::jsonb)$$,
  'sales raises a counter quote for a new number without picking');
select throws_ok(
  $$select create_counter_quote('x', '0700000000', 'walk_in',
      '[{"description":"Cutting","quantity":1}]'::jsonb, null, 'c3000000-0000-4000-8000-000000000101')$$,
  'P0002', null, 'a soft deleted customer cannot be picked');
select lives_ok(
  $$select create_counter_quote('ZZ Renamer', '+254799100001', 'walk_in',
      '[{"description":"Cutting","quantity":1}]'::jsonb)$$,
  'a counter quote typed against a known number goes through');

-- link_quote_customer: the owner relinks.
select lives_ok(
  format($$select link_quote_customer(%L, (select id from customers where phone_key = '799100040'), %L)$$,
         'c3000000-0000-4000-8000-000000000301',
         (select updated_at from quotes where id = 'c3000000-0000-4000-8000-000000000301')),
  'the owner links a quote to another customer');
select throws_ok(
  $$select link_quote_customer('c3000000-0000-4000-8000-000000000301', 'c3000000-0000-4000-8000-000000000100', '2000-01-01')$$,
  'PT409', null, 'a stale link is refused as a conflict');
select throws_ok(
  format($$select link_quote_customer(%L, %L, %L)$$,
         'c3000000-0000-4000-8000-000000000301', 'c3000000-0000-4000-8000-000000000101',
         (select updated_at from quotes where id = 'c3000000-0000-4000-8000-000000000301')),
  'P0002', null, 'a quote cannot be linked to a soft deleted customer');

reset role;

select is((select created_by from customers where phone_key = '799100050'), :sales_id::uuid,
  'a customer created from the counter records the salesperson');
select is((select customer_id from quotes where customer_name = 'ZZ Cust Counter New'),
  (select id from customers where phone_key = '799100050'), 'and the counter quote links to it');
select is((select name from customers where id = :alpha_id::uuid), 'ZZ Cust Alpha',
  'a counter quote typed against a known number does not rename the customer');
select is((select customer_id from quotes where customer_name = 'ZZ Renamer'), :alpha_id::uuid,
  'and links to that customer');
select is((select customer_id from quotes where id = :quote_b::uuid),
  (select id from customers where phone_key = '799100040'), 'the relink is stored');
select is((select customer_name from quotes where id = :quote_b::uuid), 'ZZ Cust Alpha',
  'relinking leaves the quote''s snapshot alone');

-- ---------------------------------------------------------------- a second salesperson
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok(
  format($$select link_quote_customer(%L, %L, %L)$$,
         'c3000000-0000-4000-8000-000000000300', 'c3000000-0000-4000-8000-000000000100',
         (select updated_at from quotes where id = 'c3000000-0000-4000-8000-000000000300')),
  '42501', null, 'a salesperson cannot relink a quote that is not theirs');
reset role;

-- ---------------------------------------------------------------- product manager
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select ok((select count(*) from customers where name like 'ZZ Cust%') >= 4, 'the product manager reads the list');
select throws_ok(
  $$insert into customers (name, phone, created_by) values ('ZZ PM', '0799100060', 'c3000000-0000-4000-8000-000000000005')$$,
  '42501', null, 'the product manager cannot create a customer');
update customers set name = 'ZZ PM Rename' where id = :alpha_id::uuid;
select is((select quote_count || '|' || order_count || '|' || total_spent from customer_overview where id = :alpha_id::uuid),
  '0|0|0.00', 'the product manager sees no quote, order or revenue figures through the overview');
select throws_ok(
  $$select link_quote_customer('c3000000-0000-4000-8000-000000000300', 'c3000000-0000-4000-8000-000000000100', now())$$,
  '42501', null, 'the product manager cannot link a quote');
reset role;
select is((select name from customers where id = :alpha_id::uuid), 'ZZ Cust Alpha',
  'the product manager''s update changed nothing');

-- ---------------------------------------------------------------- editor and inactive
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000006","role":"authenticated"}';
select is((select count(*)::int from customers), 0, 'the editor reads no customers');
select throws_ok(
  $$insert into customers (name, phone, created_by) values ('ZZ Ed', '0799100070', 'c3000000-0000-4000-8000-000000000006')$$,
  '42501', null, 'the editor cannot create a customer');
set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000007","role":"authenticated"}';
select is((select count(*)::int from customers), 0, 'a deactivated account reads no customers');
select throws_ok(
  $$insert into customers (name, phone, created_by) values ('ZZ Off', '0799100071', 'c3000000-0000-4000-8000-000000000007')$$,
  '42501', null, 'a deactivated account cannot create a customer');
reset role;

-- ---------------------------------------------------------------- admins
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*)::int from customers where id = :gone_id::uuid), 1, 'an admin reads a soft deleted customer');
update customers set deleted_at = now() where phone_key = '799100040';
select throws_ok(
  $$delete from customers where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '42501', null, 'an admin cannot hard delete a customer');
select throws_ok(
  $$update customers set created_by = 'c3000000-0000-4000-8000-000000000001' where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '42501', null, 'an admin cannot rewrite who created a customer');

set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok(
  $$insert into customers (name, phone, created_by) values ('ZZ Cust Brightex', '0799100080', 'c3000000-0000-4000-8000-000000000002')$$,
  'brightex_admin creates a customer');
select throws_ok(
  $$delete from customers where id = 'c3000000-0000-4000-8000-000000000100'$$,
  '42501', null, 'brightex_admin cannot hard delete a customer');
reset role;

select ok((select deleted_at is not null from customers where phone_key = '799100040'), 'an admin soft deletes a customer');
select ok(exists (select 1 from audit_log where entity_type = 'customers'
                    and entity_id = (select id from customers where phone_key = '799100040')
                    and action = 'delete'),
  'the soft delete is in the audit log as a delete');

-- ---------------------------------------------------------------- convert copies the customer
insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, customer_id)
values (:quote_won::uuid, 'ZZ Cust Alpha', '0799100001', 'walk_in', 'reviewing', :sales_id::uuid, :sales_id::uuid, :alpha_id::uuid);
insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price)
values (:quote_won::uuid, :product_id::uuid, 'ZZ Cust Handle', 2, 1000, 1000);
update quotes set status = 'won' where id = :quote_won::uuid;

set local role authenticated;
set local request.jwt.claims = '{"sub":"c3000000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok(
  format($$select convert_quote_to_order(%L, %L)$$, 'c3000000-0000-4000-8000-000000000302',
         (select updated_at from quotes where id = 'c3000000-0000-4000-8000-000000000302')),
  'the won quote converts');
reset role;
select is((select o.customer_id from orders o join quotes q on q.converted_order_id = o.id where q.id = :quote_won::uuid),
  :alpha_id::uuid, 'the order carries the quote''s customer');

-- ---------------------------------------------------------------- backfill
-- Two quotes for one number in two formats, the older carrying the email
-- and company, the newer the current name; a deleted quote for another
-- number; an order converted from the newer quote.
insert into quotes (customer_name, customer_phone, customer_email, company, source, status, created_at)
values
  ('ZZ Old Name', '0798 200 001', 'old@example.com', 'Old Co', 'web', 'new', now() - interval '3 days'),
  ('ZZ New Name', '+254798200001', null, null, 'web', 'new', now() - interval '1 day');
insert into quotes (customer_name, customer_phone, source, status, deleted_at)
values ('ZZ Deleted Only', '0798200002', 'web', 'new', now());
insert into orders (customer_name, customer_phone, source, quote_id)
values ('ZZ New Name', '+254798200001', 'web', (select id from quotes where customer_name = 'ZZ New Name'));

select ok(backfill_customers() >= 1, 'the backfill creates at least the fixture customer');
select is((select count(*)::int from customers where phone_key = '798200001'), 1,
  'two formats of one number make one customer');
select is((select name || '|' || phone || '|' || email || '|' || company from customers where phone_key = '798200001'),
  'ZZ New Name|+254798200001|old@example.com|Old Co',
  'the newest name and phone win, an older email and company fill the gaps');
select is((select count(*)::int from quotes q join customers c on c.id = q.customer_id
            where c.phone_key = '798200001'), 2, 'both quotes are linked');
select is((select o.customer_id from orders o where o.customer_name = 'ZZ New Name'),
  (select id from customers where phone_key = '798200001'), 'the order is linked through its quote');
select is((select count(*)::int from customers where phone_key = '798200002'), 0,
  'a number seen only on a deleted quote makes no customer');
select is((select count(*)::int from quotes where deleted_at is null and customer_id is null), 0,
  'after the backfill every live quote has a customer');
select is(backfill_customers(), 0, 'a second run creates nothing');

select * from finish();
rollback;
