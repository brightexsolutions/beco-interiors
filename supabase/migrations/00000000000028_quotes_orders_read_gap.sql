-- Found while building the M5 quotes list: quotes_read_staff, quote_items_read_staff,
-- orders_read_staff and order_items_read_staff all used `current_user_role() is not
-- null`, which is true for EVERY active role, not just the ones that should reach
-- customer names, phone numbers and pricing. The role matrix in
-- docs/ARCHITECTURE.md section 12 has always said quotes and orders are `-` for
-- beco_product_manager and beco_editor; the policy just never matched it, and
-- nothing had read quotes or orders from either role to notice.
--
-- Tightened to the three roles that actually work with quotes and orders:
-- beco_sales, beco_admin, brightex_admin. Writes were never affected, since
-- quotes_update_own and quotes_write_admin already named their roles
-- explicitly; this is a read only fix.

drop policy quotes_read_staff on quotes;
create policy quotes_read_staff on quotes for select
  using (current_user_role() in ('beco_sales','beco_admin','brightex_admin') and deleted_at is null);

drop policy quote_items_read_staff on quote_items;
create policy quote_items_read_staff on quote_items for select
  using (current_user_role() in ('beco_sales','beco_admin','brightex_admin'));

drop policy orders_read_staff on orders;
create policy orders_read_staff on orders for select
  using (current_user_role() in ('beco_sales','beco_admin','brightex_admin') and deleted_at is null);

drop policy order_items_read_staff on order_items;
create policy order_items_read_staff on order_items for select
  using (current_user_role() in ('beco_sales','beco_admin','brightex_admin'));
