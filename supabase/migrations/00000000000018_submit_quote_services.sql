-- The submission function, extended for delivery, installation and samples.

-- Extended 1 September 2026: delivery is chargeable, installation is a service
-- Beco sells, and samples are how developers and designers actually buy. All
-- three are captured as intent; the salesperson prices them.
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
         greatest(1, least(10000, (item->>'quantity')::numeric)),
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
