-- Weekly activity and the quote pipeline, for the dashboard's charts (D106).
--
-- SECURITY INVOKER, like dashboard_summary(): RLS decides which quotes and
-- orders the caller may count, so a role that cannot read orders contributes
-- zero to the money series rather than being told no. Every boundary is a
-- Monday in Africa/Nairobi, expressed back in timestamptz so the comparisons
-- stay on the indexed columns.

create or replace function activity_series(p_weeks integer default 8)
returns table (
  week_start date,
  raised     integer,
  won        integer,
  lost       integer,
  won_value  numeric,
  invoiced   numeric,
  collected  numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with weeks as (
    select generate_series(
      date_trunc('week', timezone('Africa/Nairobi', now()))::date - (greatest(1, least(p_weeks, 52)) - 1) * interval '1 week',
      date_trunc('week', timezone('Africa/Nairobi', now()))::date,
      interval '1 week'
    )::date as week_start
  ),
  bounds as (
    select
      week_start,
      (week_start::timestamp) at time zone 'Africa/Nairobi'                       as from_at,
      ((week_start + 7)::timestamp) at time zone 'Africa/Nairobi'                 as to_at
    from weeks
  )
  select
    b.week_start,
    (select count(*)::integer from quotes q
      where q.deleted_at is null and q.created_at >= b.from_at and q.created_at < b.to_at),
    (select count(*)::integer from quotes q
      where q.deleted_at is null and q.status = 'won' and q.finalized_at >= b.from_at and q.finalized_at < b.to_at),
    (select count(*)::integer from quotes q
      where q.deleted_at is null and q.status = 'lost' and q.finalized_at >= b.from_at and q.finalized_at < b.to_at),
    (select coalesce(sum(q.total_amount), 0) from quotes q
      where q.deleted_at is null and q.status = 'won' and q.finalized_at >= b.from_at and q.finalized_at < b.to_at),
    (select coalesce(sum(o.total_amount), 0) from orders o
      where o.deleted_at is null and o.created_at >= b.from_at and o.created_at < b.to_at),
    (select coalesce(sum(o.total_amount), 0) from orders o
      where o.deleted_at is null and o.payment_status = 'paid' and o.paid_at >= b.from_at and o.paid_at < b.to_at)
  from bounds b
  order by b.week_start;
$$;

-- Where every open quote stands, plus this month's decided ones, so the home
-- page can draw one bar of the pipeline from new to won.
create or replace function quote_pipeline()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with month_start as (
    select (date_trunc('month', timezone('Africa/Nairobi', now()))) at time zone 'Africa/Nairobi' as at
  )
  select jsonb_build_object(
    'new',       count(*) filter (where q.status = 'new'),
    'reviewing', count(*) filter (where q.status = 'reviewing'),
    'quoted',    count(*) filter (where q.status = 'quoted'),
    'won',       count(*) filter (where q.status = 'won'  and q.finalized_at >= m.at),
    'lost',      count(*) filter (where q.status = 'lost' and q.finalized_at >= m.at)
  )
  from quotes q cross join month_start m
  where q.deleted_at is null;
$$;

revoke all on function activity_series(integer) from public, anon;
revoke all on function quote_pipeline() from public, anon;
grant execute on function activity_series(integer) to authenticated;
grant execute on function quote_pipeline() to authenticated;

-- Beco place Handles beside Sintered Stone. Migration 58 made it a major
-- category; this puts it where they read it, between the stone and panels.
update categories set sort_order = 15 where source_path = 'HANDLES';
