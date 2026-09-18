-- Manual stock on the catalogue. Quantity is typed by a product manager,
-- never decremented from an order: there is no reservation model yet, and
-- a wrong automatic decrement is worse than a count that waits for a person.
--
-- NULL means uncounted. The storefront keeps showing `availability` until
-- someone types a number. Zero is out of stock. Half units are for
-- `unit = 'per slab'` only, the same D68 split quotes already use.

alter table products
  add column if not exists stock_quantity numeric(12,2),
  add column if not exists low_stock_threshold numeric(12,2);

alter table products drop constraint if exists products_stock_quantity_non_negative;
alter table products add constraint products_stock_quantity_non_negative
  check (stock_quantity is null or stock_quantity >= 0);

alter table products drop constraint if exists products_low_stock_threshold_non_negative;
alter table products add constraint products_low_stock_threshold_non_negative
  check (low_stock_threshold is null or low_stock_threshold >= 0);

alter table products drop constraint if exists products_stock_quantity_step;
alter table products add constraint products_stock_quantity_step
  check (
    stock_quantity is null
    or (
      case
        when unit = 'per slab' then stock_quantity = round(stock_quantity * 2) / 2
        else stock_quantity = round(stock_quantity)
      end
    )
  );

alter table products drop constraint if exists products_low_stock_threshold_step;
alter table products add constraint products_low_stock_threshold_step
  check (
    low_stock_threshold is null
    or (
      case
        when unit = 'per slab' then low_stock_threshold = round(low_stock_threshold * 2) / 2
        else low_stock_threshold = round(low_stock_threshold)
      end
    )
  );

-- Same optimistic-lock bump quotes already use, so two catalogue edits
-- cannot silently overwrite each other.
drop trigger if exists products_touch_updated_at on products;
create trigger products_touch_updated_at
  before update on products
  for each row execute function touch_updated_at();

-- Low-stock count for the home catalogue card. The rest of the function is
-- unchanged; this replace exists so the card can name a threshold without a
-- second round trip.
create or replace function dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with bounds as (
  select
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
    count(*) filter (where not is_published)                                          as draft,
    count(*) filter (
      where is_published
        and stock_quantity is not null
        and low_stock_threshold is not null
        and stock_quantity > 0
        and stock_quantity <= low_stock_threshold
    ) as low_stock
  from products
  where deleted_at is null
),
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
    'draft',       c.draft,
    'low_stock',   c.low_stock
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
