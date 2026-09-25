-- The dashboard home figures, in one round trip.
--
-- SECURITY INVOKER on purpose, which is the default and is stated here
-- because it is the whole design. A definer function would have to re-derive
-- who may see quotes, orders, products and analytics, and would get it wrong
-- the first time someone added a role. Running as the caller means RLS
-- answers that question exactly once, in the policies that are already
-- tested: a role that cannot read orders simply contributes zero to the
-- sales figures rather than being told no.
--
-- Every boundary is computed in Africa/Nairobi explicitly (docs/REVIEW.md
-- 1.6). "This month" in UTC begins at 3am EAT on the first, so a director
-- counting their own won quotes over breakfast would not match the card.

-- How long a new quote may sit before the home screen calls it late. Staff
-- readable, admin writable, never anon readable: it is an internal promise,
-- not a published one, and the storefront deliberately promises nothing
-- (M5 0.4). Two hours is the working default until Beco confirms.
insert into settings (key, value) values ('quote_response_sla_hours', '2'::jsonb)
on conflict (key) do nothing;

create or replace function dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with bounds as (
  select
    -- Midnight in Nairobi, expressed back in timestamptz so the comparisons
    -- below stay on the indexed timestamptz columns.
    (date_trunc('day',   timezone('Africa/Nairobi', now())))                    at time zone 'Africa/Nairobi' as day_start,
    (date_trunc('month', timezone('Africa/Nairobi', now())))                    at time zone 'Africa/Nairobi' as month_start,
    (date_trunc('month', timezone('Africa/Nairobi', now())) - interval '1 month') at time zone 'Africa/Nairobi' as prev_month_start
),
sla as (
  select coalesce((value #>> '{}')::numeric, 2) as hours
    from settings where key = 'quote_response_sla_hours'
),
awaiting as (
  select
    count(*)                                                        as count,
    max(extract(epoch from (now() - created_at)) / 3600)            as oldest_hours
  from quotes
  where deleted_at is null
    and status in ('new', 'reviewing')
),
-- Won and lost are dated by finalized_at, the moment the outcome was
-- recorded, NOT by created_at. A quote raised in August and won in September
-- is September's win, which is how a salesperson counts it.
decided as (
  select
    count(*) filter (where q.status = 'won'  and q.finalized_at >= b.month_start)                                    as won,
    count(*) filter (where q.status = 'lost' and q.finalized_at >= b.month_start)                                    as lost,
    count(*) filter (where q.status = 'won'  and q.finalized_at >= b.prev_month_start and q.finalized_at < b.month_start) as prev_won,
    count(*) filter (where q.status = 'lost' and q.finalized_at >= b.prev_month_start and q.finalized_at < b.month_start) as prev_lost,
    coalesce(sum(q.total_amount) filter (where q.status = 'won' and q.finalized_at >= b.month_start), 0)             as value,
    coalesce(sum(q.total_amount) filter (where q.status = 'won' and q.finalized_at >= b.prev_month_start and q.finalized_at < b.month_start), 0) as prev_value
  from quotes q cross join bounds b
  where q.deleted_at is null
),
-- Invoiced and collected are kept separate per D8. Money that has been
-- billed is not money that has arrived, and a single "revenue" number that
-- blurs the two is how a business runs out of cash while looking profitable.
sales as (
  select
    coalesce(sum(o.total_amount) filter (where o.created_at >= b.month_start), 0)                                as invoiced,
    coalesce(sum(o.total_amount) filter (where o.payment_status = 'paid' and o.paid_at >= b.month_start), 0)      as collected,
    count(*) filter (where o.created_at >= b.month_start)                                                        as orders
  from orders o cross join bounds b
  where o.deleted_at is null
),
catalogue as (
  select
    count(*) filter (where is_published)                                              as published,
    count(*) filter (where is_published and availability <> 'in_stock')               as unavailable,
    count(*) filter (where is_published and price_display_mode = 'poa')               as poa,
    count(*) filter (where not is_published)                                          as draft
  from products
  where deleted_at is null
),
-- The submissions leg counts quotes, not analytics rows: a quote that
-- reached the table is a lead whether or not its event fired. The other two
-- legs are the only record of a lead that left into WhatsApp or the dialler.
leads as (
  select
    (select count(*) from quotes q cross join bounds b
      where q.deleted_at is null and q.source = 'web' and q.created_at >= b.day_start)     as submissions,
    (select count(*) from analytics_events e cross join bounds b
      where e.event_type = 'whatsapp_click' and e.created_at >= b.day_start)               as whatsapp,
    (select count(*) from analytics_events e cross join bounds b
      where e.event_type = 'call_click' and e.created_at >= b.day_start)                   as calls
)
select jsonb_build_object(
  'awaiting', jsonb_build_object(
    'count',        a.count,
    'oldest_hours', round(coalesce(a.oldest_hours, 0)::numeric, 1),
    'sla_hours',    s.hours
  ),
  'won', jsonb_build_object(
    'count',      d.won,
    'value',      d.value,
    'prev_count', d.prev_won,
    'prev_value', d.prev_value
  ),
  'conversion', jsonb_build_object(
    -- Null, never zero, when nothing was decided. A month with no outcomes
    -- has no conversion rate, and printing 0% would read as a bad month
    -- rather than an empty one.
    'rate',      case when d.won + d.lost = 0 then null
                      else round(d.won::numeric * 100 / (d.won + d.lost), 0) end,
    'prev_rate', case when d.prev_won + d.prev_lost = 0 then null
                      else round(d.prev_won::numeric * 100 / (d.prev_won + d.prev_lost), 0) end,
    'decided',   d.won + d.lost
  ),
  'sales', jsonb_build_object(
    'invoiced',  sa.invoiced,
    'collected', sa.collected,
    'orders',    sa.orders
  ),
  'catalogue', jsonb_build_object(
    'published',   c.published,
    'unavailable', c.unavailable,
    'poa',         c.poa,
    'draft',       c.draft
  ),
  'leads', jsonb_build_object(
    'submissions', l.submissions,
    'whatsapp',    l.whatsapp,
    'calls',       l.calls,
    'total',       l.submissions + l.whatsapp + l.calls
  )
)
from awaiting a, sla s, decided d, sales sa, catalogue c, leads l;
$$;

revoke all on function dashboard_summary() from public, anon;
grant execute on function dashboard_summary() to authenticated;
