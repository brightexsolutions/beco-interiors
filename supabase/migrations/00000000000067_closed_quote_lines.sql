-- D132: a closed quote's lines are fixed, for every line change, not only removal.
--
-- Brown, 7 October 2026. Migration 65 made remove_quote_line refuse a won
-- quote, a lost one and one that became an order, but left its siblings as
-- they were: update_quote_lines, update_quote_line, add_custom_quote_line,
-- add_catalogue_quote_line and add_catalogue_quote_lines still moved
-- quantity and price, or added items, on a won or lost quote, stopped only
-- where the D86 approval constraint happened to catch the result. D131
-- recorded that gap for a decision; this is the decision.
--
-- The rule now lives once, in assert_quote_lines_open(), and every function
-- that changes a quote's lines calls it at the same point remove_quote_line
-- made its own checks: after the lock and the permission, before any line is
-- read or written. Same errcodes and messages as migration 65:
--
--   converted to an order  P0001  This quote is already an order. Its items are fixed.
--   won                    P0001  A won quote is closed
--   lost                   P0001  Reopen this quote to change its items
--
-- Every other behaviour is restated unchanged from each function's current
-- definition (migration 33, 35, 38, 65, with migration 56's PT409): the
-- signatures, the permission rule, the stale lock, the input checks, the
-- quantity rounding and the totals through refresh_quote_money. CREATE OR
-- REPLACE keeps the grants; they are restated anyway so this file reads
-- whole.
--
-- Not covered here: the raw quote_items_write_owner RLS policy still lets
-- an owner write lines directly through the API. No screen uses it (D131);
-- closing it is a separate decision, recorded in D132.

-- ---------------------------------------------------------------------------
-- The rule, once.

create or replace function assert_quote_lines_open(
  p_status quote_status,
  p_converted_order_id uuid
)
returns void
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_converted_order_id is not null then
    raise exception 'This quote is already an order. Its items are fixed.' using errcode = 'P0001';
  end if;
  if p_status = 'won' then
    raise exception 'A won quote is closed' using errcode = 'P0001';
  end if;
  if p_status = 'lost' then
    raise exception 'Reopen this quote to change its items' using errcode = 'P0001';
  end if;
end;
$$;

comment on function assert_quote_lines_open(quote_status, uuid) is
  'Raises when a quote''s lines cannot change: converted, won or lost. Called by every line changing function. D132.';

-- Internal: only the security definer line functions call it.
revoke all on function assert_quote_lines_open(quote_status, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- update_quote_lines: the Save on the quote page.

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
  v_status quote_status;
  v_order uuid;
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

-- ---------------------------------------------------------------------------
-- update_quote_line: the single line form of the above.

create or replace function update_quote_line(
  p_quote_id uuid,
  p_line_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
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
  v_product_id uuid;
  v_unit text;
  v_qty numeric;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'A price cannot be negative' using errcode = '22023';
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

  select qi.product_id, p.unit
    into v_product_id, v_unit
    from quote_items qi
    left join products p on p.id = qi.product_id
   where qi.id = p_line_id
     and qi.quote_id = p_quote_id;

  if not found then
    raise exception 'Line not found' using errcode = 'P0002';
  end if;

  if v_product_id is null then
    v_qty := greatest(0.5, round(least(10000, coalesce(p_quantity, 0)) * 2) / 2);
  else
    v_qty := round_quote_quantity(p_quantity, v_unit);
  end if;

  update quote_items
     set quantity = v_qty,
         unit_price = round(p_unit_price, 2)
   where id = p_line_id
     and quote_id = p_quote_id;

  perform refresh_quote_money(p_quote_id);
end;
$$;

revoke all on function update_quote_line(uuid, uuid, numeric, numeric, timestamptz) from public, anon;
grant execute on function update_quote_line(uuid, uuid, numeric, numeric, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- add_custom_quote_line: "Not in the catalogue".

create or replace function add_custom_quote_line(
  p_quote_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
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
  v_sort int;
  v_qty numeric;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if coalesce(btrim(p_description), '') = '' then
    raise exception 'Describe the item' using errcode = '22023';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'A price cannot be negative' using errcode = '22023';
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

  v_qty := greatest(0.5, round(least(10000, coalesce(p_quantity, 1)) * 2) / 2);

  select coalesce(max(sort_order), -1) + 1
    into v_sort
    from quote_items
   where quote_id = p_quote_id;

  insert into quote_items (
    quote_id, product_id, description, quantity, list_price, unit_price, sort_order
  ) values (
    p_quote_id, null, btrim(p_description), v_qty, null, round(p_unit_price, 2), v_sort
  );

  perform refresh_quote_money(p_quote_id);
end;
$$;

revoke all on function add_custom_quote_line(uuid, text, numeric, numeric, timestamptz) from public, anon;
grant execute on function add_custom_quote_line(uuid, text, numeric, numeric, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- add_catalogue_quote_line: one catalogue product.

create or replace function add_catalogue_quote_line(
  p_quote_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
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
  v_sort int;
  v_qty numeric;
  v_product products%rowtype;
  v_price numeric;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
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

  select * into v_product
    from products
   where id = p_product_id
     and deleted_at is null
     and is_published = true;
  if not found then
    raise exception 'That product is not available' using errcode = '22023';
  end if;

  v_qty := round_quote_quantity(coalesce(p_quantity, 1), v_product.unit);
  if p_unit_price is null then
    v_price := coalesce(v_product.price, 0);
  else
    if p_unit_price < 0 then
      raise exception 'A price cannot be negative' using errcode = '22023';
    end if;
    v_price := round(p_unit_price, 2);
  end if;

  select coalesce(max(sort_order), -1) + 1
    into v_sort
    from quote_items
   where quote_id = p_quote_id;

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

  perform refresh_quote_money(p_quote_id);
end;
$$;

revoke all on function add_catalogue_quote_line(uuid, uuid, numeric, numeric, timestamptz) from public, anon;
grant execute on function add_catalogue_quote_line(uuid, uuid, numeric, numeric, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- add_catalogue_quote_lines: the catalogue picker on the quote page.

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

-- ---------------------------------------------------------------------------
-- remove_quote_line: restated from migration 65 so its three checks become
-- the shared one. Order and messages unchanged.

create or replace function remove_quote_line(
  p_quote_id uuid,
  p_line_id uuid,
  p_expected_updated_at timestamptz
)
returns text
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
  v_lines int;
  v_description text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
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

  select description into v_description
    from quote_items
   where id = p_line_id
     and quote_id = p_quote_id;
  if not found then
    raise exception 'Line not found' using errcode = 'P0002';
  end if;

  select count(*) into v_lines from quote_items where quote_id = p_quote_id;
  if v_lines <= 1 then
    raise exception 'A quote needs at least one item. Mark it lost instead.' using errcode = 'P0001';
  end if;

  -- D86: any line change clears an approval. On a quote already marked
  -- quoted that still deviates from the catalogue, the check constraint then
  -- refuses the row; say so in words rather than as a constraint name.
  begin
    delete from quote_items
     where id = p_line_id
       and quote_id = p_quote_id;
  exception when check_violation then
    raise exception 'Removing this item clears the approval. Move the quote back to reviewing first.'
      using errcode = 'P0001';
  end;

  perform refresh_quote_money(p_quote_id);
  -- The removed item's name, so the screen can say which one went.
  return v_description;
end;
$$;

revoke all on function remove_quote_line(uuid, uuid, timestamptz) from public, anon;
grant execute on function remove_quote_line(uuid, uuid, timestamptz) to authenticated;

notify pgrst, 'reload schema';
