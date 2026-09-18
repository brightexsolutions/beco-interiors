-- Settings seed for notification recipients, staff grants for blog write
-- and audit read, and the RLS those grants drive. Brightex admin has both
-- by role. Anyone else needs the matching flag, assigned by Brightex.

alter table users
  add column if not exists can_write_blog boolean not null default false,
  add column if not exists can_read_audit boolean not null default false;

insert into settings (key, value) values
  ('notification_recipients', '[]'::jsonb)
on conflict (key) do nothing;

create or replace function has_blog_write() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users u
    where u.id = auth.uid()
      and u.is_active
      and (u.role = 'brightex_admin' or u.can_write_blog)
  );
$$;

create or replace function has_audit_read() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users u
    where u.id = auth.uid()
      and u.is_active
      and (u.role = 'brightex_admin' or u.can_read_audit)
  );
$$;

drop policy if exists blog_write on blog_posts;
create policy blog_write on blog_posts for all
  using (has_blog_write())
  with check (has_blog_write());

drop policy if exists audit_read_admin on audit_log;
create policy audit_read on audit_log for select
  using (has_audit_read());

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
  );

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
       or new.can_read_audit is distinct from old.can_read_audit then
      raise exception 'Only Brightex can assign those permissions'
        using errcode = 'P0001';
    end if;
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

drop trigger if exists settings_audit on settings;
create trigger settings_audit after insert or update or delete on settings
  for each row execute function audit_trigger();
