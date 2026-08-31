-- Anonymous access. Proving the NEGATIVE is the point of this file.
begin;
select plan(8);

-- Seed as the owner, before dropping to anon.
insert into categories (id, name, slug, is_published)
  values ('11111111-1111-1111-1111-111111111111', 'Sintered Stones', 'sintered-stones', true);
insert into products (name, slug, category_id, is_published, price_display_mode)
  values ('Published Stone', 'zz-test-published',
          '11111111-1111-1111-1111-111111111111', true, 'poa');
insert into products (name, slug, category_id, is_published, price_display_mode)
  values ('Draft Stone', 'zz-test-draft',
          '11111111-1111-1111-1111-111111111111', false, 'poa');
insert into products (name, slug, is_published, price_display_mode, deleted_at)
  values ('Deleted Stone', 'zz-test-deleted', true, 'poa', now());
insert into quotes (customer_name, customer_phone) values ('Real Customer', '0722111222');

set local role anon;

-- Scoped to this file's own fixtures, so the seed's 24 real products do not
-- make the assertion meaningless. A test that counts everything breaks the
-- moment someone adds a row.
select results_eq(
  $$select count(*)::int from products where slug like 'zz-test-%'$$,
  ARRAY[1],
  'of three fixtures, anon sees ONLY the published, non deleted one'
);

select is_empty(
  $$select * from products where slug = 'zz-test-draft'$$,
  'anon cannot read an unpublished product'
);

select is_empty(
  $$select * from products where slug = 'zz-test-deleted'$$,
  'a soft deleted product is invisible to anon, even though the row still exists'
);

select is_empty($$select * from quotes$$,  'anon cannot read any quote');
select is_empty($$select * from orders$$,  'anon cannot read any order');
select is_empty($$select * from users$$,   'anon cannot read any user');
select is_empty($$select * from audit_log$$,'anon cannot read the audit log');

-- The storefront genuinely needs this one, through a rate limited action.
select lives_ok(
  $$insert into quotes (customer_name, customer_phone)
    values ('Web Visitor', '0722333444')$$,
  'anon CAN submit a quote, which the storefront requires'
);

select * from finish();
rollback;
