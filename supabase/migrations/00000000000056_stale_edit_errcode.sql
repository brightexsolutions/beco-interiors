-- Stale edit conflicts raise PT409, not 40001.
--
-- Every optimistic concurrency check in the quote and order functions raised
-- 'This quote changed while you were editing' with SQLSTATE 40001. That is
-- serialization_failure, and PostgREST treats it as transient: it retries the
-- whole transaction, and a stale timestamp is stale on every retry, so the
-- request never returns. The salesperson saw a spinner that never ended, and
-- the database burned a backend at full CPU until the gateway gave up. Found
-- by the HTTP integration suite, where the stale line edit test hung.
--
-- PT409 is PostgREST's own convention for a chosen HTTP status: the request
-- fails once with 409 Conflict, and the client receives code PT409 with the
-- original message, which the dashboard already maps to "reload and try again".
--
-- Rewritten in place from each function's current definition rather than
-- copied out by hand, so fourteen bodies cannot drift from what migrations
-- 30 to 44 left behind. CREATE OR REPLACE keeps the owner, grants, security
-- definer and search_path. supabase/tests/32_stale_edit_errcode.test.sql
-- proves no public function raises 40001 any more, so a later migration
-- cannot quietly put it back.

do $$
declare
  fn record;
  definition text;
begin
  for fn in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosrc like '%errcode = ''40001''%'
  loop
    definition := replace(
      pg_get_functiondef(fn.oid),
      'errcode = ''40001''',
      'errcode = ''PT409'''
    );
    execute definition;
  end loop;
end
$$;
