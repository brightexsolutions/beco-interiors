-- Retire the first submit_quote, which migration 18 replaced but did not drop.
--
-- `create or replace function` cannot change a signature, so adding
-- p_wants_installation and p_wants_samples created a SECOND function rather
-- than replacing the first. Both were left granted to anon, so the public had
-- two entrances to the quote system: the current one, and the one that
-- silently discards the services a customer asked for.
--
-- It also made any short call ambiguous. `submit_quote(text, text, jsonb)`
-- matches both through their defaults and Postgres refuses to choose, so the
-- obvious three argument call fails with 42725. The storefront was unaffected
-- only because it happens to pass all thirteen arguments by name.
--
-- Dropped rather than left in place: an obsolete security definer function
-- that anon can execute is not harmless just because nothing calls it today.

drop function if exists submit_quote(
  text, text, jsonb, text, text, text, fulfilment, text, text, text, text
);
