-- Lifecycle dates a salesperson can read on the quote: reviewed, quoted,
-- won, lost, reopened. These persist after reopen. finalized_at still
-- dates the current decision for monthly conversion; it clears when a
-- lost quote comes back. lost_at does not.

alter table quotes
  add column reviewing_at timestamptz,
  add column quoted_at    timestamptz,
  add column won_at       timestamptz,
  add column lost_at      timestamptz,
  add column reopened_at  timestamptz;

create or replace function stamp_quote_milestones() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'reviewing' then
      new.reviewing_at := coalesce(new.reviewing_at, now());
    elsif new.status = 'quoted' then
      new.reviewing_at := coalesce(new.reviewing_at, now());
      new.quoted_at := coalesce(new.quoted_at, now());
    elsif new.status = 'won' then
      new.won_at := coalesce(new.won_at, now());
    elsif new.status = 'lost' then
      new.lost_at := coalesce(new.lost_at, now());
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'reviewing' then
    new.reviewing_at := coalesce(new.reviewing_at, now());
    if old.status = 'lost' then
      new.reopened_at := now();
    end if;
  elsif new.status = 'quoted' then
    new.reviewing_at := coalesce(new.reviewing_at, now());
    new.quoted_at := now();
  elsif new.status = 'won' then
    new.reviewing_at := coalesce(new.reviewing_at, now());
    new.quoted_at := coalesce(new.quoted_at, now());
    new.won_at := now();
  elsif new.status = 'lost' then
    new.lost_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists quotes_stamp_milestones on quotes;
create trigger quotes_stamp_milestones
  before insert or update of status on quotes
  for each row execute function stamp_quote_milestones();

-- Existing rows: first-touch approximations so the Dates rail is not blank
-- on quotes raised before this stamp existed.
update quotes
   set reviewing_at = created_at
 where status is distinct from 'new'
   and reviewing_at is null;

update quotes
   set quoted_at = coalesce(finalized_at, updated_at)
 where status in ('quoted', 'won')
   and quoted_at is null;

update quotes
   set won_at = finalized_at
 where status = 'won'
   and won_at is null
   and finalized_at is not null;

update quotes
   set lost_at = finalized_at
 where status = 'lost'
   and lost_at is null
   and finalized_at is not null;
