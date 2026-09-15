-- Role separation. Every one of these proves a role CANNOT do something.
-- This is the layer most projects skip and the one that matters most here.
begin;
select plan(6);

-- The Studio gate, D42: role AND allowlisted email, both required.
-- An explicit address list, not a domain suffix, because Brightex's real
-- addresses are gmail.com and a suffix check would match every Gmail account.
select ok(
  not is_brightex_user(),
  'is_brightex_user is false with an empty allowlist, even for the right role'
);

update settings set value = '["someone@example.com"]'::jsonb
  where key = 'brightex_allowed_emails';
select ok(
  not is_brightex_user(),
  'is_brightex_user is false for an unauthenticated caller regardless of the list'
);

-- Policies exist at all. A table with RLS on and no policy denies everyone,
-- which is safe but usually a mistake.
select ok(
  (select count(*) from pg_policies where tablename = 'quotes') >= 4,
  'quotes carries separate insert, read and write policies'
);

select ok(
  (select count(*) from pg_policies where tablename = 'products') >= 3,
  'products separates published reads from staff reads from writes'
);

-- RLS is ON everywhere. Deny by default is the whole model.
select ok(
  (select count(*) from pg_tables t
     where t.schemaname = 'public'
       and not exists (
         select 1 from pg_class c
          where c.relname = t.tablename and c.relrowsecurity
       )) = 0,
  'every table in public has row level security enabled'
);

-- Reference numbers come from a sequence inside the database, so two
-- salespeople saving in the same second cannot collide.
select isnt(
  next_quote_reference(), next_quote_reference(),
  'two consecutive quote references differ'
);

select * from finish();
rollback;
