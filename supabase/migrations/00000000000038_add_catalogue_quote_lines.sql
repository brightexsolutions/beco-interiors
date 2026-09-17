-- Add several published products under one lock. Sequential
-- add_catalogue_quote_line calls race quotes.updated_at after the first write.

create or replace function add_catalogue_quote_lines(
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
  v_product_id uuid;
  v_quantity numeric;
  v_price_in numeric;
  v_price numeric;
  v_qty numeric;
  v_sort int;
  v_product products%rowtype;
  v_touched int := 0;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Pick at least one product' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'Too many products at once' using errcode = '22023';
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

  select coalesce(max(sort_order), -1)
    into v_sort
    from quote_items
   where quote_id = p_quote_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := coalesce((v_item->>'quantity')::numeric, 1);
      v_price_in := (v_item->>'unit_price')::numeric;
    exception when invalid_text_representation then
      raise exception 'Pick products from the catalogue' using errcode = '22023';
    end;

    if v_product_id is null then
      raise exception 'Pick products from the catalogue' using errcode = '22023';
    end if;

    select * into v_product
      from products
     where id = v_product_id
       and deleted_at is null
       and is_published = true;
    if not found then
      raise exception 'That product is not available' using errcode = '22023';
    end if;

    v_qty := round_quote_quantity(v_quantity, v_product.unit);
    if v_price_in is null then
      v_price := coalesce(v_product.price, 0);
    else
      if v_price_in < 0 then
        raise exception 'A price cannot be negative' using errcode = '22023';
      end if;
      v_price := round(v_price_in, 2);
    end if;

    v_sort := v_sort + 1;

    insert into quote_items (
      quote_id, product_id, description, quantity, list_price, unit_price, sort_order
    ) values (
      p_quote_id,
      v_product.id,
      v_product.name,
      v_qty,
      v_product.price,
      v_price,
      v_sort
    );

    v_touched := v_touched + 1;
  end loop;

  if v_touched < 1 then
    raise exception 'Pick at least one product' using errcode = '22023';
  end if;

  perform refresh_quote_money(p_quote_id);
end;
$$;

revoke all on function add_catalogue_quote_lines(uuid, jsonb, timestamptz) from public, anon;
grant execute on function add_catalogue_quote_lines(uuid, jsonb, timestamptz) to authenticated;
