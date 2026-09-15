-- A slab can be cut. A quote can want 1.5 of one.
--
-- quote_items.quantity has been numeric(12,2) since migration 5, so the
-- COLUMN never stopped a fractional quantity. `submit_quote` did: it floored
-- every line at a minimum of 1 whole unit with no distinction between a slab,
-- which Beco cuts to order, and a handle, which does not exist in halves.
--
-- The floor is now conditional on the product's own `unit`. A "per slab"
-- line clamps to a half slab minimum and rounds to the nearest half, because
-- that is the increment Beco actually cuts in. Anything else keeps the old
-- behaviour exactly: a minimum of one whole unit, rounded to the nearest
-- whole number. Rounding happens here as well as in the zod schema that
-- gates the public form, because `submit_quote` is itself the public RPC
-- surface and a direct call to it must not be trusted to have gone through
-- the form at all, per rule 2.
--
-- `create or replace function` is safe here because the SIGNATURE is
-- unchanged, only the body. Migration 21 exists precisely because changing a
-- signature under `create or replace` creates a second function instead of
-- replacing the first; this is not that case.

create or replace function submit_quote(
  p_customer_name    text,
  p_customer_phone   text,
  p_items            jsonb,
  p_customer_email   text default null,
  p_company          text default null,
  p_project_type     text default null,
  p_fulfilment       fulfilment default null,
  p_delivery_address text default null,
  p_timeline         text default null,
  p_budget_note      text default null,
  p_project_details  text default null,
  p_wants_installation boolean default false,
  p_wants_samples      boolean default false
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_id  uuid;
  v_reference text;
  v_items     int;
begin
  if coalesce(btrim(p_customer_name), '') = '' then
    raise exception 'A name is required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_customer_phone), '') = '' then
    raise exception 'A phone number is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A quote needs at least one item' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 60 then
    raise exception 'Too many items for one quote' using errcode = '22023';
  end if;

  insert into quotes (
    customer_name, customer_phone, customer_email, company, project_type,
    fulfilment, delivery_address, timeline, budget_note, project_details, source,
    wants_installation, wants_samples
  ) values (
    btrim(p_customer_name), btrim(p_customer_phone), nullif(btrim(coalesce(p_customer_email,'')),''),
    nullif(btrim(coalesce(p_company,'')),''), nullif(btrim(coalesce(p_project_type,'')),''),
    p_fulfilment, nullif(btrim(coalesce(p_delivery_address,'')),''),
    nullif(btrim(coalesce(p_timeline,'')),''), nullif(btrim(coalesce(p_budget_note,'')),''),
    nullif(btrim(coalesce(p_project_details,'')),''), 'web',
    coalesce(p_wants_installation, false), coalesce(p_wants_samples, false)
  )
  returning id, reference_number into v_quote_id, v_reference;

  insert into quote_items (quote_id, product_id, description, quantity, list_price, sort_order)
  select v_quote_id, p.id, p.name,
         -- A slab is cut to order, so it is bought in halves. Anything else
         -- is a discrete count, and a fractional handle means nothing.
         case
           when p.unit = 'per slab' then
             greatest(0.5, round(least(10000, (item->>'quantity')::numeric) * 2) / 2)
           else
             greatest(1, round(least(10000, (item->>'quantity')::numeric)))
         end,
         p.price, (ord - 1)::int
    from jsonb_array_elements(p_items) with ordinality as t(item, ord)
    join products p
      on p.slug = item->>'slug' and p.is_published and p.deleted_at is null;

  get diagnostics v_items = row_count;
  if v_items = 0 then
    raise exception 'None of those products are available' using errcode = '22023';
  end if;

  return v_reference;
end;
$$;

revoke all on function submit_quote(text, text, jsonb, text, text, text, fulfilment, text, text, text, text, boolean, boolean) from public;
grant execute on function submit_quote(text, text, jsonb, text, text, text, fulfilment, text, text, text, text, boolean, boolean) to anon, authenticated;
