-- Anonymous analytics inserts take a known event with a small payload, and
-- nothing else. Migration 60, D108.
begin;
select plan(6);

set local role anon;

select lives_ok(
  $$insert into analytics_events (event_type, metadata)
      values ('whatsapp_click', '{"product_id":"00000000-0000-4000-8000-000000000001"}')$$,
  'anon may record a lead event the reports know'
);

select lives_ok(
  $$insert into analytics_events (event_type) values ('product_view')$$,
  'anon may record a product view with the default empty metadata'
);

select throws_ok(
  $$insert into analytics_events (event_type) values ('made_up_event')$$,
  '42501', null,
  'anon cannot record an event type the reports do not know'
);

select throws_ok(
  $$insert into analytics_events (event_type, metadata)
      values ('product_view', ('{"junk":"' || repeat('x', 3000) || '"}')::jsonb)$$,
  '42501', null,
  'anon cannot store a metadata payload over 2KB'
);

select is_empty(
  $$select id from analytics_events$$,
  'anon reads nothing back, its own rows included'
);

reset role;

select is(
  (select count(*) from pg_policies where tablename = 'analytics_events' and cmd = 'INSERT'),
  1::bigint,
  'exactly one insert policy stands on analytics_events, so a second open one cannot creep in'
);

select * from finish();
rollback;
