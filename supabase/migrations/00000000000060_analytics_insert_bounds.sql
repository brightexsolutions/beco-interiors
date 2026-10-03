-- Anonymous analytics inserts are bounded (D108).
--
-- Migration 7 let anon insert any row into analytics_events, with check
-- (true), because the storefront was going to record its lead clicks there.
-- Nothing has written to it yet, GA4 took that role, and an open insert on a
-- public table is a free place to park garbage with the anon key. The policy
-- stays, since the lead counters in dashboard_summary() still read from here
-- and a future server-side writer will need it, but a row must now be one
-- of the event types docs/SCHEMA.md names, with a metadata payload small
-- enough to be one.

drop policy if exists analytics_insert_anon on analytics_events;
create policy analytics_insert_anon on analytics_events for insert
  with check (
    event_type in (
      'page_view', 'product_view', 'add_to_cart', 'quote_started', 'quote_submitted',
      'whatsapp_click', 'call_click', 'post_read', 'document_downloaded'
    )
    and pg_column_size(metadata) <= 2048
  );
