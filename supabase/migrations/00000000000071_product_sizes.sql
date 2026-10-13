-- Product sizes, D137. A handle comes in 96mm, 128mm and 160mm; a profile in
-- two lengths. Each is the same product with a size chosen at the counter,
-- not three catalogue rows. `sizes` is an array of
--   { "label": "128mm", "price": 850 | null, "sku": "HT-8350-128" | null }
-- ordered as the editor lists them. A size with no price takes the product
-- price. Empty for everything that has no size.

alter table products
  add column if not exists sizes jsonb not null default '[]'::jsonb;

alter table products drop constraint if exists products_sizes_is_array;
alter table products
  add constraint products_sizes_is_array
  check (jsonb_typeof(sizes) = 'array' and jsonb_array_length(sizes) <= 40);

-- The price a size carries, or null when it falls back to the product's.
-- size_found is false when the label is not one of the product's sizes,
-- which the caller treats as a refusal. Not named `found`: that is
-- PL/pgSQL's own FOUND, and the two collide.
create or replace function product_size_price(p_product products, p_size text, out size_found boolean, out size_price numeric)
language plpgsql
immutable
as $$
declare
  v_row jsonb;
begin
  size_found := false;
  size_price := null;
  if p_size is null or p_size = '' then
    return;
  end if;
  for v_row in select value from jsonb_array_elements(p_product.sizes)
  loop
    if v_row->>'label' = p_size then
      size_found := true;
      if jsonb_typeof(v_row->'price') = 'number' then
        size_price := (v_row->>'price')::numeric;
      end if;
      return;
    end if;
  end loop;
end;
$$;

-- Add several published products under one lock, now with an optional size
-- per item. The line's description carries the size so the quote reads
-- "HT-8350 Black Gold, 128mm"; the list price is the size's own when it has
-- one, so a priced-away line is measured against the right figure.
-- Everything else is migration 67's function unchanged: the stale lock is
-- PT409 and a won, lost or converted quote takes no new lines.
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
  v_status quote_status;
  v_order uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_price_in numeric;
  v_price numeric;
  v_list numeric;
  v_qty numeric;
  v_sort int;
  v_size text;
  v_size_found boolean;
  v_size_price numeric;
  v_description text;
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

  select assigned_to, updated_at, deleted_at, status, converted_order_id
    into v_assigned, v_updated, v_deleted, v_status, v_order
    from quotes
   where id = p_quote_id
     for update;

  if not found or v_deleted is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = 'PT409';
  end if;
  if not is_admin() and v_assigned is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  perform assert_quote_lines_open(v_status, v_order);

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
      v_size := nullif(trim(coalesce(v_item->>'size', '')), '');
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

    v_description := v_product.name;
    v_list := v_product.price;
    if v_size is not null then
      select s.size_found, s.size_price
        into v_size_found, v_size_price
        from product_size_price(v_product, v_size) s;
      if not v_size_found then
        raise exception 'That size is not one this product comes in' using errcode = '22023';
      end if;
      v_description := v_product.name || ', ' || v_size;
      if v_size_price is not null then
        v_list := v_size_price;
      end if;
    end if;

    v_qty := round_quote_quantity(v_quantity, v_product.unit);
    if v_price_in is null then
      v_price := coalesce(v_list, 0);
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
      v_description,
      v_qty,
      v_list,
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
