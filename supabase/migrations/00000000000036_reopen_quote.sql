-- A lost quote is not a dead end. The client sometimes comes back.
-- Reopen is explicit: lost to reviewing, never a silent status flip,
-- and never from won (that quote already became the decision).

create or replace function reopen_quote(
  p_quote_id uuid,
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
  if not is_admin() and v_assigned is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_status = 'won' then
    raise exception 'A won quote cannot be reopened' using errcode = 'P0001';
  end if;
  if v_status is distinct from 'lost' then
    raise exception 'Only a lost quote can be reopened' using errcode = 'P0001';
  end if;

  update quotes
     set status = 'reviewing',
         lost_reason = null
   where id = p_quote_id;
end;
$$;

create or replace function set_quote_status(
  p_quote_id uuid,
  p_status quote_status,
  p_lost_reason text,
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
  v_current quote_status;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if current_user_role() is distinct from 'beco_sales' and not is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_status = 'new' then
    raise exception 'A quote cannot move back to new' using errcode = '22023';
  end if;
  if p_status = 'lost' and coalesce(btrim(p_lost_reason), '') = '' then
    raise exception 'Say why this quote was lost' using errcode = '22023';
  end if;

  select assigned_to, updated_at, deleted_at, status
    into v_assigned, v_updated, v_deleted, v_current
    from quotes
   where id = p_quote_id
     for update;

  if not found or v_deleted is not null then
    raise exception 'Quote not found' using errcode = 'P0002';
  end if;
  if v_updated is distinct from p_expected_updated_at then
    raise exception 'This quote changed while you were editing' using errcode = '40001';
  end if;
  if not is_admin() and v_assigned is distinct from v_uid then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_current = 'lost' then
    raise exception 'Reopen this quote instead of changing its status' using errcode = 'P0001';
  end if;
  if v_current = 'won' then
    raise exception 'A won quote is closed' using errcode = 'P0001';
  end if;

  update quotes
     set status = p_status,
         lost_reason = case
           when p_status = 'lost' then btrim(p_lost_reason)
           else null
         end
   where id = p_quote_id;
end;
$$;

revoke all on function reopen_quote(uuid, timestamptz) from public, anon;
grant execute on function reopen_quote(uuid, timestamptz) to authenticated;
