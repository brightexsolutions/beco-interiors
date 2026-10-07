-- A second staff grant beside audit read, D135. Brightex can let a named Beco
-- person manage Beco staff accounts: add one, change its role, deactivate or
-- reactivate it, reissue its password, edit its /team profile. The holder
-- never reads or writes a Brightex account, never creates one, and never
-- assigns a grant. Those stay with an allowlisted Brightex admin (D42).

alter table users
  add column if not exists can_manage_users boolean not null default false;

-- Brightex by role and allowlist, or an active Beco account holding the grant.
create or replace function has_staff_manage() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_brightex_user() or exists (
    select 1 from users u
    where u.id = auth.uid()
      and u.is_active
      and u.can_manage_users
      and u.role <> 'brightex_admin'
  );
$$;

-- Anon must be able to call it: RLS evaluates every select policy on users,
-- including for the public /team read, and it answers false for anon.
grant execute on function has_staff_manage() to anon, authenticated;

-- The holder sees every account, so the Users list is whole and a Brightex
-- row reads as present but untouchable.
drop policy if exists users_read_staff_manager on users;
create policy users_read_staff_manager on users for select
  using (has_staff_manage());

-- A new Beco account only, carrying no grant.
drop policy if exists users_insert_staff_manager on users;
create policy users_insert_staff_manager on users for insert
  with check (
    has_staff_manage()
    and role <> 'brightex_admin'
    and not can_manage_users
    and not can_read_audit
    and not can_write_blog
  );

-- A Beco account stays a Beco account: USING filters Brightex rows out of
-- reach, WITH CHECK refuses a promotion into Brightex.
drop policy if exists users_update_staff_manager on users;
create policy users_update_staff_manager on users for update
  using (has_staff_manage() and role <> 'brightex_admin')
  with check (has_staff_manage() and role <> 'brightex_admin');

-- The self-update pin now covers the new grant too.
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
  );

-- Policies are OR'd, so the manager policy would let a holder edit their own
-- row past the self pin. The trigger's self check, Brightex only before, now
-- covers every holder. Anyone else is still stopped by the self pin, 42501.
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

  if not is_brightex_user() then
    if new.can_write_blog is distinct from old.can_write_blog
       or new.can_read_audit is distinct from old.can_read_audit
       or new.can_manage_users is distinct from old.can_manage_users then
      raise exception 'Only Brightex can assign those permissions'
        using errcode = 'P0001';
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

-- Deactivating or reissuing a password ends the account's sessions. A holder
-- may do that to a Beco account, never to a Brightex one.
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
  if not (
    is_brightex_user()
    or (
      has_staff_manage()
      and exists (select 1 from users u where u.id = p_user_id and u.role <> 'brightex_admin')
    )
  ) then
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
