-- Public quote submission, as one atomic database function.
--
-- Two problems with doing this from the client with two inserts.
--
-- First, anonymous can INSERT a quote but cannot SELECT one, which is
-- correct: a stranger must not be able to read other people's quotes. But
-- PostgREST adds RETURNING whenever the caller asks for the new row, so
-- asking for the reference number made the whole insert fail. The public
-- quote form could never have worked.
--
-- Second, two round trips means a quote can exist with no line items if the
-- second one fails. A quote with no items looks answered and is worse than no
-- quote at all.
--
-- So: one function, one transaction, returning only the reference number the
-- customer needs. Products are resolved HERE, from the catalogue, so no
-- caller can put its own description or price on a line that goes out on
-- Beco's letterhead.

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
  p_project_details  text default null
)
returns text
language plpgsql
security definer
-- Pinned, so the definer's rights cannot be redirected at an attacker's
-- schema. Required on every security definer function.
set search_path = public, pg_temp
as $$
declare
  v_quote_id  uuid;
  v_reference text;
  v_items     int;
begin
  -- The server action validates with zod first. These are the database's own
  -- guarantees, which hold whatever calls it.
  if coalesce(btrim(p_customer_name), '') = '' then
    raise exception 'A name is required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_customer_phone), '') = '' then
    raise exception 'A phone number is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A quote needs at least one item' using errcode = '22023';
  end if;
  -- A bound on a public write endpoint, so a crafted request cannot ask the
  -- database to build a ten thousand line quote.
  if jsonb_array_length(p_items) > 60 then
    raise exception 'Too many items for one quote' using errcode = '22023';
  end if;

  insert into quotes (
    customer_name, customer_phone, customer_email, company, project_type,
    fulfilment, delivery_address, timeline, budget_note, project_details, source
  ) values (
    btrim(p_customer_name), btrim(p_customer_phone), nullif(btrim(coalesce(p_customer_email,'')),''),
    nullif(btrim(coalesce(p_company,'')),''), nullif(btrim(coalesce(p_project_type,'')),''),
    p_fulfilment, nullif(btrim(coalesce(p_delivery_address,'')),''),
    nullif(btrim(coalesce(p_timeline,'')),''), nullif(btrim(coalesce(p_budget_note,'')),''),
    nullif(btrim(coalesce(p_project_details,'')),''), 'web'
  )
  returning id, reference_number into v_quote_id, v_reference;

  -- The description and the list price come from the PRODUCTS table, never
  -- from the request. unit_price stays at its default of 0 because the whole
  -- catalogue is POA: a salesperson prices it, the customer does not.
  insert into quote_items (quote_id, product_id, description, quantity, list_price, sort_order)
  select v_quote_id,
         p.id,
         p.name,
         greatest(1, least(10000, (item->>'quantity')::numeric)),
         p.price,
         (ord - 1)::int
    from jsonb_array_elements(p_items) with ordinality as t(item, ord)
    join products p
      on p.slug = item->>'slug'
     and p.is_published
     and p.deleted_at is null;

  get diagnostics v_items = row_count;
  if v_items = 0 then
    -- Rolls the quote back with it, so nothing half formed survives.
    raise exception 'None of those products are available' using errcode = '22023';
  end if;

  return v_reference;
end;
$$;

-- Anonymous may CALL it. That is the whole public write surface for quotes,
-- and it is narrower than an insert policy because the function decides what
-- a row may contain.
revoke all on function submit_quote(text, text, jsonb, text, text, text, fulfilment, text, text, text, text) from public;
grant execute on function submit_quote(text, text, jsonb, text, text, text, fulfilment, text, text, text, text) to anon, authenticated;

-- The direct insert policy is no longer the way in, and leaving it would mean
-- two public write paths where one is unvalidated. The function is security
-- definer, so it does not need the policy to do its work.
drop policy if exists quotes_insert_anon on quotes;
drop policy if exists quote_items_insert_anon on quote_items;
