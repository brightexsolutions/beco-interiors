-- Save every dirty line in one lock. Per-row Update was racing the
-- quote's updated_at after the first write.

create or replace function update_quote_lines(
  p_quote_id uuid,
  p_items jsonb,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_assigned uuid;
  v_updated timestamptz;
  v_deleted timestamptz;
  v_item jsonb;
  v_line_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_product_id uuid;
  v_unit text;
  v_qty numeric;
  v_touched int := 0;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Nothing to save' using errcode = '22023';
  end if;

  select assigned_to, updated_at, deleted_at
    into v_assigned, v_updated, v_deleted
    from quotes
   where id = p_quote_id
     for update;

  if not found or v_deleted is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = '40001';
  end if;
  if not is_admin() and v_assigned is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_line_id := (v_item->>'line_id')::uuid;
      v_quantity := (v_item->>'quantity')::numeric;
      v_price := (v_item->>'unit_price')::numeric;
    exception when invalid_text_representation then
      raise exception 'Check quantity and price, then try again.' using errcode = '22023';
    end;

    if v_price is null or v_price < 0 then
      raise exception 'A price cannot be negative' using errcode = '22023';
    end if;

    select qi.product_id, p.unit
      into v_product_id, v_unit
      from quote_items qi
      left join products p on p.id = qi.product_id
     where qi.id = v_line_id
       and qi.quote_id = p_quote_id;

    if not found then
      raise exception 'Line not found' using errcode = 'P0002';
    end if;

    if v_product_id is null then
      v_qty := greatest(0.5, round(least(10000, coalesce(v_quantity, 0)) * 2) / 2);
    else
      v_qty := round_quote_quantity(v_quantity, v_unit);
    end if;

    update quote_items
       set quantity = v_qty,
           unit_price = round(v_price, 2)
     where id = v_line_id
       and quote_id = p_quote_id;

    v_touched := v_touched + 1;
  end loop;

  if v_touched < 1 then
    raise exception 'Nothing to save' using errcode = '22023';
  end if;

  perform refresh_quote_money(p_quote_id);
end;
$$;

revoke all on function update_quote_lines(uuid, jsonb, timestamptz) from public, anon;
grant execute on function update_quote_lines(uuid, jsonb, timestamptz) to authenticated;
