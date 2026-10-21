-- Delete a staff account, D158. Brightex only, never their own.
--
-- Soft. Nine foreign keys point at a user (quotes, orders, documents,
-- customers, the audit log, other users) and none of them cascade, so a
-- deleted account's row stays as the record every one of them names, per
-- rule 7, and the audit trigger records the transition as a delete. The
-- account leaves the Users list, loses every power and its sessions end
-- here; the action then retires the login through Supabase Auth so the
-- address is free for a new account, which the partial unique index below
-- allows on this side.

alter table users
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references users(id);

-- Uniqueness among live accounts only. A deleted row keeps its email for
-- the audit trail; a new account may take the address.
alter table users drop constraint if exists users_email_key;
create unique index if not exists users_email_live_key on users (email) where deleted_at is null;

-- The one way an account is deleted. Security definer, so the write does
-- not depend on which policy reaches the row: the function is the gate,
-- the same gate as every other Brightex only write.
create or replace function delete_user(p_user_id uuid, p_updated_at timestamptz) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row users%rowtype;
begin
  if not is_brightex_user() then
    raise exception 'Only Brightex deletes accounts'
      using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'Missing user'
      using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account'
      using errcode = 'P0001';
  end if;

  select * into v_row from users where id = p_user_id;
  if not found or v_row.deleted_at is not null then
    raise exception 'That account is gone'
      using errcode = 'P0001';
  end if;
  if p_updated_at is null or v_row.updated_at <> p_updated_at then
    raise exception 'This account changed while you were editing'
      using errcode = 'P0001';
  end if;

  -- The guard trigger still runs on this: the last active admin of a role
  -- cannot go.
  update users
     set deleted_at = now(),
         deleted_by = auth.uid(),
         is_active = false,
         is_public = false,
         can_manage_users = false,
         can_read_audit = false,
         can_write_blog = false,
         module_grants = '{}',
         updated_at = now()
   where id = p_user_id;

  delete from auth.refresh_tokens
   where session_id in (select id from auth.sessions where user_id = p_user_id);
  delete from auth.sessions where user_id = p_user_id;
end;
$$;

revoke all on function delete_user(uuid, timestamptz) from public, anon;
grant execute on function delete_user(uuid, timestamptz) to authenticated;

-- The guard trigger, as migration 70 left it, plus the deleted row rules.
-- Policies are OR'd, so the holder's update policy would otherwise reach a
-- deleted Beco row; the trigger holds the line, as it does for the self
-- rules (migration 69) and the module grants (migration 70).
create or replace function guard_users_staff() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_remaining int;
  v_added text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if not is_brightex_user() then
    -- A deleted row is Brightex's alone (D158): nobody else edits it, and
    -- nobody but Brightex moves deleted_at either way.
    if old.deleted_at is not null then
      raise exception 'That account is gone'
        using errcode = 'P0001';
    end if;
    if new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by then
      raise exception 'Only Brightex deletes accounts'
        using errcode = 'P0001';
    end if;
    if new.can_write_blog is distinct from old.can_write_blog
       or new.can_read_audit is distinct from old.can_read_audit
       or new.can_manage_users is distinct from old.can_manage_users then
      raise exception 'Only Brightex can assign those permissions'
        using errcode = 'P0001';
    end if;
  end if;

  -- Module grants: Brightex freely; a staff manager only what they hold
  -- themselves, never on their own row, never on a Brightex account.
  if new.module_grants is distinct from old.module_grants then
    if not is_brightex_user() then
      if not has_staff_manage() then
        raise exception 'Only Brightex can assign those permissions'
          using errcode = 'P0001';
      end if;
      if new.id = auth.uid() then
        raise exception 'You cannot change your own access'
          using errcode = 'P0001';
      end if;
      if old.role = 'brightex_admin' or new.role = 'brightex_admin' then
        raise exception 'Only Brightex manages a Brightex account'
          using errcode = 'P0001';
      end if;
      for v_added in
        select m from unnest(new.module_grants) as m
        where m <> all (old.module_grants)
      loop
        if not can_grant_module(v_added) then
          raise exception 'You can only grant access you hold yourself: %', v_added
            using errcode = 'P0001';
        end if;
      end loop;
    end if;
  end if;

  if has_staff_manage() and new.id = auth.uid() then
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

-- The self pin covers the two new columns.
drop policy if exists users_update_self_safe on users;
create policy users_update_self_safe on users for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role                 = (select role                 from users where id = auth.uid())
    and is_active            = (select is_active            from users where id = auth.uid())
    and must_change_password = (select must_change_password from users where id = auth.uid())
    and email                = (select email                from users where id = auth.uid())
    and last_login_at is not distinct from (select last_login_at from users where id = auth.uid())
    and can_write_blog       = (select can_write_blog       from users where id = auth.uid())
    and can_read_audit       = (select can_read_audit       from users where id = auth.uid())
    and can_manage_users     = (select can_manage_users     from users where id = auth.uid())
    and module_grants        = (select module_grants        from users where id = auth.uid())
    and deleted_at is not distinct from (select deleted_at from users where id = auth.uid())
    and deleted_by is not distinct from (select deleted_by from users where id = auth.uid())
  );
