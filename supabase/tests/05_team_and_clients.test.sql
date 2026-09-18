-- The two rules Beco actually asked for, proven rather than assumed.
begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       email, 'x', now(), now(), now()
from (values
  ('dddddddd-0000-0000-0000-000000000001'::uuid, 'director@beco.co.ke'),
  ('dddddddd-0000-0000-0000-000000000002'::uuid, 'agent@beco.co.ke')
) as t(id, email);

insert into users (id, email, full_name, role, is_active) values
  ('dddddddd-0000-0000-0000-000000000001', 'director@beco.co.ke', 'A Director', 'beco_admin', true),
  ('dddddddd-0000-0000-0000-000000000002', 'agent@beco.co.ke',    'A Agent',    'beco_sales', true);

-- A DIRECTOR CANNOT BE MADE PUBLIC. This is the requirement, so it is a
-- constraint rather than a convention someone could tick past.
select throws_ok(
  $$update users set is_public = true
     where id = 'dddddddd-0000-0000-0000-000000000001'$$,
  '23514', null,
  'a director CANNOT be shown publicly, even deliberately'
);

select lives_ok(
  $$update users set is_public = true
     where id = 'dddddddd-0000-0000-0000-000000000002'$$,
  'a salesperson CAN be shown publicly'
);

-- A client cannot be published without recorded permission, because some
-- corporates prohibit being named.
select throws_ok(
  $$insert into clients (name, slug, is_published, has_permission)
    values ('Big Corp', 'big-corp', true, false)$$,
  '23514', null,
  'a client CANNOT be published without recorded permission'
);

select lives_ok(
  $$insert into clients (name, slug, is_published, has_permission)
    values ('Consented Corp', 'consented-corp', true, true)$$,
  'a client with permission can be published'
);

-- The testimonial column added in migration 26 rides the same row, so it
-- needs no policy of its own: proven here by reading it back through the
-- same gate as every other column on a published, permitted client.
update clients set testimonial = 'Beco fitted our counters on schedule.'
  where slug = 'consented-corp';

insert into clients (name, slug, is_published, has_permission)
  values ('Quiet Corp', 'quiet-corp', false, true);
insert into clients (name, slug, is_published, has_permission)
  values ('No Deal Corp', 'no-deal-corp', false, false);

-- What anonymous actually sees.
set local role anon;

select results_eq(
  $$select count(*)::int from users where is_public$$, ARRAY[1],
  'anon sees exactly the one opted in agent'
);

select is_empty(
  $$select * from users where email = 'director@beco.co.ke'$$,
  'anon cannot see the director at all'
);

-- Not an exact count: seed.sql carries its own published, permitted
-- clients for the live ClientShowcase, and this test's own fixture
-- coexists with them inside the same transaction. Targeted at the one
-- row this test actually controls instead, so it stays true regardless
-- of how many real clients seed.sql adds.
select results_eq(
  $$select count(*)::int from clients where slug = 'consented-corp'$$, ARRAY[1],
  'anon sees the published, permitted client'
);

select results_eq(
  $$select testimonial from clients where slug = 'consented-corp'$$,
  ARRAY['Beco fitted our counters on schedule.'],
  'anon reads the testimonial through the same gate as the rest of the row'
);

select is_empty(
  $$select * from clients where slug = 'quiet-corp'$$,
  'an unpublished client stays invisible even with permission recorded'
);

select is_empty(
  $$select * from clients where slug = 'no-deal-corp'$$,
  'an unpublished, unpermitted client is invisible to anon, the ClientShowcase gate'
);

select * from finish();
rollback;
