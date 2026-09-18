-- Staff admin guards for /users. RLS already lets an allowlisted
-- brightex_admin write any row (users_write_brightex), which would otherwise
-- let them change their own role or deactivate the last admin. The UI hides
-- those controls; this trigger is the authority.

create or replace function guard_users_staff() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_remaining int;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if is_brightex_user() and new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own role'
        using errcode = 'P0001';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'You cannot deactivate your own account'
        using errcode = 'P0001';
    end if;
    if new.email is distinct from old.email then
      raise exception 'You cannot change your own email'
        using errcode = 'P0001';
    end if;
  end if;

  if old.role in ('beco_admin', 'brightex_admin')
     and old.is_active
     and (
       (not new.is_active)
       or (new.role is distinct from old.role)
     )
  then
    select count(*) into v_remaining
    from users u
    where u.role = old.role
      and u.is_active
      and u.id <> old.id;
    if v_remaining = 0 then
      raise exception 'Cannot deactivate or demote the last active admin of that role'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_staff on users;
create trigger users_guard_staff
  before update on users
  for each row execute function guard_users_staff();

-- End GoTrue sessions so a deactivated account is out on the next request
-- rather than waiting for the JWT to expire. The proxy still clears cookies
-- when role is null (D83); this closes the gap before that next request.
-- Do not bump users.updated_at from here: record_sign_in leaves that column
-- for real edits, and the staff lock token sits on it.
create or replace function end_user_sessions(p_user_id uuid) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_user_id is null then
    raise exception 'Missing user'
      using errcode = 'P0001';
  end if;
  if not is_brightex_user() then
    raise exception 'not allowed'
      using errcode = '42501';
  end if;

  delete from auth.refresh_tokens
   where session_id in (select id from auth.sessions where user_id = p_user_id);
  delete from auth.sessions where user_id = p_user_id;
end;
$$;

revoke all on function end_user_sessions(uuid) from public, anon;
grant execute on function end_user_sessions(uuid) to authenticated;
