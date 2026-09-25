-- Stamp when a quote was decided, in the database rather than at a call site.
--
-- `finalized_at` has existed since migration 5 and nothing has ever written
-- it. The dashboard's "won this month" card dates a win by the moment the
-- outcome was recorded, not by when the quote was raised, because a quote
-- raised in August and won in September is September's win. That only works
-- if something reliably sets the column, and a trigger is the only place
-- that covers the dashboard, a future import, and anyone at a psql prompt
-- alike.
--
-- Also clears the stamp if a quote leaves won or lost, so a mistake that is
-- corrected does not leave a decision date behind claiming otherwise.

create or replace function stamp_quote_finalized() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status in ('won', 'lost') and old.status not in ('won', 'lost') then
    new.finalized_at := coalesce(new.finalized_at, now());
  elsif new.status not in ('won', 'lost') and old.status in ('won', 'lost') then
    new.finalized_at := null;
  end if;
  return new;
end;
$$;

-- BEFORE, so the value is written as part of the same row change and no
-- second UPDATE is needed. Ordering against quotes_touch_updated_at does not
-- matter: they touch different columns.
drop trigger if exists quotes_stamp_finalized on quotes;
create trigger quotes_stamp_finalized
  before update of status on quotes
  for each row execute function stamp_quote_finalized();
