-- Quote and order header money must match the priced lines. The orders
-- list already sums line_total; reports and convert used quotes.total_amount
-- / orders.total_amount, which stay 0 when lines are inserted without
-- refresh_quote_money (seed, a direct item write, then convert).
-- Function and trigger replace only; RLS is unchanged.

create or replace function refresh_quote_money(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate numeric;
  v_gross numeric;
  v_priced boolean;
  v_vat numeric;
  v_net numeric;
begin
  select coalesce((value #>> '{}')::numeric, 0.16)
    into v_rate
    from settings
   where key = 'vat_rate';
  if v_rate is null or v_rate < 0 or v_rate >= 1 then
    v_rate := 0.16;
  end if;

  select coalesce(sum(line_total) filter (where unit_price > 0), 0),
         (count(*) filter (where unit_price > 0) > 0)
    into v_gross, v_priced
    from quote_items
   where quote_id = p_quote_id;

  if not coalesce(v_priced, false) then
    v_gross := 0;
    v_vat := 0;
    v_net := 0;
  else
    v_gross := round(v_gross, 2);
    v_vat := round(v_gross * (v_rate / (1 + v_rate)), 2);
    v_net := round(v_gross - v_vat, 2);
  end if;

  update quotes
     set subtotal = v_net,
         vat_amount = v_vat,
         total_amount = v_gross
   where id = p_quote_id;
end;
$$;

create or replace function refresh_order_money(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate numeric;
  v_gross numeric;
  v_priced boolean;
  v_vat numeric;
  v_net numeric;
begin
  select coalesce((value #>> '{}')::numeric, 0.16)
    into v_rate
    from settings
   where key = 'vat_rate';
  if v_rate is null or v_rate < 0 or v_rate >= 1 then
    v_rate := 0.16;
  end if;

  select coalesce(sum(line_total) filter (where unit_price > 0), 0),
         (count(*) filter (where unit_price > 0) > 0)
    into v_gross, v_priced
    from order_items
   where order_id = p_order_id;

  if not coalesce(v_priced, false) then
    return;
  end if;

  v_gross := round(v_gross, 2);
  v_vat := round(v_gross * (v_rate / (1 + v_rate)), 2);
  v_net := round(v_gross - v_vat, 2);

  update orders
     set subtotal = v_net,
         vat_amount = v_vat,
         total_amount = v_gross
   where id = p_order_id;
end;
$$;

create or replace function quote_items_refresh_money()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform refresh_quote_money(coalesce(new.quote_id, old.quote_id));
  return coalesce(new, old);
end;
$$;

create or replace function order_items_refresh_money()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform refresh_order_money(coalesce(new.order_id, old.order_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists quote_items_refresh_money on quote_items;
create trigger quote_items_refresh_money
  after insert or update of quantity, unit_price or delete
  on quote_items
  for each row execute function quote_items_refresh_money();

drop trigger if exists order_items_refresh_money on order_items;
create trigger order_items_refresh_money
  after insert or update of quantity, unit_price or delete
  on order_items
  for each row execute function order_items_refresh_money();

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

  perform refresh_quote_money(p_quote_id);
  select * into v_quote from quotes where id = p_quote_id;

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

  perform refresh_order_money(v_order_id);

  update quotes
     set converted_order_id = v_order_id,
         finalized_at = coalesce(finalized_at, now())
   where id = p_quote_id;

  return v_reference;
end;
$$;

revoke all on function refresh_quote_money(uuid) from public, anon;
revoke all on function refresh_order_money(uuid) from public, anon;
revoke all on function quote_items_refresh_money() from public, anon;
revoke all on function order_items_refresh_money() from public, anon;
revoke all on function convert_quote_to_order(uuid, timestamptz) from public;

grant execute on function convert_quote_to_order(uuid, timestamptz) to authenticated;

do $$
declare
  r record;
begin
  for r in select id from quotes loop
    perform refresh_quote_money(r.id);
  end loop;
  for r in select distinct order_id as id from order_items loop
    perform refresh_order_money(r.id);
  end loop;
end $$;
