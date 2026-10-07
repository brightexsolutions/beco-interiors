-- D131: remove_quote_line, the customer's request kept on the quote, and
-- line edits audited. Every role, every refusal the function makes, the
-- totals after a removal, and a quantity change on a web quote.
begin;
select plan(46);

\set admin_id   '''a6500000-0000-4000-8000-000000000001'''
\set bx_id      '''a6500000-0000-4000-8000-000000000002'''
\set sales_a    '''a6500000-0000-4000-8000-000000000003'''
\set sales_b    '''a6500000-0000-4000-8000-000000000004'''
\set pm_id      '''a6500000-0000-4000-8000-000000000005'''
\set off_id     '''a6500000-0000-4000-8000-000000000006'''
\set slab_id    '''a6500000-0000-4000-8000-000000000100'''
\set handle_id  '''a6500000-0000-4000-8000-000000000101'''
\set q_main     '''a6500000-0000-4000-8000-000000000200'''
\set q_single   '''a6500000-0000-4000-8000-000000000201'''
\set q_won      '''a6500000-0000-4000-8000-000000000202'''
\set q_lost     '''a6500000-0000-4000-8000-000000000203'''
\set q_conv     '''a6500000-0000-4000-8000-000000000204'''
\set q_deleted  '''a6500000-0000-4000-8000-000000000205'''
\set q_other    '''a6500000-0000-4000-8000-000000000206'''
\set q_appr     '''a6500000-0000-4000-8000-000000000207'''
\set order_id   '''a6500000-0000-4000-8000-000000000300'''

-- The money assertions below are written for 16 percent.
update settings set value = '0.16'::jsonb where key = 'vat_rate';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'rm-admin@beco.co.ke'),
  (:bx_id::uuid,    'rm-bx@beco.co.ke'),
  (:sales_a::uuid,  'rm-sales-a@beco.co.ke'),
  (:sales_b::uuid,  'rm-sales-b@beco.co.ke'),
  (:pm_id::uuid,    'rm-pm@beco.co.ke'),
  (:off_id::uuid,   'rm-off@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'rm-admin@beco.co.ke',   'Rm Admin',    'beco_admin',           true),
  (:bx_id::uuid,    'rm-bx@beco.co.ke',      'Rm Brightex', 'brightex_admin',       true),
  (:sales_a::uuid,  'rm-sales-a@beco.co.ke', 'Rm Sales A',  'beco_sales',           true),
  (:sales_b::uuid,  'rm-sales-b@beco.co.ke', 'Rm Sales B',  'beco_sales',           true),
  (:pm_id::uuid,    'rm-pm@beco.co.ke',      'Rm PM',       'beco_product_manager', true),
  (:off_id::uuid,   'rm-off@beco.co.ke',     'Rm Off',      'beco_sales',           false);

insert into products (id, name, slug, sku, price, price_display_mode, is_published, unit) values
  (:slab_id::uuid,   'ZZ Rm Slab',   'zz-rm-slab',   'ZZ-RM1', 65000, 'fixed', true, 'per slab'),
  (:handle_id::uuid, 'ZZ Rm Handle', 'zz-rm-handle', 'ZZ-RM2', 850,   'fixed', true, 'per piece');

insert into orders (id, customer_name, customer_phone, source)
values (:order_id::uuid, 'ZZ Rm Conv', '0799650004', 'walk_in');

insert into quotes (id, customer_name, customer_phone, source, status, assigned_to, created_by, lost_reason)
values
  (:q_main::uuid,    'ZZ Rm Main',    '0799650001', 'walk_in', 'reviewing', :sales_a::uuid, :sales_a::uuid, null),
  (:q_single::uuid,  'ZZ Rm Single',  '0799650002', 'walk_in', 'reviewing', :sales_a::uuid, :sales_a::uuid, null),
  (:q_won::uuid,     'ZZ Rm Won',     '0799650003', 'walk_in', 'reviewing', :sales_a::uuid, :sales_a::uuid, null),
  (:q_lost::uuid,    'ZZ Rm Lost',    '0799650005', 'walk_in', 'reviewing', :sales_a::uuid, :sales_a::uuid, null),
  (:q_conv::uuid,    'ZZ Rm Conv',    '0799650004', 'walk_in', 'reviewing', :sales_a::uuid, :sales_a::uuid, null),
  (:q_deleted::uuid, 'ZZ Rm Deleted', '0799650006', 'walk_in', 'reviewing', :sales_a::uuid, :sales_a::uuid, null),
  (:q_other::uuid,   'ZZ Rm Other',   '0799650007', 'phone',   'reviewing', :sales_b::uuid, :sales_b::uuid, null),
  (:q_appr::uuid,    'ZZ Rm Appr',    '0799650008', 'walk_in', 'reviewing', :sales_a::uuid, :sales_a::uuid, null);

insert into quote_items (id, quote_id, product_id, description, quantity, list_price, unit_price, sort_order) values
  ('a6500000-0000-4000-8000-000000000400', :q_main::uuid,    :slab_id::uuid,   'ZZ Rm Slab',   2,  65000, 65000, 0),
  ('a6500000-0000-4000-8000-000000000401', :q_main::uuid,    :handle_id::uuid, 'ZZ Rm Handle', 10, 850,   850,   1),
  ('a6500000-0000-4000-8000-000000000410', :q_single::uuid,  :slab_id::uuid,   'ZZ Rm Slab',   1,  65000, 65000, 0),
  ('a6500000-0000-4000-8000-000000000420', :q_won::uuid,     :slab_id::uuid,   'ZZ Rm Slab',   1,  65000, 65000, 0),
  ('a6500000-0000-4000-8000-000000000421', :q_won::uuid,     :handle_id::uuid, 'ZZ Rm Handle', 1,  850,   850,   1),
  ('a6500000-0000-4000-8000-000000000430', :q_lost::uuid,    :slab_id::uuid,   'ZZ Rm Slab',   1,  65000, 65000, 0),
  ('a6500000-0000-4000-8000-000000000431', :q_lost::uuid,    :handle_id::uuid, 'ZZ Rm Handle', 1,  850,   850,   1),
  ('a6500000-0000-4000-8000-000000000440', :q_conv::uuid,    :slab_id::uuid,   'ZZ Rm Slab',   1,  65000, 65000, 0),
  ('a6500000-0000-4000-8000-000000000441', :q_conv::uuid,    :handle_id::uuid, 'ZZ Rm Handle', 1,  850,   850,   1),
  ('a6500000-0000-4000-8000-000000000450', :q_deleted::uuid, :slab_id::uuid,   'ZZ Rm Slab',   1,  65000, 65000, 0),
  ('a6500000-0000-4000-8000-000000000451', :q_deleted::uuid, :handle_id::uuid, 'ZZ Rm Handle', 1,  850,   850,   1),
  ('a6500000-0000-4000-8000-000000000460', :q_other::uuid,   :slab_id::uuid,   'ZZ Rm Slab',   1,  65000, 65000, 0),
  ('a6500000-0000-4000-8000-000000000461', :q_other::uuid,   :handle_id::uuid, 'ZZ Rm Handle', 1,  850,   850,   1),
  -- Discounted slab and a list price handle: the quote needs approval.
  ('a6500000-0000-4000-8000-000000000470', :q_appr::uuid,    :slab_id::uuid,   'ZZ Rm Slab',   1,  65000, 60000, 0),
  ('a6500000-0000-4000-8000-000000000471', :q_appr::uuid,    :handle_id::uuid, 'ZZ Rm Handle', 1,  850,   850,   1);

-- Move each fixture into its state the way the dashboard would leave it.
update quotes set status = 'quoted' where id in (:q_won::uuid, :q_lost::uuid, :q_conv::uuid);
update quotes set status = 'won' where id in (:q_won::uuid, :q_conv::uuid);
update quotes set status = 'lost', lost_reason = 'Went elsewhere' where id = :q_lost::uuid;
update quotes set converted_order_id = :order_id::uuid where id = :q_conv::uuid;
update quotes set deleted_at = now() where id = :q_deleted::uuid;
update quotes set approved_by = :admin_id::uuid, approved_at = now() where id = :q_appr::uuid;
update quotes set status = 'quoted' where id = :q_appr::uuid;
-- A known lock token on the main quote, so the bump can be seen.
alter table quotes disable trigger quotes_touch_updated_at;
update quotes set updated_at = '2026-09-01 09:00:00+00' where id = :q_main::uuid;
alter table quotes enable trigger quotes_touch_updated_at;

-- ---------------------------------------------------------------- structure
select has_column('quotes', 'requested_items', 'a quote carries the customer''s request');
select has_function('remove_quote_line', array['uuid', 'uuid', 'timestamp with time zone'], 'remove_quote_line exists');
select has_trigger('quote_items', 'quote_items_audit', 'quote lines are audited');

-- ---------------------------------------------------------------- anon
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000200'::uuid,
      'a6500000-0000-4000-8000-000000000401'::uuid, now())$$,
  '42501', null, 'anon cannot execute remove_quote_line');

select lives_ok(
  $$select submit_quote('ZZ Rm Web', '0799650010',
      '[{"slug":"zz-rm-slab","quantity":2},{"slug":"zz-rm-handle","quantity":4}]'::jsonb)$$,
  'a web quote with two items goes through');

reset role;

select is(
  (select requested_items->>'source' from quotes where customer_name = 'ZZ Rm Web'),
  'submission',
  'the web quote is born with the customer''s request, marked as a submission');

select is(
  (select array_agg((l->>'id')::uuid order by (l->>'id'))
     from quotes q, jsonb_array_elements(q.requested_items->'lines') l
    where q.customer_name = 'ZZ Rm Web'),
  (select array_agg(qi.id order by qi.id::text)
     from quote_items qi join quotes q on q.id = qi.quote_id
    where q.customer_name = 'ZZ Rm Web'),
  'the request names exactly the lines that were written, by id');

select is(
  (select l->>'code' || ' x ' || trim_scale((l->>'quantity')::numeric)
     from quotes q, jsonb_array_elements(q.requested_items->'lines') l
    where q.customer_name = 'ZZ Rm Web' and l->>'description' = 'ZZ Rm Slab'),
  'ZZ-RM1 x 2',
  'the request carries the product code and the quantity asked for');

select is(
  (select code from quote_items qi join quotes q on q.id = qi.quote_id
    where q.customer_name = 'ZZ Rm Web' and qi.description = 'ZZ Rm Slab'),
  'ZZ-RM1',
  'the web line still carries its code (D124)');

select is(
  (select count(*)::int from audit_log a
    where a.entity_type = 'quote_items' and a.action = 'create'
      and a.after->>'quote_id' = (select id::text from quotes where customer_name = 'ZZ Rm Web')),
  2,
  'each submitted line writes a create audit row');

-- ---------------------------------------------------------------- roles refused
set local role authenticated;

set local request.jwt.claims = '{"sub":"a6500000-0000-4000-8000-000000000005","role":"authenticated"}';
select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000200'::uuid,
      'a6500000-0000-4000-8000-000000000401'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000200'))$$,
  '42501', 'Not allowed', 'the product manager cannot remove a quote line');

set local request.jwt.claims = '{"sub":"a6500000-0000-4000-8000-000000000006","role":"authenticated"}';
select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000200'::uuid,
      'a6500000-0000-4000-8000-000000000401'::uuid, '2026-09-01 09:00:00+00'::timestamptz)$$,
  '42501', 'Not allowed', 'a deactivated salesperson cannot remove a quote line');

set local request.jwt.claims = '{"sub":"a6500000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok(
  $$select remove_quote_line(
      (select id from quotes where customer_name = 'ZZ Rm Web'),
      (select qi.id from quote_items qi join quotes q on q.id = qi.quote_id
        where q.customer_name = 'ZZ Rm Web' and qi.description = 'ZZ Rm Handle'),
      (select updated_at from quotes where customer_name = 'ZZ Rm Web'))$$,
  '42501', 'Not allowed', 'a salesperson cannot remove a line from an unassigned web quote before claiming it');

set local request.jwt.claims = '{"sub":"a6500000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000206'::uuid,
      'a6500000-0000-4000-8000-000000000461'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000206'))$$,
  '42501', 'Not allowed', 'a salesperson cannot remove a line from a colleague''s quote');

-- ---------------------------------------------------------------- the owner
select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000200'::uuid,
      'a6500000-0000-4000-8000-000000000401'::uuid, '1999-01-01 00:00:00+00'::timestamptz)$$,
  'PT409', 'This quote changed while you were editing',
  'a stale lock token is refused, PT409 as every quote write since migration 56');

select is(
  remove_quote_line('a6500000-0000-4000-8000-000000000200'::uuid,
      'a6500000-0000-4000-8000-000000000401'::uuid, '2026-09-01 09:00:00+00'::timestamptz),
  'ZZ Rm Handle',
  'the assigned salesperson removes a line, and is told which');

select is(
  (select count(*)::int from quote_items where id = 'a6500000-0000-4000-8000-000000000401'),
  0, 'the line is gone');

-- 2 x 65,000 left of 138,500. VAT is inside the price at 16 percent.
select is((select total_amount from quotes where id = :q_main::uuid), 130000.00::numeric(12,2),
  'the total is recomputed without the removed line');
select is((select vat_amount from quotes where id = :q_main::uuid), 17931.03::numeric(12,2),
  'the VAT is recomputed: 130,000 x 0.16 / 1.16');
select is((select subtotal from quotes where id = :q_main::uuid), 112068.97::numeric(12,2),
  'the subtotal is the total less VAT');
select isnt((select updated_at from quotes where id = :q_main::uuid), '2026-09-01 09:00:00+00'::timestamptz,
  'the removal moves the quote''s lock, so a second open editor is refused');

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000210'::uuid,
      'a6500000-0000-4000-8000-000000000410'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000201'))$$,
  'P0002', 'Quote not found', 'an unknown quote id is refused');

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000201'::uuid,
      'a6500000-0000-4000-8000-000000000410'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000201'))$$,
  'P0001', 'A quote needs at least one item. Mark it lost instead.',
  'the last line cannot be removed');

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000202'::uuid,
      'a6500000-0000-4000-8000-000000000421'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000202'))$$,
  'P0001', 'A won quote is closed', 'a won quote keeps its lines');

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000203'::uuid,
      'a6500000-0000-4000-8000-000000000431'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000203'))$$,
  'P0001', 'Reopen this quote to change its items', 'a lost quote is reopened before its lines change');

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000204'::uuid,
      'a6500000-0000-4000-8000-000000000441'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000204'))$$,
  'P0001', 'This quote is already an order. Its items are fixed.',
  'a quote that became an order keeps its lines');

-- Deleted quotes are invisible to sales through RLS, so the lock token is
-- given literally rather than read back.
select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000205'::uuid,
      'a6500000-0000-4000-8000-000000000451'::uuid, now())$$,
  'P0002', 'Quote not found', 'a deleted quote is refused');

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000200'::uuid,
      'a6500000-0000-4000-8000-000000000461'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000200'))$$,
  'P0002', 'Line not found', 'a line from another quote cannot be removed through this one');

select throws_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000207'::uuid,
      'a6500000-0000-4000-8000-000000000471'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000207'))$$,
  'P0001', 'Removing this item clears the approval. Move the quote back to reviewing first.',
  'on an approved quoted quote that still deviates, removal is refused in words (D86)');

select lives_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000207'::uuid,
      'a6500000-0000-4000-8000-000000000470'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000207'))$$,
  'removing the discounted line from a quoted quote leaves it at catalogue price, so it goes through');

select is((select requires_approval from quotes where id = :q_appr::uuid), false,
  'with the discount gone the quote no longer needs approval');

select throws_ok(
  $$update quotes set requested_items = '{"source":"submission","lines":[]}'::jsonb
     where id = 'a6500000-0000-4000-8000-000000000200'$$,
  '42501', 'The customer''s request is kept as submitted',
  'a salesperson cannot write a request onto their own quote');

reset role;

select is(
  (select count(*)::int from quote_items
    where quote_id in (:q_single::uuid, :q_won::uuid, :q_lost::uuid, :q_conv::uuid, :q_deleted::uuid)),
  9, 'every refused removal left its lines in place');

select is(
  (select a.user_id::text || ' ' || (a.before->>'description') || ' ' || trim_scale((a.before->>'quantity')::numeric)
          || ' ' || trim_scale((a.before->>'unit_price')::numeric) || ' ' || (a.before->>'quote_id')
     from audit_log a
    where a.entity_type = 'quote_items' and a.action = 'delete'
      and a.entity_id = 'a6500000-0000-4000-8000-000000000401'),
  'a6500000-0000-4000-8000-000000000003 ZZ Rm Handle 10 850 a6500000-0000-4000-8000-000000000200',
  'the removal is audited with who did it and the whole line, so it can be put back');

-- ---------------------------------------------------------------- admins
set local role authenticated;
set local request.jwt.claims = '{"sub":"a6500000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok(
  $$select remove_quote_line(
      (select id from quotes where customer_name = 'ZZ Rm Web'),
      (select qi.id from quote_items qi join quotes q on q.id = qi.quote_id
        where q.customer_name = 'ZZ Rm Web' and qi.description = 'ZZ Rm Handle'),
      (select updated_at from quotes where customer_name = 'ZZ Rm Web'))$$,
  'an admin removes a line from an unassigned web quote');

select is(
  (select count(*)::int from quote_items qi join quotes q on q.id = qi.quote_id where q.customer_name = 'ZZ Rm Web'),
  1, 'the web quote has one line left');

select is(
  (select jsonb_array_length(requested_items->'lines') from quotes where customer_name = 'ZZ Rm Web'),
  2, 'the customer''s request still lists both items');

select throws_ok(
  $$update quotes set requested_items = '{"source":"submission","lines":[]}'::jsonb
     where customer_name = 'ZZ Rm Web'$$,
  '42501', 'The customer''s request is kept as submitted',
  'not even an admin can rewrite the customer''s request');

select throws_ok(
  $$select remove_quote_line(
      (select id from quotes where customer_name = 'ZZ Rm Web'),
      (select qi.id from quote_items qi join quotes q on q.id = qi.quote_id where q.customer_name = 'ZZ Rm Web'),
      (select updated_at from quotes where customer_name = 'ZZ Rm Web'))$$,
  'P0001', 'A quote needs at least one item. Mark it lost instead.',
  'an admin cannot remove the last line either');

set local request.jwt.claims = '{"sub":"a6500000-0000-4000-8000-000000000002","role":"authenticated"}';
select lives_ok(
  $$select remove_quote_line('a6500000-0000-4000-8000-000000000206'::uuid,
      'a6500000-0000-4000-8000-000000000461'::uuid,
      (select updated_at from quotes where id = 'a6500000-0000-4000-8000-000000000206'))$$,
  'a Brightex admin removes a line from a salesperson''s quote');

-- ---------------------------------------------------------------- quantity on a web quote
set local request.jwt.claims = '{"sub":"a6500000-0000-4000-8000-000000000004","role":"authenticated"}';

select lives_ok(
  $$select claim_quote((select id from quotes where customer_name = 'ZZ Rm Web'),
                       (select updated_at from quotes where customer_name = 'ZZ Rm Web'))$$,
  'a salesperson claims the web quote');

select lives_ok(
  $$select update_quote_lines(
      (select id from quotes where customer_name = 'ZZ Rm Web'),
      jsonb_build_array(jsonb_build_object(
        'line_id', (select qi.id from quote_items qi join quotes q on q.id = qi.quote_id where q.customer_name = 'ZZ Rm Web'),
        'quantity', 1.5,
        'unit_price', 65000)),
      (select updated_at from quotes where customer_name = 'ZZ Rm Web'))$$,
  'once claimed, the salesperson changes the web line''s quantity');

select is(
  (select qi.quantity from quote_items qi join quotes q on q.id = qi.quote_id where q.customer_name = 'ZZ Rm Web'),
  1.5::numeric(12,2), 'the quantity is what the customer now wants');

select is(
  (select (l->>'quantity')::numeric
     from quotes q, jsonb_array_elements(q.requested_items->'lines') l
    where q.customer_name = 'ZZ Rm Web' and l->>'description' = 'ZZ Rm Slab'),
  2::numeric, 'the request still says the 2 the customer asked for');

select is((select total_amount from quotes where customer_name = 'ZZ Rm Web'), 97500.00::numeric(12,2),
  'priced at 1.5 x 65,000, the web quote totals 97,500');

reset role;

select is(
  (select trim_scale((a.before->>'quantity')::numeric) || ' to ' || trim_scale((a.after->>'quantity')::numeric)
     from audit_log a
     join quote_items qi on qi.id = a.entity_id
     join quotes q on q.id = qi.quote_id
    where q.customer_name = 'ZZ Rm Web' and a.entity_type = 'quote_items' and a.action = 'update'
      and a.user_id = :sales_b::uuid
    order by a.created_at desc limit 1),
  '2 to 1.5', 'a quantity change is audited too');

select * from finish();
rollback;
