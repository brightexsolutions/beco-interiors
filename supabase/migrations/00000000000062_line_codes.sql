-- D124: a quote line carries the product's code.
--
-- A hinge, a handle or a door lock is chosen by its code, and the quote
-- line said only the product's name. Where the name did not repeat the
-- code ("Soft close hinge" with H-301 in the code field), the quote and the
-- PDF could not say which item was priced.
--
-- The code is copied onto the line when the line is written, the same rule
-- as the price: an issued quote never changes because a product was edited
-- afterwards. One trigger fills it on every path that inserts a line (the
-- web form, the counter form, adding catalogue lines), so none of those
-- functions is rewritten. A line with no product, or a product with no
-- code, carries none. Lines written before this migration carry none either:
-- backfilling would rewrite issued quotes, and the money triggers on update
-- would fire for nothing.
--
-- `convert_quote_to_order` is restated from migration 44 to copy the code,
-- with the stale edit errcode already PT409 as migration 56 rewrote it.

alter table quote_items
  add column code text check (code is null or length(code) between 1 and 80);
alter table order_items
  add column code text check (code is null or length(code) between 1 and 80);

comment on column quote_items.code is
  'The product code (products.sku) when the line was written. A snapshot, never read live. D124.';
comment on column order_items.code is
  'Copied from the quote line on conversion, or the product code when written. D124.';

create or replace function line_code_from_product()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.code is null and new.product_id is not null then
    select left(nullif(btrim(p.sku), ''), 80) into new.code
      from products p
     where p.id = new.product_id;
  end if;
  return new;
end
$$;

create trigger quote_items_code
  before insert on quote_items
  for each row execute function line_code_from_product();

create trigger order_items_code
  before insert on order_items
  for each row execute function line_code_from_product();

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
    raise exception 'This quote changed while you were editing' using errcode = 'PT409';
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

  -- The code goes across from the quote line, D124: the order is what was
  -- quoted, even if the product's code has been edited since.
  insert into order_items (
    order_id, product_id, description, code, quantity, list_price, unit_price, sort_order
  )
  select
    v_order_id, product_id, description, code, quantity, list_price, unit_price, sort_order
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


revoke all on function line_code_from_product() from public, anon;
revoke all on function convert_quote_to_order(uuid, timestamptz) from public;
grant execute on function convert_quote_to_order(uuid, timestamptz) to authenticated;
