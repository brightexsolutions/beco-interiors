-- Counter quotes, line edits, status, approval, reissue, and document
-- settings. Every write that can race carries the optimistic lock token
-- (REVIEW 2.2). Sales still cannot insert a quote row directly: this is
-- the only door, the same shape as submit_quote.

-- Bank and till details, payment terms and the PDF footer live in settings
-- so Beco changes them without a deploy. Staff readable, not anon: the
-- public allowlist on settings_read_public is unchanged.

insert into settings (key, value) values
  ('bank_details', '"KCB Bank Kenya. Account name: Beco Interiors. Ask staff for the current account number."'::jsonb),
  ('till_number', '""'::jsonb),
  ('payment_terms', '"Prices include VAT. Valid for the days shown. Payment on collection unless agreed."'::jsonb),
  ('quote_footer', '"Urban Square, Shop 8 and 9, Enterprise Road, Industrial Area, Nairobi. +254 722 333 730. info@beco.co.ke"'::jsonb)
on conflict (key) do nothing;

-- Half slab vs whole, the D68 split, in one place so the counter RPC and
-- a later line edit cannot disagree with submit_quote.
create or replace function round_quote_quantity(p_quantity numeric, p_unit text)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_unit = 'per slab' then
      greatest(0.5, round(least(10000, p_quantity) * 2) / 2)
    else
      greatest(1, round(least(10000, coalesce(p_quantity, 0))))
  end;
$$;

-- Persist the D50 split on the quote row so a report and a document cannot
-- invent their own arithmetic. Unpriced quotes store zeros: the UI and the
-- PDF replace those with "Pricing on application", they never print KES 0.00.
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

  select coalesce(sum(line_total), 0),
         (count(*) > 0 and bool_and(unit_price > 0))
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

create or replace function create_counter_quote(
  p_customer_name  text,
  p_customer_phone text,
  p_source         quote_source,
  p_items          jsonb,
  p_customer_email text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_quote_id uuid;
  v_reference text;
  v_items int;
  v_days int;
  v_item jsonb;
  v_ord int;
  v_product products%rowtype;
  v_qty numeric;
  v_price numeric;
  v_list numeric;
  v_desc text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_source not in ('walk_in', 'phone') then
    raise exception 'A counter quote is walk in or phone' using errcode = '22023';
  end if;
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

  select coalesce((value #>> '{}')::int, 30)
    into v_days
    from settings
   where key = 'quote_validity_days';
  if v_days is null or v_days < 1 then
    v_days := 30;
  end if;

  insert into quotes (
    customer_name, customer_phone, customer_email, source, status,
    created_by, assigned_to,
    valid_until
  ) values (
    btrim(p_customer_name),
    btrim(p_customer_phone),
    nullif(btrim(coalesce(p_customer_email, '')), ''),
    p_source,
    'reviewing',
    v_uid,
    v_uid,
    ((now() at time zone 'Africa/Nairobi')::date + v_days)
  )
  returning id, reference_number into v_quote_id, v_reference;

  v_ord := 0;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_ord := v_ord + 1;
    v_product := null;
    v_list := null;
    v_desc := nullif(btrim(coalesce(v_item->>'description', '')), '');

    if (v_item ? 'product_id') and nullif(v_item->>'product_id', '') is not null then
      select * into v_product
        from products
       where id = (v_item->>'product_id')::uuid
         and deleted_at is null;
      if not found then
        raise exception 'None of those products are available' using errcode = '22023';
      end if;
      v_desc := coalesce(v_desc, v_product.name);
      v_list := v_product.price;
      v_qty := round_quote_quantity(
        coalesce((v_item->>'quantity')::numeric, 1),
        v_product.unit
      );
      -- list_price is taken from the product, never from the request, so a
      -- crafted override is always measurable after the fact (D7).
      if v_item ? 'unit_price' and v_item->>'unit_price' is not null then
        v_price := greatest(0, (v_item->>'unit_price')::numeric);
      else
        v_price := coalesce(v_product.price, 0);
      end if;
    else
      if v_desc is null then
        raise exception 'Describe the item' using errcode = '22023';
      end if;
      v_qty := greatest(0.5, round(least(10000, coalesce((v_item->>'quantity')::numeric, 1)) * 2) / 2);
      v_price := greatest(0, coalesce((v_item->>'unit_price')::numeric, 0));
    end if;

    insert into quote_items (
      quote_id, product_id, description, quantity, list_price, unit_price, sort_order
    ) values (
      v_quote_id,
      v_product.id,
      v_desc,
      v_qty,
      v_list,
      v_price,
      v_ord - 1
    );
  end loop;

  get diagnostics v_items = row_count;
  if v_ord = 0 then
    raise exception 'A quote needs at least one item' using errcode = '22023';
  end if;

  perform refresh_quote_money(v_quote_id);
  return v_reference;
end;
$$;

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

create or replace function set_quote_status(
  p_quote_id uuid,
  p_status quote_status,
  p_lost_reason text,
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
  v_current quote_status;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_status = 'new' then
    raise exception 'A quote cannot move back to new' using errcode = '22023';
  end if;
  if p_status = 'lost' and coalesce(btrim(p_lost_reason), '') = '' then
    raise exception 'Say why this quote was lost' using errcode = '22023';
  end if;

  select assigned_to, updated_at, deleted_at, status
    into v_assigned, v_updated, v_deleted, v_current
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

  update quotes
     set status = p_status,
         lost_reason = case
           when p_status = 'lost' then btrim(p_lost_reason)
           else null
         end
   where id = p_quote_id;
end;
$$;

create or replace function approve_quote(
  p_quote_id uuid,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_updated timestamptz;
  v_deleted timestamptz;
  v_requires boolean;
begin
  if v_uid is null or not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select updated_at, deleted_at, requires_approval
    into v_updated, v_deleted, v_requires
    from quotes
   where id = p_quote_id
     for update;

  if not found or v_deleted is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = '40001';
  end if;
  if not v_requires then
    raise exception 'This quote does not need approval' using errcode = 'P0001';
  end if;

  update quotes
     set approved_by = v_uid,
         approved_at = now()
   where id = p_quote_id;
end;
$$;

create or replace function reissue_quote(
  p_quote_id uuid,
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
  v_days int;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select assigned_to, updated_at, deleted_at, status
    into v_assigned, v_updated, v_deleted, v_status
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
  if v_status in ('won', 'lost') then
    raise exception 'A closed quote cannot be reissued' using errcode = 'P0001';
  end if;

  select coalesce((value #>> '{}')::int, 30)
    into v_days
    from settings
   where key = 'quote_validity_days';
  if v_days is null or v_days < 1 then
    v_days := 30;
  end if;

  update quotes
     set valid_until = ((now() at time zone 'Africa/Nairobi')::date + v_days)
   where id = p_quote_id;
end;
$$;

revoke all on function round_quote_quantity(numeric, text) from public, anon;
revoke all on function refresh_quote_money(uuid) from public, anon;
revoke all on function create_counter_quote(text, text, quote_source, jsonb, text) from public, anon;
revoke all on function update_quote_line(uuid, uuid, numeric, numeric, timestamptz) from public, anon;
revoke all on function add_custom_quote_line(uuid, text, numeric, numeric, timestamptz) from public, anon;
revoke all on function add_catalogue_quote_line(uuid, uuid, numeric, numeric, timestamptz) from public, anon;
revoke all on function set_quote_status(uuid, quote_status, text, timestamptz) from public, anon;
revoke all on function approve_quote(uuid, timestamptz) from public, anon;
revoke all on function reissue_quote(uuid, timestamptz) from public, anon;

grant execute on function create_counter_quote(text, text, quote_source, jsonb, text) to authenticated;
grant execute on function update_quote_line(uuid, uuid, numeric, numeric, timestamptz) to authenticated;
grant execute on function add_custom_quote_line(uuid, text, numeric, numeric, timestamptz) to authenticated;
grant execute on function add_catalogue_quote_line(uuid, uuid, numeric, numeric, timestamptz) to authenticated;
grant execute on function set_quote_status(uuid, quote_status, text, timestamptz) to authenticated;
grant execute on function approve_quote(uuid, timestamptz) to authenticated;
grant execute on function reissue_quote(uuid, timestamptz) to authenticated;

-- Private PDF bucket. Staff read and write, anon nothing. Upsert needs
-- insert, select and update together or a regenerate silently fails.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf']::text[])
on conflict (id) do nothing;

drop policy if exists documents_storage_read_staff on storage.objects;
create policy documents_storage_read_staff on storage.objects for select
  using (bucket_id = 'documents' and public.current_user_role() is not null);

drop policy if exists documents_storage_insert_staff on storage.objects;
create policy documents_storage_insert_staff on storage.objects for insert
  with check (bucket_id = 'documents' and public.current_user_role() is not null);

drop policy if exists documents_storage_update_staff on storage.objects;
create policy documents_storage_update_staff on storage.objects for update
  using (bucket_id = 'documents' and public.current_user_role() is not null)
  with check (bucket_id = 'documents' and public.current_user_role() is not null);

-- A generate is an insert, a send is an update of sent_to/sent_at. Either
-- way the trail is on the documents row, not a memory.
drop trigger if exists documents_audit on documents;
create trigger documents_audit after insert or update or delete on documents
  for each row execute function audit_trigger();

notify pgrst, 'reload schema';


