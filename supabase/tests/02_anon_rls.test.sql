-- Anonymous access. Proving the NEGATIVE is the point of this file.
begin;
select plan(15);

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

-- The way in is submit_quote, not a direct insert.
--
-- Migration 12 dropped quotes_insert_anon on purpose: PostgREST adds RETURNING
-- when the caller asks for the new row, and anon cannot SELECT a quote, so the
-- direct insert failed as a whole and the public form could never have worked.
-- This file kept asserting the dropped policy, so it has been failing since.
--
-- Both halves are proven, because the negative is the point of the file: the
-- door is shut, and the one controlled entrance is open.
select throws_ok(
  $$insert into quotes (customer_name, customer_phone)
    values ('Web Visitor', '0722333444')$$,
  '42501',
  null,
  'anon cannot insert a quote directly, so nothing can bypass submit_quote'
);

select lives_ok(
  $$select submit_quote(
      'ZZ Test Visitor',
      '0722333444',
      '[{"slug": "amber-jade", "quantity": 2}]'::jsonb
    )$$,
  'anon CAN submit a quote through submit_quote, which the storefront requires'
);

-- And there is exactly ONE of it. Migration 18 could not replace the original
-- signature, so it created a second function and left both granted to anon.
-- Two live entrances to the quote system, one of which drops the services the
-- customer asked for, is the kind of thing that is only ever found on purpose.
select results_eq(
  $$select count(*)::int from pg_proc where proname = 'submit_quote'$$,
  ARRAY[1],
  'only one submit_quote exists, so a short call cannot be ambiguous'
);

-- D80: the launch countdown and reveal are server rendered from settings
-- like everything else, so anon has to be able to read both keys.
select isnt_empty(
  $$select * from settings where key = 'site_launch_at'$$,
  'anon can read the launch date, the countdown needs it before any login exists'
);
select isnt_empty(
  $$select * from settings where key = 'site_launch_live'$$,
  'anon can read whether the site has gone live'
);
-- settings_write_admin's USING clause is is_admin(), false for anon, so the
-- row is simply never matched for update: 0 rows, no error, same shape as
-- beco_sales failing to reach another salesperson's quote below.
select is_empty(
  $$update settings set value = 'true'::jsonb
     where key = 'site_launch_live' returning key$$,
  'anon cannot throw the launch switch itself, only staff can'
);
select is_empty(
  $$update settings set value = to_jsonb('2026-10-16'::text)
     where key = 'site_launch_at' returning key$$,
  'anon cannot set the launch date either'
);

-- settings_read_public is an explicit key allowlist. The allowlist and the
-- bank details are NOT on it, so anon reading any settings row still only
-- ever sees the public keys.
select is_empty(
  $$select * from settings where key = 'brightex_allowed_emails'$$,
  'anon cannot read an admin-only settings key, only the allowlisted public ones'
);

select * from finish();
rollback;
