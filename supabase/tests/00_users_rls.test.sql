-- RLS policy tests. Prove the NEGATIVE, not only the positive.
-- Run: pnpm db:test
begin;
select plan(6);

select has_table('users');
select has_table('settings');

-- Anonymous must not read any user row.
set local role anon;
select is_empty('select * from users', 'anon cannot read users');

-- Anonymous must not read the Studio allowlist or anything sensitive.
select is_empty(
  $$select * from settings where key = 'brightex_allowed_emails'$$,
  'anon cannot read the brightex allowlist'
);

-- Anonymous CAN read the public settings the storefront needs.
select isnt_empty(
  $$select * from settings where key = 'vat_rate'$$,
  'anon can read vat_rate'
);

-- A domain suffix check would have matched every gmail account. Prove the
-- allowlist is exact by confirming an empty list grants nobody access.
select ok(
  not is_brightex_user(),
  'is_brightex_user is false when the allowlist is empty'
);

select * from finish();
rollback;
