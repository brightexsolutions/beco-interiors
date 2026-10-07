-- D130: Beco keeps a real record of its clientele.
--
-- docs/REVIEW.md 2.6 named "no customer entity" as a deliberate simplification
-- for the four week build: a returning customer was inferred from earlier
-- quotes sharing a phone number (apps/dashboard/src/lib/customer-search.ts).
-- On 6 October 2026 Brown asked for a real client record, so this migration
-- adds one.
--
-- One person is one record. The phone number is the one field the counter
-- and the website both require, so it is the identity: `phone_key` is its
-- national part, 0722..., +254722... and 254722... all reducing to 722...,
-- the same rule as `phoneKey` in customer-search.ts, and it is unique among
-- records that are not soft deleted.
--
-- A quote and an order point at their customer through `customer_id`, and
-- still snapshot the name, phone and email they were raised with. A quote is
-- a historical document: editing a customer later never rewrites an issued
-- quote, the same principle as D124's line code.
--
-- Who may do what:
--   read            every active Beco operations role plus brightex_admin
--                   (beco_sales, beco_product_manager, beco_admin,
--                   brightex_admin). Brown chose that all staff see the list.
--                   beco_editor has no operations screen and reads nothing.
--   create, update  the roles that raise quotes: beco_sales and the admins
--   soft delete     admins only, by setting deleted_at
--   hard delete     nobody
--   anon            nothing directly. A web quote links or creates a customer
--                   only inside submit_quote, which never changes an
--                   existing customer's details.

-- ---------------------------------------------------------------------------
-- The type of client, as Beco describes its trade.

create type client_type as enum (
  'homeowner', 'contractor', 'designer', 'developer', 'business', 'other'
);

-- ---------------------------------------------------------------------------
-- The phone key. Immutable, so it can drive a generated column.
--
-- Digits only; a leading 254 or 0 is dropped. A number with no digits at all
-- keys on its trimmed text, as customer-search.ts did, so it still dedupes
-- against itself rather than collapsing every such number into one key.

create or replace function customer_phone_key(p_phone text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(
    nullif(
      case
        when d like '254%' then substr(d, 4)
        when d like '0%' then substr(d, 2)
        else d
      end,
      ''
    ),
    nullif(btrim(coalesce(p_phone, '')), '')
  )
  from (select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as d) s;
$$;

comment on function customer_phone_key(text) is
  'The national part of a phone number, so 0722.., +254722.. and 254722.. are one customer. D130.';

-- ---------------------------------------------------------------------------
-- The table.

create table customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 120),
  phone       text not null check (length(btrim(phone)) between 1 and 60),
  phone_key   text generated always as (customer_phone_key(phone)) stored,
  email       text check (
                email is null
                or (length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+$')
              ),
  company     text check (company is null or length(company) <= 160),
  -- A letter, nine digits, a letter: A123456789Z. The same shape the
  -- business's own PIN is held to on the Business settings tab (D102).
  kra_pin     text check (kra_pin is null or kra_pin ~ '^[A-Z][0-9]{9}[A-Z]$'),
  location    text check (location is null or length(location) <= 300),
  client_type client_type,
  notes       text check (notes is null or length(notes) <= 4000),
  created_by  uuid references users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint customers_phone_key_present check (phone_key is not null)
);

comment on table customers is 'One record per client, keyed by phone. D130.';
comment on column customers.phone is 'As entered. phone_key is the identity.';
comment on column customers.notes is 'Staff only. Never printed or emailed.';

-- One person, one live record. A soft deleted record releases its number,
-- so the same phone can be added again without resurrecting the old row.
create unique index customers_phone_key_live_idx
  on customers (phone_key) where deleted_at is null;
create index customers_name_idx on customers (lower(name)) where deleted_at is null;

create trigger customers_touch_updated_at
  before update on customers
  for each row execute function touch_updated_at();

create trigger customers_audit
  after insert or update or delete on customers
  for each row execute function audit_trigger();

alter table customers enable row level security;

-- Reads: every operations role. A soft deleted record is invisible except to
-- an admin, the same pair of policies quotes carries.
create policy customers_read_staff on customers for select
  using (
    current_user_role() in ('beco_sales', 'beco_product_manager', 'beco_admin', 'brightex_admin')
    and deleted_at is null
  );
create policy customers_read_deleted_admin on customers for select
  using (is_admin());

-- Create: the roles that raise quotes, as themselves, live.
create policy customers_insert_staff on customers for insert
  with check (
    current_user_role() in ('beco_sales', 'beco_admin', 'brightex_admin')
    and created_by = auth.uid()
    and deleted_at is null
  );

-- Update by sales: a live record stays live, and who created it does not
-- move. Soft delete is the admin policy below.
create policy customers_update_sales on customers for update
  using (current_user_role() = 'beco_sales' and deleted_at is null)
  with check (
    current_user_role() = 'beco_sales'
    and deleted_at is null
    and created_by is not distinct from (select c2.created_by from customers c2 where c2.id = customers.id)
    and created_at = (select c2.created_at from customers c2 where c2.id = customers.id)
  );

-- Admins update anything, including deleted_at (soft delete and restore).
create policy customers_write_admin on customers for update
  using (is_admin())
  with check (
    is_admin()
    and created_by is not distinct from (select c2.created_by from customers c2 where c2.id = customers.id)
  );

-- No delete policy: a customer is never hard deleted, because quotes and
-- orders point at it. Revoked as well, so the refusal is loud.
revoke all on customers from anon;
revoke delete, truncate on customers from authenticated;

-- ---------------------------------------------------------------------------
-- Quotes and orders point at their customer.

alter table quotes add column customer_id uuid references customers(id);
alter table orders add column customer_id uuid references customers(id);
create index quotes_customer_idx on quotes (customer_id) where customer_id is not null;
create index orders_customer_idx on orders (customer_id) where customer_id is not null;

comment on column quotes.customer_id is
  'The client record. Name, phone and email stay snapshotted on the quote. D130.';
comment on column orders.customer_id is
  'Copied from the quote on conversion. D130.';

-- No direct order insert needs guarding here: migration 64 dropped the open
-- orders_insert_anon policy, so only convert_quote_to_order (security
-- definer) and admins (orders_write_admin) write orders. A direct insert
-- carrying a customer is refused with every other direct insert.

-- ---------------------------------------------------------------------------
-- The customer overview: one row per live customer with what the list
-- shows. security_invoker, so quotes and orders RLS decide what each role
-- counts: a product manager, who cannot read quotes or orders (D87), sees
-- the customer with zero of each rather than someone else's revenue.
--
-- Spent is the VAT inclusive total of orders that are not cancelled.
-- Last activity is the newest of the record's creation, its quotes and its
-- orders; an edit to the record's details is not activity.

create view customer_overview
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.phone,
  c.phone_key,
  c.email,
  c.company,
  c.kra_pin,
  c.location,
  c.client_type,
  c.created_at,
  c.updated_at,
  coalesce(q.quote_count, 0) as quote_count,
  coalesce(o.order_count, 0) as order_count,
  coalesce(o.total_spent, 0)::numeric(14,2) as total_spent,
  greatest(c.created_at, q.last_quote_at, o.last_order_at) as last_activity_at
from customers c
left join lateral (
  select count(*)::int as quote_count, max(qq.created_at) as last_quote_at
    from quotes qq
   where qq.customer_id = c.id and qq.deleted_at is null
) q on true
left join lateral (
  select count(*)::int as order_count,
         sum(oo.total_amount) filter (where oo.status <> 'cancelled') as total_spent,
         max(oo.created_at) as last_order_at
    from orders oo
   where oo.customer_id = c.id and oo.deleted_at is null
) o on true
where c.deleted_at is null;

revoke all on customer_overview from anon, public;
grant select on customer_overview to authenticated;

-- ---------------------------------------------------------------------------
-- Link or create, used by both quote paths. Never updates an existing
-- record: a web visitor typing a known number must not be able to rename
-- that customer, and a salesperson changing details does it on the
-- customer's own page, where it is audited as an edit.

create or replace function customer_for_phone(
  p_name text,
  p_phone text,
  p_email text default null,
  p_company text default null,
  p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := customer_phone_key(p_phone);
  v_id uuid;
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
begin
  if v_key is null then
    return null;
  end if;

  select id into v_id from customers where phone_key = v_key and deleted_at is null;
  if found then
    return v_id;
  end if;

  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$') then
    v_email := null;
  end if;

  insert into customers (name, phone, email, company, location, created_by)
  values (
    left(btrim(p_name), 120),
    left(btrim(p_phone), 60),
    v_email,
    left(nullif(btrim(coalesce(p_company, '')), ''), 160),
    left(nullif(btrim(coalesce(p_location, '')), ''), 300),
    -- auth.uid() is null for a web visitor; a staff caller is recorded.
    (select u.id from users u where u.id = auth.uid())
  )
  on conflict (phone_key) where deleted_at is null do nothing
  returning id into v_id;

  -- Two submissions with one number in the same instant: the second finds
  -- the row the first wrote.
  if v_id is null then
    select id into v_id from customers where phone_key = v_key and deleted_at is null;
  end if;
  return v_id;
end;
$$;

revoke all on function customer_for_phone(text, text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The backfill. One customer per distinct phone key among live quotes that
-- carry no customer yet, merged exactly as customer-search.ts merged them:
-- the newest quote's name and phone win, and an email or company given on an
-- older quote fills a gap on a newer one. Then every quote and order that
-- matches a live customer's key is linked. Idempotent, so the pgTAP test can
-- run it over fixtures. Values that would break a check on the new table
-- (an over long company, a malformed email) are trimmed or dropped rather
-- than failing the migration.

create or replace function backfill_customers()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_created int;
begin
  with q as (
    select customer_phone_key(customer_phone) as k,
           customer_name,
           customer_phone,
           case
             when nullif(btrim(coalesce(customer_email, '')), '') ~ '^[^@[:space:]]+@[^@[:space:]]+$'
                  and length(btrim(customer_email)) <= 254
             then btrim(customer_email)
           end as email,
           nullif(btrim(coalesce(company, '')), '') as company,
           created_at
      from quotes
     where deleted_at is null
       and customer_id is null
       and nullif(btrim(coalesce(customer_name, '')), '') is not null
  ),
  merged as (
    select k,
           (array_agg(customer_name order by created_at desc))[1] as name,
           (array_agg(customer_phone order by created_at desc))[1] as phone,
           (array_agg(email order by created_at desc) filter (where email is not null))[1] as email,
           (array_agg(company order by created_at desc) filter (where company is not null))[1] as company,
           min(created_at) as first_at
      from q
     where k is not null
     group by k
  )
  insert into customers (name, phone, email, company, created_at, updated_at)
  select left(btrim(m.name), 120), left(btrim(m.phone), 60), m.email, left(m.company, 160), m.first_at, m.first_at
    from merged m
   where not exists (
     select 1 from customers c where c.phone_key = m.k and c.deleted_at is null
   );
  get diagnostics v_created = row_count;

  update quotes qt
     set customer_id = c.id
    from customers c
   where qt.customer_id is null
     and c.deleted_at is null
     and c.phone_key = customer_phone_key(qt.customer_phone);

  update orders o
     set customer_id = qt.customer_id
    from quotes qt
   where o.quote_id = qt.id
     and o.customer_id is null
     and qt.customer_id is not null;

  update orders o
     set customer_id = c.id
    from customers c
   where o.customer_id is null
     and c.deleted_at is null
     and c.phone_key = customer_phone_key(o.customer_phone);

  return v_created;
end;
$$;

revoke all on function backfill_customers() from public, anon, authenticated;

-- Linking is not an edit: it must not bump the optimistic lock on every
-- open quote, or every salesperson with a quote on screen would hit a stale
-- edit refusal once for nothing. The audit trigger still records each link.
alter table quotes disable trigger quotes_touch_updated_at;
alter table orders disable trigger orders_touch_updated_at;
select backfill_customers();
alter table quotes enable trigger quotes_touch_updated_at;
alter table orders enable trigger orders_touch_updated_at;

-- ---------------------------------------------------------------------------
-- submit_quote: the web form links to the customer by phone, or creates one.
-- Signature unchanged, body restated from migration 23 with the link added.
-- An existing customer is only linked, never updated.

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
  v_items       int;
  v_customer_id uuid;
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

  v_customer_id := customer_for_phone(
    p_customer_name, p_customer_phone, p_customer_email, p_company, p_delivery_address
  );

  insert into quotes (
    customer_name, customer_phone, customer_email, company, project_type,
    fulfilment, delivery_address, timeline, budget_note, project_details, source,
    wants_installation, wants_samples, customer_id
  ) values (
    btrim(p_customer_name), btrim(p_customer_phone), nullif(btrim(coalesce(p_customer_email,'')),''),
    nullif(btrim(coalesce(p_company,'')),''), nullif(btrim(coalesce(p_project_type,'')),''),
    p_fulfilment, nullif(btrim(coalesce(p_delivery_address,'')),''),
    nullif(btrim(coalesce(p_timeline,'')),''), nullif(btrim(coalesce(p_budget_note,'')),''),
    nullif(btrim(coalesce(p_project_details,'')),''), 'web',
    coalesce(p_wants_installation, false), coalesce(p_wants_samples, false),
    v_customer_id
  )
  returning id, reference_number into v_quote_id, v_reference;

  insert into quote_items (quote_id, product_id, description, quantity, list_price, sort_order)
  select v_quote_id, p.id, p.name,
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

-- ---------------------------------------------------------------------------
-- create_counter_quote gains p_customer_id. A signature change, so the old
-- function is dropped rather than replaced (migration 21's lesson).
--
-- With a customer: the quote snapshots that record's name, phone, email and
-- company, read here rather than trusted from the form. Without one: the
-- typed details are snapshotted and the quote links to the customer with
-- that number, or a new one is created, as on the web.

drop function create_counter_quote(text, text, quote_source, jsonb, text);

create function create_counter_quote(
  p_customer_name  text,
  p_customer_phone text,
  p_source         quote_source,
  p_items          jsonb,
  p_customer_email text default null,
  p_customer_id    uuid default null
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
  v_customer customers%rowtype;
  v_name text;
  v_phone text;
  v_email text;
  v_company text;
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

  if p_customer_id is not null then
    select * into v_customer from customers where id = p_customer_id and deleted_at is null;
    if not found then
      raise exception 'That customer is no longer on file' using errcode = 'P0002';
    end if;
    v_name := v_customer.name;
    v_phone := v_customer.phone;
    v_email := v_customer.email;
    v_company := v_customer.company;
  else
    if coalesce(btrim(p_customer_name), '') = '' then
      raise exception 'A name is required' using errcode = '22023';
    end if;
    if coalesce(btrim(p_customer_phone), '') = '' then
      raise exception 'A phone number is required' using errcode = '22023';
    end if;
    v_name := btrim(p_customer_name);
    v_phone := btrim(p_customer_phone);
    v_email := nullif(btrim(coalesce(p_customer_email, '')), '');
    v_customer.id := customer_for_phone(v_name, v_phone, v_email);
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
    customer_name, customer_phone, customer_email, company, source, status,
    created_by, assigned_to, valid_until, customer_id
  ) values (
    v_name,
    v_phone,
    v_email,
    v_company,
    p_source,
    'reviewing',
    v_uid,
    v_uid,
    ((now() at time zone 'Africa/Nairobi')::date + v_days),
    v_customer.id
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

revoke all on function create_counter_quote(text, text, quote_source, jsonb, text, uuid) from public, anon;
grant execute on function create_counter_quote(text, text, quote_source, jsonb, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Link a quote, and the order it became, to a customer. Same gate as every
-- other quote mutation: the owner or an admin, under the optimistic lock.
-- The quote's snapshot of name, phone and email does not change: the
-- document says what it said when it was issued.

create or replace function link_quote_customer(
  p_quote_id uuid,
  p_customer_id uuid,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_quote quotes%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_quote from quotes where id = p_quote_id for update;
  if not found or v_quote.deleted_at is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_quote.updated_at is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = 'PT409';
  end if;
  if not is_admin() and v_quote.assigned_to is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from customers where id = p_customer_id and deleted_at is null) then
    raise exception 'That customer is no longer on file' using errcode = 'P0002';
  end if;

  update quotes set customer_id = p_customer_id where id = p_quote_id;
  update orders set customer_id = p_customer_id
   where quote_id = p_quote_id and deleted_at is null;
end;
$$;

revoke all on function link_quote_customer(uuid, uuid, timestamptz) from public, anon;
grant execute on function link_quote_customer(uuid, uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- convert_quote_to_order copies customer_id. Restated from migration 62.

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
    subtotal, vat_amount, total_amount, created_by, salesperson_id, customer_id
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
    v_owner,
    v_quote.customer_id
  )
  returning id, reference_number into v_order_id, v_reference;

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

revoke all on function convert_quote_to_order(uuid, timestamptz) from public;
grant execute on function convert_quote_to_order(uuid, timestamptz) to authenticated;
