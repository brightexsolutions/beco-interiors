-- Order write path. Sales cannot insert order_items (admin-only RLS), so
-- converting a won quote is a security definer RPC, the same shape as
-- submit_quote. Line prices copy unchanged. Stock is not touched (D89).
-- See M5 0.9 and ARCHITECTURE section 6.

alter table orders
  add column if not exists confirmed_at  timestamptz,
  add column if not exists fulfilled_at  timestamptz,
  add column if not exists cancelled_at  timestamptz;

-- One quote becomes one order. Web orders with no quote stay allowed.
create unique index if not exists orders_one_quote_idx
  on orders (quote_id)
  where quote_id is not null and deleted_at is null;

drop trigger if exists orders_touch_updated_at on orders;
create trigger orders_touch_updated_at
  before update on orders
  for each row execute function touch_updated_at();

create or replace function convert_quote_to_order(
  p_quote_id uuid,
  p_expected_updated_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_quote quotes%rowtype;
  v_owner uuid;
  v_order_id uuid;
  v_reference text;
  v_lines int;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_quote
    from quotes
   where id = p_quote_id
     for update;

  if not found or v_quote.deleted_at is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_quote.updated_at is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = '40001';
  end if;
  if v_quote.status is distinct from 'won' then
    raise exception 'Only a won quote can become an order' using errcode = 'P0001';
  end if;
  if v_quote.converted_order_id is not null then
    raise exception 'This quote is already an order' using errcode = 'P0001';
  end if;

  v_owner := coalesce(v_quote.assigned_to, v_quote.created_by);
  if not is_admin() and v_owner is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select count(*) into v_lines from quote_items where quote_id = p_quote_id;
  if v_lines = 0 then
    raise exception 'A quote needs at least one item' using errcode = '22023';
  end if;

  insert into orders (
    quote_id, customer_name, customer_phone, customer_email, source,
    fulfilment, delivery_address, notes, status, payment_status,
    subtotal, vat_amount, total_amount, created_by, salesperson_id
  ) values (
    p_quote_id,
    v_quote.customer_name,
    v_quote.customer_phone,
    v_quote.customer_email,
    v_quote.source,
    v_quote.fulfilment,
    v_quote.delivery_address,
    v_quote.project_details,
    'pending',
    'unpaid',
    v_quote.subtotal,
    v_quote.vat_amount,
    v_quote.total_amount,
    v_uid,
    v_owner
  )
  returning id, reference_number into v_order_id, v_reference;

  insert into order_items (
    order_id, product_id, description, quantity, list_price, unit_price, sort_order
  )
  select
    v_order_id, product_id, description, quantity, list_price, unit_price, sort_order
  from quote_items
  where quote_id = p_quote_id
  order by sort_order;

  update quotes
     set converted_order_id = v_order_id,
         finalized_at = coalesce(finalized_at, now())
   where id = p_quote_id;

  return v_reference;
end;
$$;

create or replace function set_order_status(
  p_order_id uuid,
  p_status order_status,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_order orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_order
    from orders
   where id = p_order_id
     for update;

  if not found or v_order.deleted_at is not null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.updated_at is distinct from p_expected_updated_at then
    raise exception 'This order changed while you were editing' using errcode = '40001';
  end if;
  if not is_admin() and v_order.salesperson_id is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'A cancelled order cannot change status' using errcode = 'P0001';
  end if;
  if v_order.status = 'fulfilled' then
    raise exception 'A fulfilled order cannot change status' using errcode = 'P0001';
  end if;
  if p_status = v_order.status then
    return;
  end if;

  if p_status = 'pending' then
    raise exception 'An order cannot move back to pending' using errcode = '22023';
  end if;
  if v_order.status = 'pending' and p_status not in ('confirmed', 'cancelled') then
    raise exception 'A pending order becomes confirmed or cancelled' using errcode = '22023';
  end if;
  if v_order.status = 'confirmed' and p_status not in ('fulfilled', 'cancelled') then
    raise exception 'A confirmed order becomes fulfilled or cancelled' using errcode = '22023';
  end if;

  update orders
     set status = p_status,
         confirmed_at = case
           when p_status = 'confirmed' then coalesce(confirmed_at, now())
           when p_status = 'fulfilled' then coalesce(confirmed_at, now())
           else confirmed_at
         end,
         fulfilled_at = case
           when p_status = 'fulfilled' then now()
           else fulfilled_at
         end,
         cancelled_at = case
           when p_status = 'cancelled' then now()
           else cancelled_at
         end
   where id = p_order_id;
end;
$$;

create or replace function mark_order_paid(
  p_order_id uuid,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_order orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_order
    from orders
   where id = p_order_id
     for update;

  if not found or v_order.deleted_at is not null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.updated_at is distinct from p_expected_updated_at then
    raise exception 'This order changed while you were editing' using errcode = '40001';
  end if;
  if not is_admin() and v_order.salesperson_id is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'A cancelled order cannot be marked paid' using errcode = 'P0001';
  end if;
  if v_order.payment_status = 'paid' then
    raise exception 'This order is already paid' using errcode = 'P0001';
  end if;

  update orders
     set payment_status = 'paid',
         paid_at = now()
   where id = p_order_id;
end;
$$;

revoke all on function convert_quote_to_order(uuid, timestamptz) from public;
revoke all on function set_order_status(uuid, order_status, timestamptz) from public;
revoke all on function mark_order_paid(uuid, timestamptz) from public;

grant execute on function convert_quote_to_order(uuid, timestamptz) to authenticated;
grant execute on function set_order_status(uuid, order_status, timestamptz) to authenticated;
grant execute on function mark_order_paid(uuid, timestamptz) to authenticated;
