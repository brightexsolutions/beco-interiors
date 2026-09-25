-- Assign to is a Beco salesperson or a Beco admin. Brightex admin is
-- studio access, not a counter owner, so it cannot appear as an assignee
-- even if someone posts the id by hand.

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
       and role in ('beco_sales', 'beco_admin')
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

revoke all on function assign_quote(uuid, uuid, timestamptz) from public, anon;
grant execute on function assign_quote(uuid, uuid, timestamptz) to authenticated;
