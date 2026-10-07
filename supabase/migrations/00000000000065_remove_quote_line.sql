-- D131: a line can come off a quote, and the customer's request stays on file.
--
-- Brown, 6 October 2026: a customer who submitted items on the website
-- phoned back to drop one, and nobody could. Nothing in the database could
-- remove a quote line on any quote: update_quote_lines (migration 35) moves
-- quantity and price only, and the only delete path was the raw RLS policy
-- quote_items_write_owner, which no screen used and which writes no audit
-- row. This migration adds that operation and the record that keeps it
-- honest.
--
-- 1. quotes.requested_items: what the website form actually submitted,
--    written once by submit_quote and never changed after. A staff edit
--    (remove, quantity, an added item) is then always measurable against the
--    customer's own words, the same idea as list_price beside unit_price.
--    Read through the quote's own RLS, so every role that can read the quote
--    reads it; audit_log is admin only and could not have served a
--    salesperson.
--
-- 2. quote_items gets the audit trigger every other commercial table has had
--    since migration 3. Line edits were never logged. A removed line is a
--    hard delete (quote_items carries no deleted_at, and a soft deleted line
--    would have to be filtered out of every total, PDF and convert), so the
--    audit row's `before` is the full line: description, code, quantity,
--    list and unit price, and the quote it belonged to.
--
-- 3. remove_quote_line(): the same shape as update_quote_lines. Assigned
--    salesperson or an admin, the quote's lock (PT409 since migration 56, not
--    40001), refused on a deleted quote, a won quote ("A won quote is
--    closed", set_quote_status), a lost one (reopen first, reopen_quote) and
--    one that became an order. Never the last line: a quote with no items is
--    meaningless, mark it lost instead. Totals come from refresh_quote_money,
--    the one place the money maths lives.

-- ---------------------------------------------------------------------------
-- 1. The customer's request.

alter table quotes
  add column requested_items jsonb
    check (
      requested_items is null
      or (
        jsonb_typeof(requested_items) = 'object'
        and requested_items->>'source' in ('submission', 'backfill')
        and jsonb_typeof(requested_items->'lines') = 'array'
      )
    );

comment on column quotes.requested_items is
  'What the website form submitted: {source, at, lines: [{id, product_id, description, code, quantity}]}. '
  'Written once by submit_quote, never updated. source = backfill for web quotes that predate D131. D131.';

-- Web quotes already on file. Nothing recorded line edits before this
-- migration, so the best available record is the lines as they stand now.
-- Marked as a backfill, with the time, so the screen says "since 7 October"
-- rather than claiming these are the customer's own words. The lock trigger
-- is held off, as migration 64 did, so an open editor is not made stale.
alter table quotes disable trigger quotes_touch_updated_at;

update quotes q
   set requested_items = jsonb_build_object(
         'source', 'backfill',
         'at', now(),
         'lines', coalesce((
           select jsonb_agg(
                    jsonb_build_object(
                      'id', qi.id,
                      'product_id', qi.product_id,
                      'description', qi.description,
                      'code', qi.code,
                      'quantity', qi.quantity
                    )
                    order by qi.sort_order, qi.id
                  )
             from quote_items qi
            where qi.quote_id = q.id
         ), '[]'::jsonb)
       )
 where q.source = 'web'
   and q.requested_items is null;

alter table quotes enable trigger quotes_touch_updated_at;

-- Once written, never changed, by any role including an admin. A record of
-- what the customer asked for that staff can edit is not a record.
create or replace function keep_quote_requested_items() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.requested_items is distinct from old.requested_items then
    raise exception 'The customer''s request is kept as submitted' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function keep_quote_requested_items() from public, anon;

create trigger quotes_keep_requested_items
  before update of requested_items on quotes
  for each row execute function keep_quote_requested_items();

-- ---------------------------------------------------------------------------
-- 2. Line edits are audited, like every other commercial write.

create trigger quote_items_audit
  after insert or update or delete on quote_items
  for each row execute function audit_trigger();

-- ---------------------------------------------------------------------------
-- submit_quote: signature unchanged, body restated from migration 64. The
-- lines are worked out once, before the quote row, so the snapshot and the
-- inserted lines are the same rows with the same ids, and the quote is born
-- with its request rather than updated to carry one (the guard above would
-- refuse that). The code is copied from the product exactly as
-- line_code_from_product() does (D124).

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
  v_quote_id    uuid;
  v_reference   text;
  v_customer_id uuid;
  v_lines       jsonb;
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

  select coalesce(jsonb_agg(to_jsonb(picked) order by picked.sort_order), '[]'::jsonb)
    into v_lines
    from (
      select gen_random_uuid() as id,
             p.id as product_id,
             p.name as description,
             left(nullif(btrim(p.sku), ''), 80) as code,
             (case
               when p.unit = 'per slab' then
                 greatest(0.5, round(least(10000, (item->>'quantity')::numeric) * 2) / 2)
               else
                 greatest(1, round(least(10000, (item->>'quantity')::numeric)))
             end)::numeric(12,2) as quantity,
             p.price as list_price,
             (ord - 1)::int as sort_order
        from jsonb_array_elements(p_items) with ordinality as t(item, ord)
        join products p
          on p.slug = item->>'slug' and p.is_published and p.deleted_at is null
    ) as picked;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'None of those products are available' using errcode = '22023';
  end if;

  v_customer_id := customer_for_phone(
    p_customer_name, p_customer_phone, p_customer_email, p_company, p_delivery_address
  );

  insert into quotes (
    customer_name, customer_phone, customer_email, company, project_type,
    fulfilment, delivery_address, timeline, budget_note, project_details, source,
    wants_installation, wants_samples, customer_id, requested_items
  ) values (
    btrim(p_customer_name), btrim(p_customer_phone), nullif(btrim(coalesce(p_customer_email,'')),''),
    nullif(btrim(coalesce(p_company,'')),''), nullif(btrim(coalesce(p_project_type,'')),''),
    p_fulfilment, nullif(btrim(coalesce(p_delivery_address,'')),''),
    nullif(btrim(coalesce(p_timeline,'')),''), nullif(btrim(coalesce(p_budget_note,'')),''),
    nullif(btrim(coalesce(p_project_details,'')),''), 'web',
    coalesce(p_wants_installation, false), coalesce(p_wants_samples, false),
    v_customer_id,
    jsonb_build_object(
      'source', 'submission',
      'at', now(),
      'lines', (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', l->'id',
                   'product_id', l->'product_id',
                   'description', l->'description',
                   'code', l->'code',
                   'quantity', l->'quantity'
                 )
                 order by (l->>'sort_order')::int
               )
          from jsonb_array_elements(v_lines) as l
      )
    )
  )
  returning id, reference_number into v_quote_id, v_reference;

  insert into quote_items (id, quote_id, product_id, description, code, quantity, list_price, sort_order)
  select x.id, v_quote_id, x.product_id, x.description, x.code, x.quantity, x.list_price, x.sort_order
    from jsonb_to_recordset(v_lines) as x(
      id uuid, product_id uuid, description text, code text,
      quantity numeric, list_price numeric, sort_order int
    );

  return v_reference;
end;
$$;

revoke all on function submit_quote(text, text, jsonb, text, text, text, fulfilment, text, text, text, text, boolean, boolean) from public;
grant execute on function submit_quote(text, text, jsonb, text, text, text, fulfilment, text, text, text, text, boolean, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Remove a line.

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
  if v_order is not null then
    raise exception 'This quote is already an order. Its items are fixed.' using errcode = 'P0001';
  end if;
  if v_status = 'won' then
    raise exception 'A won quote is closed' using errcode = 'P0001';
  end if;
  if v_status = 'lost' then
    raise exception 'Reopen this quote to change its items' using errcode = 'P0001';
  end if;

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
