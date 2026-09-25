-- Claim, assign, and a real optimistic lock on quotes.
--
-- Sales cannot UPDATE an unassigned quote: quotes_update_own requires
-- assigned_to = auth.uid() both before and after the write. Claiming is
-- therefore a security definer RPC, the same shape as submit_quote, with
-- the lock token compared inside the function so two people tapping Claim
-- on the same web quote cannot both succeed.
--
-- Reassignment stays an admin action (M5 0 / ARCHITECTURE section 4). The
-- RPC writes audit_action 'assign' so the trail is filterable; the ordinary
-- quotes_audit trigger still records the row change as 'update'.

create or replace function touch_updated_at() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists quotes_touch_updated_at on quotes;
create trigger quotes_touch_updated_at
  before update on quotes
  for each row execute function touch_updated_at();

-- Line edits must bump the parent lock too, otherwise two people can edit
-- different lines without colliding. Always write, including when the
-- approval flag does not change: a second discount on an already-gated
-- quote is still a change. Clearing approval still happens whenever the
-- lines change after a signature, which is D86.
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
         approved_by = case
           when approved_at is not null or requires_approval is distinct from v_requires then null
           else approved_by
         end,
         approved_at = case
           when approved_at is not null or requires_approval is distinct from v_requires then null
           else approved_at
         end
   where id = v_quote_id;

  return coalesce(new, old);
end;
$$;

create or replace function claim_quote(p_quote_id uuid, p_expected_updated_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_assigned uuid;
  v_updated timestamptz;
  v_deleted timestamptz;
  v_status quote_status;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select assigned_to, updated_at, deleted_at, status
    into v_assigned, v_updated, v_deleted, v_status
    from quotes
   where id = p_quote_id
     for update;

  if not found or v_deleted is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = '40001';
  end if;
  if v_assigned is not null then
    raise exception 'This quote is already assigned' using errcode = 'P0001';
  end if;

  update quotes
     set assigned_to = v_uid,
         status = case when v_status = 'new' then 'reviewing'::quote_status else v_status end
   where id = p_quote_id;

  insert into audit_log (user_id, action, entity_type, entity_id, before, after)
  values (
    v_uid,
    'assign',
    'quotes',
    p_quote_id,
    jsonb_build_object('assigned_to', null),
    jsonb_build_object('assigned_to', v_uid)
  );
end;
$$;

create or replace function assign_quote(
  p_quote_id uuid,
  p_assignee_id uuid,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_assigned uuid;
  v_updated timestamptz;
  v_deleted timestamptz;
  v_status quote_status;
  v_assignee_ok boolean;
begin
  if v_uid is null or not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select exists (
    select 1 from users
     where id = p_assignee_id
       and is_active
       and role in ('beco_sales', 'beco_admin', 'brightex_admin')
  ) into v_assignee_ok;
  if not v_assignee_ok then
    raise exception 'That account cannot own a quote' using errcode = '22023';
  end if;

  select assigned_to, updated_at, deleted_at, status
    into v_assigned, v_updated, v_deleted, v_status
    from quotes
   where id = p_quote_id
     for update;

  if not found or v_deleted is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = '40001';
  end if;

  update quotes
     set assigned_to = p_assignee_id,
         status = case when v_status = 'new' then 'reviewing'::quote_status else v_status end
   where id = p_quote_id;

  insert into audit_log (user_id, action, entity_type, entity_id, before, after)
  values (
    v_uid,
    'assign',
    'quotes',
    p_quote_id,
    jsonb_build_object('assigned_to', v_assigned),
    jsonb_build_object('assigned_to', p_assignee_id)
  );
end;
$$;

revoke all on function claim_quote(uuid, timestamptz) from public, anon;
revoke all on function assign_quote(uuid, uuid, timestamptz) from public, anon;
grant execute on function claim_quote(uuid, timestamptz) to authenticated;
grant execute on function assign_quote(uuid, uuid, timestamptz) to authenticated;
