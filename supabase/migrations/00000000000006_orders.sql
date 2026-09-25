-- Orders. Payments are OFFLINE, so this terminates in a record plus a
-- notification, never a checkout. See D1.

create table orders (
  id               uuid primary key default gen_random_uuid(),
  reference_number text not null unique default next_order_reference(),
  quote_id         uuid references quotes(id) on delete set null,
  customer_name    text not null,
  customer_phone   text not null,
  customer_email   text,
  source           quote_source not null default 'web',
  fulfilment       fulfilment,
  delivery_address text,
  notes            text,
  status           order_status   not null default 'pending',
  -- Two separate figures, because the dashboard genuinely knows one and not
  -- the other. Reports show invoiced and collected apart rather than
  -- pretending to know what was banked. See D8.
  payment_status   payment_status not null default 'unpaid',
  paid_at          timestamptz,
  subtotal         numeric(12,2) not null default 0,
  vat_amount       numeric(12,2) not null default 0,
  total_amount     numeric(12,2) not null default 0,
  created_by       uuid references users(id),
  salesperson_id   uuid references users(id),
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index orders_status_idx      on orders (status, created_at desc) where deleted_at is null;
create index orders_salesperson_idx on orders (salesperson_id, created_at desc) where deleted_at is null;

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  description text not null,
  quantity    numeric(12,2) not null check (quantity > 0),
  list_price  numeric(12,2),
  unit_price  numeric(12,2) not null default 0,
  line_total  numeric(12,2) generated always as (quantity * unit_price) stored,
  sort_order  int not null default 0
);

-- Circular reference, added after orders exists. A won quote converts in one
-- action and carries its line prices across UNCHANGED, so the order matches
-- the document the customer was actually sent.
alter table quotes add constraint quotes_converted_order_fk
  foreign key (converted_order_id) references orders(id) on delete set null;

-- paid_at and payment_status must agree.
alter table orders add constraint orders_paid_at_matches_status check (
  (payment_status = 'paid' and paid_at is not null) or
  (payment_status = 'unpaid' and paid_at is null)
);

alter table orders      enable row level security;
alter table order_items enable row level security;

create policy orders_insert_anon on orders for insert with check (true);
create policy order_items_insert_anon on order_items for insert with check (true);

create policy orders_read_staff on orders for select
  using (current_user_role() is not null and deleted_at is null);
create policy orders_update_own on orders for update
  using (current_user_role() = 'beco_sales' and salesperson_id = auth.uid())
  with check (current_user_role() = 'beco_sales' and salesperson_id = auth.uid());
create policy orders_write_admin on orders for all
  using (is_admin()) with check (is_admin());

create policy order_items_read_staff on order_items for select
  using (current_user_role() is not null);
create policy order_items_write_admin on order_items for all
  using (is_admin()) with check (is_admin());

create trigger orders_audit after insert or update or delete on orders
  for each row execute function audit_trigger();
