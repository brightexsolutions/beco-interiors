-- Anonymous access. Proving the NEGATIVE is the point of this file.
begin;
select plan(8);

-- Seed as the owner, before dropping to anon.
insert into categories (id, name, slug, is_published)
  values ('11111111-1111-1111-1111-111111111111', 'Sintered Stones', 'sintered-stones', true);
insert into products (name, slug, category_id, is_published, price_display_mode)
  values ('Published Stone', 'published-stone',
          '11111111-1111-1111-1111-111111111111', true, 'poa');
insert into products (name, slug, category_id, is_published, price_display_mode)
  values ('Draft Stone', 'draft-stone',
          '11111111-1111-1111-1111-111111111111', false, 'poa');
insert into products (name, slug, is_published, price_display_mode, deleted_at)
  values ('Deleted Stone', 'deleted-stone', true, 'poa', now());
insert into quotes (customer_name, customer_phone) values ('Real Customer', '0722111222');

set local role anon;

select results_eq(
  $$select count(*)::int from products$$, ARRAY[1],
  'anon sees ONLY the published, non deleted product'
);

select is_empty(
  $$select * from products where slug = 'draft-stone'$$,
  'anon cannot read an unpublished product'
);

select is_empty(
  $$select * from products where slug = 'deleted-stone'$$,
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
