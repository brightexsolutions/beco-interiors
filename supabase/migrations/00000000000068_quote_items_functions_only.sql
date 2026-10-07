-- Quote lines change only through the line functions.
--
-- quote_items_write_owner (migration 5) let the assigned salesperson or an
-- admin insert, update or delete quote lines directly through the API, for
-- all, whatever the quote's status. That bypassed every rule the line
-- functions enforce: the won, lost and converted lock (D132, migration 67),
-- the optimistic lock, the half slab rounding, refresh_quote_money and the
-- approval reset (D86). No screen used it: the dashboard only reads
-- quote_items directly, and every write goes through update_quote_lines,
-- update_quote_line, add_custom_quote_line, add_catalogue_quote_line(s),
-- remove_quote_line and submit_quote, all security definer, which run as
-- their owner and are not subject to this policy.
--
-- Reading is unchanged (quote_items_read_staff). Deny by default for writes.

drop policy if exists quote_items_write_owner on quote_items;
