-- Custom report range: start and end dates, Nairobi calendar days,
-- start inclusive and end exclusive of the following midnight.
-- this_month / last_month stay the named shortcuts.
-- Function replace only; RLS is unchanged (SECURITY INVOKER).

drop function if exists report_period_bounds(text);
drop function if exists salesperson_leaderboard(text);
drop function if exists conversion_report(text);

create function report_period_bounds(
  p_period text,
  p_from date default null,
  p_to date default null
)
returns table (period_start timestamptz, period_end timestamptz, label text)
language sql
stable
set search_path = public, pg_temp
as $$
  with nairobi as (
    select
      (date_trunc('month', timezone('Africa/Nairobi', now()))) at time zone 'Africa/Nairobi' as this_start,
      (date_trunc('month', timezone('Africa/Nairobi', now())) - interval '1 month') at time zone 'Africa/Nairobi' as last_start,
      (date_trunc('month', timezone('Africa/Nairobi', now())) + interval '1 month') at time zone 'Africa/Nairobi' as next_start
  ),
  chosen as (
    select
      p_period = 'custom'
      and p_from is not null
      and p_to is not null
      and p_from <= p_to
      and p_to <= p_from + 365 as use_custom
  )
  select
    case
      when (select use_custom from chosen)
        then (p_from::timestamp) at time zone 'Africa/Nairobi'
      when p_period = 'last_month' then last_start
      else this_start
    end,
    case
      when (select use_custom from chosen)
        then ((p_to + 1)::timestamp) at time zone 'Africa/Nairobi'
      when p_period = 'last_month' then this_start
      else next_start
    end,
    case
      when (select use_custom from chosen) then
        trim(to_char(p_from, 'FMDD Mon YYYY'))
        || case
             when p_from = p_to then ''
             else ' to ' || trim(to_char(p_to, 'FMDD Mon YYYY'))
           end
      when p_period = 'last_month' then 'Last month'
      else 'This month'
    end
  from nairobi;
$$;

create function salesperson_leaderboard(
  p_period text default 'this_month',
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with bounds as (
  select * from report_period_bounds(p_period, p_from, p_to)
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

create function conversion_report(
  p_period text default 'this_month',
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with bounds as (
  select * from report_period_bounds(p_period, p_from, p_to)
),
events as (
  select
    e.event_type,
    nullif(e.metadata->>'product_id', '') as product_id,
    nullif(e.metadata->>'product_slug', '') as product_slug,
    nullif(e.metadata->>'category_id', '') as category_id,
    nullif(e.metadata->>'category_slug', '') as category_slug
    from analytics_events e cross join bounds b
   where e.created_at >= b.period_start
     and e.created_at < b.period_end
),
matched as (
  select
    e.event_type,
    coalesce(p.id, p_slug.id) as product_id,
    coalesce(p.name, p_slug.name) as product_name,
    coalesce(c.id, c_slug.id, p.category_id, p_slug.category_id) as category_id,
    coalesce(c.name, c_slug.name, cat_from_p.name, cat_from_slug.name) as category_name
    from events e
    left join products p on p.id::text = e.product_id and p.deleted_at is null
    left join products p_slug on p_slug.slug = e.product_slug and p_slug.deleted_at is null
    left join categories c on c.id::text = e.category_id
    left join categories c_slug on c_slug.slug = e.category_slug
    left join categories cat_from_p on cat_from_p.id = p.category_id
    left join categories cat_from_slug on cat_from_slug.id = p_slug.category_id
),
by_product as (
  select
    product_id,
    coalesce(max(product_name), 'Unknown product') as name,
    coalesce(max(category_name), '') as category_name,
    count(*) filter (where event_type = 'product_view') as views,
    count(*) filter (where event_type = 'add_to_cart') as add_to_cart,
    count(*) filter (where event_type = 'quote_submitted') as quote_submitted,
    count(*) filter (where event_type = 'whatsapp_click') as whatsapp,
    count(*) filter (where event_type = 'call_click') as calls
    from matched
   where product_id is not null
   group by product_id
),
by_category as (
  select
    category_id,
    coalesce(max(category_name), 'Unknown category') as name,
    count(*) filter (where event_type = 'product_view') as views,
    count(*) filter (where event_type = 'add_to_cart') as add_to_cart,
    count(*) filter (where event_type = 'quote_submitted') as quote_submitted,
    count(*) filter (where event_type = 'whatsapp_click') as whatsapp,
    count(*) filter (where event_type = 'call_click') as calls
    from matched
   where category_id is not null
   group by category_id
)
select jsonb_build_object(
  'period', (select label from bounds),
  'products', coalesce((
    select jsonb_agg(row_to_json(t) order by t.views desc, t.name)
    from (
      select
        product_id as id,
        name,
        category_name as category,
        views,
        add_to_cart,
        quote_submitted,
        whatsapp,
        calls,
        case when views = 0 then null else round(100.0 * add_to_cart / views, 1) end as view_to_cart,
        case when add_to_cart = 0 then null else round(100.0 * quote_submitted / add_to_cart, 1) end as cart_to_quote
      from by_product
    ) t
  ), '[]'::jsonb),
  'categories', coalesce((
    select jsonb_agg(row_to_json(t) order by t.views desc, t.name)
    from (
      select
        category_id as id,
        name,
        views,
        add_to_cart,
        quote_submitted,
        whatsapp,
        calls,
        case when views = 0 then null else round(100.0 * add_to_cart / views, 1) end as view_to_cart,
        case when add_to_cart = 0 then null else round(100.0 * quote_submitted / add_to_cart, 1) end as cart_to_quote
      from by_category
    ) t
  ), '[]'::jsonb)
);
$$;

revoke all on function report_period_bounds(text, date, date) from public;
revoke all on function salesperson_leaderboard(text, date, date) from public;
revoke all on function conversion_report(text, date, date) from public;

grant execute on function report_period_bounds(text, date, date) to authenticated;
grant execute on function salesperson_leaderboard(text, date, date) to authenticated;
grant execute on function conversion_report(text, date, date) to authenticated;
