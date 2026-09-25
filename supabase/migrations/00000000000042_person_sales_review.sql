-- Per-person invoiced and collected on the leaderboard, so a sales review
-- PDF can be the team or one salesperson. Same D8 split as the team totals.
-- Function replace only; RLS is unchanged (SECURITY INVOKER).

create or replace function salesperson_leaderboard(p_period text default 'this_month')
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with bounds as (
  select * from report_period_bounds(p_period)
),
people as (
  select id, full_name
    from users
   where is_active
     and role in ('beco_sales', 'beco_admin')
),
raised as (
  select q.created_by as person_id, count(*) as n
    from quotes q cross join bounds b
   where q.deleted_at is null
     and q.created_by is not null
     and q.created_at >= b.period_start
     and q.created_at < b.period_end
   group by q.created_by
),
decided as (
  select
    coalesce(q.assigned_to, q.created_by) as person_id,
    count(*) filter (where q.status = 'won') as won,
    count(*) filter (where q.status = 'lost') as lost,
    coalesce(sum(q.total_amount) filter (where q.status = 'won'), 0) as won_value
    from quotes q cross join bounds b
   where q.deleted_at is null
     and q.finalized_at >= b.period_start
     and q.finalized_at < b.period_end
     and q.status in ('won', 'lost')
     and coalesce(q.assigned_to, q.created_by) is not null
   group by coalesce(q.assigned_to, q.created_by)
),
closed as (
  select
    o.salesperson_id as person_id,
    count(*) filter (
      where o.created_at >= b.period_start and o.created_at < b.period_end
    ) as n,
    coalesce(sum(o.total_amount) filter (
      where o.created_at >= b.period_start and o.created_at < b.period_end
    ), 0) as value,
    coalesce(sum(o.total_amount) filter (
      where o.status in ('confirmed', 'fulfilled')
        and coalesce(o.confirmed_at, o.created_at) >= b.period_start
        and coalesce(o.confirmed_at, o.created_at) < b.period_end
    ), 0) as invoiced,
    coalesce(sum(o.total_amount) filter (
      where o.payment_status = 'paid'
        and o.paid_at >= b.period_start
        and o.paid_at < b.period_end
    ), 0) as collected
    from orders o cross join bounds b
   where o.deleted_at is null
     and o.salesperson_id is not null
   group by o.salesperson_id
),
sales as (
  select
    coalesce(sum(o.total_amount) filter (
      where o.status in ('confirmed', 'fulfilled')
        and coalesce(o.confirmed_at, o.created_at) >= b.period_start
        and coalesce(o.confirmed_at, o.created_at) < b.period_end
    ), 0) as invoiced,
    coalesce(sum(o.total_amount) filter (
      where o.payment_status = 'paid'
        and o.paid_at >= b.period_start
        and o.paid_at < b.period_end
    ), 0) as collected
    from orders o cross join bounds b
   where o.deleted_at is null
)
select jsonb_build_object(
  'period', (select label from bounds),
  'invoiced', s.invoiced,
  'collected', s.collected,
  'people', coalesce((
    select jsonb_agg(row_to_json(t) order by t.won_value desc, t.full_name)
    from (
      select
        p.id,
        p.full_name,
        coalesce(r.n, 0)::int as raised,
        coalesce(d.won, 0)::int as won,
        coalesce(d.lost, 0)::int as lost,
        coalesce(d.won_value, 0) as won_value,
        case
          when coalesce(d.won, 0) + coalesce(d.lost, 0) = 0 then null
          else round(100.0 * coalesce(d.won, 0) / (coalesce(d.won, 0) + coalesce(d.lost, 0)), 1)
        end as conversion,
        coalesce(c.n, 0)::int as orders,
        coalesce(c.value, 0) as order_value,
        coalesce(c.invoiced, 0) as invoiced,
        coalesce(c.collected, 0) as collected
      from people p
      left join raised r on r.person_id = p.id
      left join decided d on d.person_id = p.id
      left join closed c on c.person_id = p.id
    ) t
  ), '[]'::jsonb)
)
from sales s;
$$;

revoke all on function salesperson_leaderboard(text) from public;
grant execute on function salesperson_leaderboard(text) to authenticated;
