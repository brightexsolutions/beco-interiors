-- Stale edit conflicts must never raise 40001. PostgREST retries a
-- serialization_failure, and a stale timestamp is stale on every retry, so
-- the request would spin forever. See migration 56.
begin;
select plan(3);

select is_empty(
  $$select p.proname from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosrc like '%''40001''%'$$,
  'no public function raises SQLSTATE 40001'
);

select ok(
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc like '%errcode = ''PT409''%') >= 14,
  'every stale edit check raises PT409, a single 409 Conflict'
);

select ok(
  (select prosecdef from pg_proc where proname = 'update_quote_line'
     and pronamespace = 'public'::regnamespace),
  'the rewrite kept security definer on the rewritten functions'
);

select * from finish();
rollback;
