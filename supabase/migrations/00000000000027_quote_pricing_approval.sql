-- D86: a quote priced off the catalogue never waits. One deviates from it,
-- someone signs off before it can go out.
--
-- Reverses D7's "no approval gate" for the specific case it did not
-- anticipate: Beco wants ONE person tracking every salesperson's discounts
-- and custom lines before a quote is finalized, while a straight catalogue
-- quote keeps the speed the counter flow and the 12 tap budget depend on.
-- `list_price` beside `unit_price` already made every discount measurable
-- after the fact (D7's own reasoning); this migration is what actually
-- gates on it rather than only recording it.

alter table quotes
  add column requires_approval boolean not null default false,
  add column approved_by       uuid references users(id),
  add column approved_at       timestamptz;

-- A quote cannot be finalized while it deviates from the catalogue and
-- nobody has signed off. Checked at the database, not only in RLS or the
-- UI, so this holds even if both of those are bypassed.
alter table quotes add constraint quotes_finalized_requires_approval
  check (status not in ('quoted','won','lost') or not requires_approval or approved_at is not null);

-- Recomputes requires_approval from the CURRENT line set on every
-- quote_items change, and clears any existing approval: an approval is a
-- signature on a specific set of lines and prices, and it does not survive
-- an edit made after it. `unit_price > 0` excludes an unpriced line (0.3's
-- "Pricing on application" state, which is not a pricing DECISION yet, so it
-- is not one that needs approving) from tripping the gate before a
-- salesperson has actually priced anything.
create or replace function sync_quote_approval() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_id uuid := coalesce(new.quote_id, old.quote_id);
  v_requires boolean;
begin
  select exists (
    select 1 from quote_items
     where quote_id = v_quote_id
       and unit_price > 0
       and (product_id is null or unit_price is distinct from list_price)
  ) into v_requires;

  update quotes
     set requires_approval = v_requires,
         approved_by = null,
         approved_at = null
   where id = v_quote_id
     and (requires_approval is distinct from v_requires or approved_at is not null);

  return coalesce(new, old);
end;
$$;

create trigger quote_items_sync_approval
  after insert or update or delete on quote_items
  for each row execute function sync_quote_approval();

-- A beco_sales self-update may not move any of the three approval columns:
-- they exist specifically so a discount cannot approve itself. Only
-- is_admin() (quotes_write_admin) or the trigger above (definer, bypasses
-- RLS) may. Same subquery-pins-the-column idiom as users_update_self_safe.
drop policy quotes_update_own on quotes;
create policy quotes_update_own on quotes for update
  using (current_user_role() = 'beco_sales' and assigned_to = auth.uid())
  with check (
    current_user_role() = 'beco_sales'
    and assigned_to = auth.uid()
    and requires_approval is not distinct from (select requires_approval from quotes q2 where q2.id = quotes.id)
    and approved_by       is not distinct from (select approved_by       from quotes q2 where q2.id = quotes.id)
    and approved_at       is not distinct from (select approved_at       from quotes q2 where q2.id = quotes.id)
  );
