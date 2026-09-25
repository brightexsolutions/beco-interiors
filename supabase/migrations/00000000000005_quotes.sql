-- Quotes and quote items. This is the product.

create table quotes (
  id               uuid primary key default gen_random_uuid(),
  reference_number text not null unique default next_quote_reference(),
  customer_name    text not null,
  customer_phone   text not null,
  customer_email   text,
  company          text,
  project_type     text,
  fulfilment       fulfilment,
  delivery_address text,
  timeline         text,
  budget_note      text,
  project_details  text,
  source           quote_source not null default 'web',
  status           quote_status  not null default 'new',
  -- NULL for web submissions. A web quote arrives unowned and is claimed
  -- or assigned. A counter quote is owned by whoever raised it.
  created_by       uuid references users(id),
  assigned_to      uuid references users(id),
  subtotal         numeric(12,2) not null default 0,
  vat_amount       numeric(12,2) not null default 0,
  total_amount     numeric(12,2) not null default 0,
  currency         text not null default 'KES',
  valid_until      date,
  finalized_at     timestamptz,
  lost_reason      text,
  converted_order_id uuid,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  -- Optimistic locking. Compared on save and refused if stale, so two
  -- salespeople cannot silently overwrite each other. See REVIEW 2.2.
  updated_at       timestamptz not null default now()
);

create index quotes_status_idx   on quotes (status, created_at desc) where deleted_at is null;
create index quotes_assigned_idx on quotes (assigned_to, created_at desc) where deleted_at is null;

create table quote_items (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references quotes(id) on delete cascade,
  -- NULLABLE on purpose: a salesperson adds an item not yet in the catalog
  -- rather than being blocked at the counter with a customer waiting.
  product_id  uuid references products(id) on delete set null,
  description text not null,
  quantity    numeric(12,2) not null check (quantity > 0),
  -- What it should have cost, beside what it did. Keeping both is what makes
  -- D7's free price override safe without an approval gate: every discount
  -- is measurable after the fact.
  list_price  numeric(12,2),
  -- Stored on the LINE, never read live from products, so a quote issued last
  -- week does not silently reprice when someone edits a product today.
  unit_price  numeric(12,2) not null default 0,
  line_total  numeric(12,2) generated always as (quantity * unit_price) stored,
  notes       text,
  sort_order  int not null default 0
);

create index quote_items_quote_idx on quote_items (quote_id, sort_order);

alter table quotes      enable row level security;
alter table quote_items enable row level security;

-- Anonymous may INSERT only, through a rate limited server action.
-- It can never read a quote back, including its own.
create policy quotes_insert_anon on quotes for insert with check (true);
create policy quote_items_insert_anon on quote_items for insert with check (true);

create policy quotes_read_staff on quotes for select
  using (current_user_role() is not null and deleted_at is null);
create policy quotes_read_deleted_admin on quotes for select using (is_admin());

-- Sales writes only its OWN quotes. Reassignment is an admin action and is
-- itself audited.
create policy quotes_update_own on quotes for update
  using (current_user_role() = 'beco_sales' and assigned_to = auth.uid())
  with check (current_user_role() = 'beco_sales' and assigned_to = auth.uid());
create policy quotes_write_admin on quotes for all
  using (is_admin()) with check (is_admin());

create policy quote_items_read_staff on quote_items for select
  using (current_user_role() is not null);
create policy quote_items_write_owner on quote_items for all
  using (exists (
    select 1 from quotes q where q.id = quote_id
      and (is_admin() or (current_user_role() = 'beco_sales' and q.assigned_to = auth.uid()))
  ))
  with check (exists (
    select 1 from quotes q where q.id = quote_id
      and (is_admin() or (current_user_role() = 'beco_sales' and q.assigned_to = auth.uid()))
  ));

create trigger quotes_audit after insert or update or delete on quotes
  for each row execute function audit_trigger();
