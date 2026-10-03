-- Cancelling an order is an admin's call (D110).
--
-- A salesperson confirms, fulfils and records payment on their own orders.
-- Cancelling reverses a sale the customer has already agreed to, and the
-- business wants that decision above the counter. The check sits ahead of
-- the state checks so the answer a salesperson gets is "not yours to do",
-- never a hint about which transitions exist. Everything else in the
-- function is unchanged from migration 40.

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
  if p_status = 'cancelled' and not is_admin() then
    raise exception 'Only an admin can cancel an order' using errcode = '42501';
  end if;

  select * into v_order
    from orders
   where id = p_order_id
     for update;

  if not found or v_order.deleted_at is not null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.updated_at is distinct from p_expected_updated_at then
    raise exception 'This order changed while you were editing' using errcode = 'PT409';
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
