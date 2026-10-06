-- Close the open insert on orders and order_items.
--
-- Migration 6 created orders_insert_anon and order_items_insert_anon as
-- `for insert with check (true)` with no role named, so any role, the
-- anonymous web visitor included, could insert an order or an order line
-- directly with the site's public key. Found by the customers work on
-- 6 October 2026 and confirmed: a direct anonymous insert succeeded.
--
-- Nothing legitimate uses them. Every order is written by
-- convert_quote_to_order, a security definer function that runs as its owner
-- and is not subject to these policies; admins keep orders_write_admin. The
-- web visitor's only write path is submit_quote, for quotes, not orders.
-- Deny by default, per CLAUDE.md rule 7.

drop policy if exists orders_insert_anon on orders;
drop policy if exists order_items_insert_anon on order_items;
