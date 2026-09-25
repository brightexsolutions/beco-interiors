-- D86, migration 27: a quote that deviates from the catalogue needs
-- approval before it can be finalized. A quote that does not, never waits.
begin;
select plan(11);

\set admin_id '''e1000000-0000-4000-8000-000000000001'''
\set sales_id '''e1000000-0000-4000-8000-000000000002'''
\set quote_id '''e1000000-0000-4000-8000-000000000010'''
\set quote2_id '''e1000000-0000-4000-8000-000000000011'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  (:admin_id::uuid, 'approver@beco.co.ke'),
  (:sales_id::uuid, 'discounter@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  (:admin_id::uuid, 'approver@beco.co.ke',   'An Approver', 'beco_admin', true),
  (:sales_id::uuid, 'discounter@beco.co.ke', 'A Discounter', 'beco_sales', true);

insert into products (id, name, slug, price, price_display_mode, is_published)
values ('e1000000-0000-4000-8000-0000000000aa'::uuid, 'ZZ Test Slab', 'zz-test-approval-slab', 65000, 'fixed', true);

insert into quotes (id, customer_name, customer_phone, assigned_to, created_by)
values
  (:quote_id::uuid,  'Achieng', '0722111111', :sales_id::uuid, :sales_id::uuid),
  (:quote2_id::uuid, 'Otieno',  '0722222222', :sales_id::uuid, :sales_id::uuid);

-- ---------- as the discounting salesperson ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';

insert into quote_items (quote_id, product_id, description, quantity, list_price, unit_price)
values (:quote_id::uuid, 'e1000000-0000-4000-8000-0000000000aa'::uuid, 'ZZ Test Slab', 2, 65000, 65000);

select is(
  (select requires_approval from quotes where id = :quote_id::uuid), false,
  'a line priced at the catalogue price needs no approval'
);

update quote_items set unit_price = 55000
 where quote_id = :quote_id::uuid;

select is(
  (select requires_approval from quotes where id = :quote_id::uuid), true,
  'a discount off the catalogue price flips requires_approval'
);

select throws_ok(
  $$update quotes set approved_by = 'e1000000-0000-4000-8000-000000000002'::uuid,
                       approved_at = now()
     where id = 'e1000000-0000-4000-8000-000000000010'$$,
  '42501', null,
  'a salesperson cannot approve their own discount by hand'
);

select lives_ok(
  $$update quotes set customer_name = 'Achieng Otieno'
     where id = 'e1000000-0000-4000-8000-000000000010'$$,
  'the approval columns are pinned, everything else on their own quote is not'
);

select throws_ok(
  $$update quotes set status = 'quoted'
     where id = 'e1000000-0000-4000-8000-000000000010'$$,
  '23514', null,
  'an unapproved discounted quote cannot be finalized, enforced at the database'
);

-- unpriced and custom lines on the second quote
insert into quote_items (quote_id, product_id, description, quantity, unit_price)
values (:quote2_id::uuid, null, 'Bespoke edge profile', 1, 0);

select is(
  (select requires_approval from quotes where id = :quote2_id::uuid), false,
  'an unpriced custom line is not a pricing decision yet, so it does not gate'
);

update quote_items set unit_price = 12000
 where quote_id = :quote2_id::uuid and product_id is null;

select is(
  (select requires_approval from quotes where id = :quote2_id::uuid), true,
  'pricing a custom line with no catalogue reference needs approval'
);

-- ---------- as the approver ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok(
  $$update quotes set approved_by = 'e1000000-0000-4000-8000-000000000001'::uuid, approved_at = now()
     where id = 'e1000000-0000-4000-8000-000000000010'$$,
  'beco_admin can approve a discounted quote'
);

select lives_ok(
  $$update quotes set status = 'quoted'
     where id = 'e1000000-0000-4000-8000-000000000010'$$,
  'once approved, the quote can be finalized'
);

select is(
  (select approved_by from quotes where id = :quote_id::uuid), :admin_id::uuid,
  'the approver is recorded'
);

-- A further discount on an already quoted, already approved quote: the
-- trigger tries to re-open requires_approval and clear the approval, which
-- the finalized-requires-approval constraint on quotes itself then refuses.
-- The line edit never lands, so a quote cannot be quietly re-discounted
-- once it is out the door.
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok(
  $$update quote_items set unit_price = 50000
     where quote_id = 'e1000000-0000-4000-8000-000000000010'$$,
  '23514', null,
  'a quoted, approved quote cannot be re-discounted without first leaving quoted'
);

select * from finish();
rollback;
