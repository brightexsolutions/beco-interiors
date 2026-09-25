-- Realtime, on two tables only.
--
-- Not everything needs a live connection. Stock has one product manager,
-- reports are snapshots, the audit log is historical. A WebSocket on those
-- costs battery on a phone in a showroom and buys nothing.
--
-- These two do:
--   quotes  a new web quote is the whole business, and the site promises a
--           fast turnaround, so someone should know within seconds
--   orders  the same, plus payment status changing under a colleague
--
-- RLS still applies to realtime. A salesperson receives events only for rows
-- it could already read, so subscribing is not a way around a policy.

alter publication supabase_realtime add table quotes;
alter publication supabase_realtime add table orders;

-- Replica identity full, so an UPDATE payload carries the OLD row too.
-- Without it the client cannot tell that assigned_to just changed from null
-- to someone else, which is the exact event another salesperson needs.
alter table quotes replica identity full;
alter table orders replica identity full;
